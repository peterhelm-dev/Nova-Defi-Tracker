import { describe, expect, it } from "vitest";
import { healthAlertMail } from "@/lib/healthAlerts/messages";
import { parseAlertAddress, parseAlertEmail, parseAlertThreshold } from "@/lib/healthAlerts/validate";
import { evaluateHealthAlerts } from "./evaluate";
import { confirmSubscription, requestSubscription, unsubscribeSubscription } from "./subscribe";
import { createMemoryHealthAlertStore, type HealthSubscription } from "./store";

const wallet = "0x0000000000000000000000000000000000000001";
const now = 1_700_000_000_000;

function active(partial: Partial<HealthSubscription> = {}): HealthSubscription {
  return {
    id: "sub-1",
    email: "person@example.com",
    address: wallet,
    threshold: 1.5,
    status: "active",
    confirmHash: null,
    unsubToken: "unsubscribe-token-with-enough-length",
    createdAt: now,
    confirmedAt: now,
    lastAlertAt: null,
    lastConfirmSentAt: now,
    lockUntil: null,
    ...partial,
  };
}

describe("health alert validation", () => {
  it("accepts a normal email, checksums the wallet, and defaults the threshold", () => {
    expect(parseAlertEmail(" Person@Example.com ")).toBe("person@example.com");
    expect(parseAlertEmail("not-an-email")).toBeNull();
    expect(parseAlertAddress(wallet)).toBe("0x0000000000000000000000000000000000000001");
    expect(parseAlertAddress("0x1234")).toBeNull();
    expect(parseAlertThreshold(undefined)).toBe(1.5);
    expect(parseAlertThreshold(1)).toBeNull();
    expect(parseAlertThreshold(1.5)).toBe(1.5);
    expect(parseAlertThreshold(10.01)).toBeNull();
  });
});

describe("health alert opt-in", () => {
  it("stays pending until the confirmation link is opened, then unsubscribes by deleting the row", async () => {
    const store = createMemoryHealthAlertStore();
    const sent: string[] = [];
    const result = await requestSubscription(
      { email: "person@example.com", address: wallet, threshold: 1.5 },
      {
        now,
        store,
        send: async (mail) => {
          sent.push(mail.text);
          return true;
        },
      },
    );
    expect(result).toEqual({ ok: true, alreadyConfirmed: false });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("Unsubscribe:");
    expect(sent[0]?.toLowerCase()).not.toContain("add collateral");
    expect(await store.listActive()).toHaveLength(0);

    const confirm = sent[0]?.match(/Confirm: (\S+)/)?.[1] ?? "";
    const token = new URL(confirm).searchParams.get("token") ?? "";
    expect(await confirmSubscription(token, { now, store })).toBe("confirmed");
    expect(await confirmSubscription(token, { now, store })).toBe("invalid");
    expect(await store.listActive()).toHaveLength(1);

    const unsub = sent[0]?.match(/Unsubscribe: (\S+)/)?.[1] ?? "";
    const unsubToken = new URL(unsub).searchParams.get("token") ?? "";
    expect(await unsubscribeSubscription(unsubToken, store)).toBe("unsubscribed");
    expect(await store.listActive()).toHaveLength(0);
    expect(await unsubscribeSubscription(unsubToken, store)).toBe("invalid");
  });

  it("does not send a second confirmation inside the hour", async () => {
    const store = createMemoryHealthAlertStore();
    let sends = 0;
    const send = async () => {
      sends += 1;
      return true;
    };
    await requestSubscription({ email: "person@example.com", address: wallet, threshold: 1.5 }, { now, store, send });
    await requestSubscription({ email: "person@example.com", address: wallet, threshold: 1.4 }, { now: now + 60_000, store, send });
    expect(sends).toBe(1);
    const pending = await store.getByPair("person@example.com", wallet);
    expect(pending?.threshold).toBe(1.4);
    expect(pending?.status).toBe("pending");
  });

  it("drops the row when the confirmation email fails", async () => {
    const store = createMemoryHealthAlertStore();
    const result = await requestSubscription(
      { email: "person@example.com", address: wallet, threshold: 1.5 },
      { now, store, send: async () => false },
    );
    expect(result.ok).toBe(false);
    expect(await store.getByPair("person@example.com", wallet)).toBeNull();
  });
});

describe("health alert cron", () => {
  it("sends once while the factor stays below the threshold, and not when it is equal", async () => {
    const store = createMemoryHealthAlertStore();
    await store.insert(active());
    const sent: string[] = [];
    const send = async (mail: { text: string }) => {
      sent.push(mail.text);
      return true;
    };
    const readHealth = async () => [{ protocol: "Aave", chain: "base", market: null, healthFactor: 1.324 }];

    const first = await evaluateHealthAlerts({ now, store, readHealth, send, cooldownMs: 1_000 });
    expect(first.sent).toBe(1);
    expect(sent[0]).toContain("Your Aave health factor on Base is 1.32, below your 1.5 alert.");
    expect(sent[0]).toContain("Unsubscribe:");
    expect(sent[0]?.toLowerCase()).not.toContain("add collateral");

    const second = await evaluateHealthAlerts({ now: now + 10, store, readHealth, send, cooldownMs: 1_000 });
    expect(second.sent).toBe(0);
    expect(sent).toHaveLength(1);

    const later = await evaluateHealthAlerts({ now: now + 2_000, store, readHealth, send, cooldownMs: 1_000 });
    expect(later.sent).toBe(1);
  });

  it("does not email when health is exactly the threshold or the send fails", async () => {
    const store = createMemoryHealthAlertStore();
    await store.insert(active({ id: "exact" }));
    const exact = await evaluateHealthAlerts({
      now,
      store,
      readHealth: async () => [{ protocol: "Aave", chain: "base", market: null, healthFactor: 1.5 }],
      send: async () => true,
      cooldownMs: 1_000,
    });
    expect(exact.sent).toBe(0);
    const row = await store.getByPair("person@example.com", wallet);
    expect(row?.lastAlertAt).toBeNull();

    const failed = await evaluateHealthAlerts({
      now: now + 5,
      store,
      readHealth: async () => [{ protocol: "Compound", chain: "ethereum", market: "USDC", healthFactor: 1.1 }],
      send: async () => false,
      cooldownMs: 1_000,
    });
    expect(failed.failed).toBe(1);
    expect((await store.getByPair("person@example.com", wallet))?.lastAlertAt).toBeNull();

    const retried = await evaluateHealthAlerts({
      now: now + 10,
      store,
      readHealth: async () => [{ protocol: "Compound", chain: "ethereum", market: "USDC", healthFactor: 1.1 }],
      send: async () => true,
      cooldownMs: 1_000,
    });
    expect(retried.sent).toBe(1);
  });

  it("ignores a subscription that was never confirmed", async () => {
    const store = createMemoryHealthAlertStore();
    await store.insert(active({ status: "pending", confirmHash: "abc" }));
    const result = await evaluateHealthAlerts({
      now,
      store,
      readHealth: async () => [{ protocol: "Aave", chain: "base", market: null, healthFactor: 1 }],
      send: async () => true,
    });
    expect(result.sent).toBe(0);
    expect(result.checked).toBe(0);
  });
});

describe("health alert mail", () => {
  it("lists each loan and keeps an unsubscribe link", () => {
    const mail = healthAlertMail({
      hits: [
        { protocol: "Aave", market: null, chain: "base", healthFactor: 1.32 },
        { protocol: "Compound", market: "USDC", chain: "ethereum", healthFactor: 1.1 },
      ],
      threshold: 1.5,
      unsubToken: "unsubscribe-token-with-enough-length",
    });
    expect(mail.text).toContain("Your Aave health factor on Base is 1.32, below your 1.5 alert.");
    expect(mail.text).toContain("Your Compound USDC health factor on Ethereum is 1.10, below your 1.5 alert.");
    expect(mail.html).toContain("Unsubscribe");
    expect(mail.html).not.toContain("<script");
  });
});
