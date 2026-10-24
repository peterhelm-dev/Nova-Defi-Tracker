import { randomUUID } from "node:crypto";
import { confirmationMail, type AlertMail } from "@/lib/healthAlerts/messages";
import { randomToken, tokenHash, type HealthAlertStore, type HealthSubscription } from "./store";

const CONFIRM_RESEND_MS = 60 * 60 * 1000;

export type MailSender = (input: { to: string; subject: string; text: string; html: string }) => Promise<boolean>;

export type SubscribeResult =
  | { ok: true; alreadyConfirmed: boolean }
  | { ok: false; status: number; error: string };

function pendingRecord(input: {
  email: string;
  address: string;
  threshold: number;
  now: number;
  confirmToken: string;
  unsubToken: string;
}): HealthSubscription {
  return {
    id: randomUUID(),
    email: input.email,
    address: input.address,
    threshold: input.threshold,
    status: "pending",
    confirmHash: tokenHash(input.confirmToken),
    unsubToken: input.unsubToken,
    createdAt: input.now,
    confirmedAt: null,
    lastAlertAt: null,
    lastConfirmSentAt: input.now,
    lockUntil: null,
  };
}

async function sendConfirmation(
  send: MailSender,
  input: { email: string; address: string; threshold: number; confirmToken: string; unsubToken: string },
): Promise<boolean> {
  const mail: AlertMail = confirmationMail(input);
  return send({ to: input.email, ...mail });
}

/**
 * Creates or refreshes a pending opt-in. An address that is already confirmed
 * only stores a new threshold. A second request inside an hour does not send
 * another confirmation.
 */
export async function requestSubscription(
  input: { email: string; address: string; threshold: number },
  deps: { now: number; store: HealthAlertStore; send: MailSender },
): Promise<SubscribeResult> {
  const existing = await deps.store.getByPair(input.email, input.address);
  if (existing?.status === "active") {
    if (existing.threshold !== input.threshold) {
      await deps.store.update({ ...existing, threshold: input.threshold });
    }
    return { ok: true, alreadyConfirmed: true };
  }

  if (existing?.status === "pending") {
    const cooled = existing.lastConfirmSentAt !== null && deps.now - existing.lastConfirmSentAt < CONFIRM_RESEND_MS;
    if (cooled) {
      if (existing.threshold !== input.threshold) {
        await deps.store.update({ ...existing, threshold: input.threshold });
      }
      return { ok: true, alreadyConfirmed: false };
    }
    const confirmToken = randomToken();
    await deps.store.update({
      ...existing,
      threshold: input.threshold,
      confirmHash: tokenHash(confirmToken),
      lastConfirmSentAt: deps.now,
    });
    const sent = await sendConfirmation(deps.send, {
      ...input,
      confirmToken,
      unsubToken: existing.unsubToken,
    });
    if (!sent) {
      return { ok: false, status: 502, error: "The confirmation email didn't send. Try again in a few minutes." };
    }
    return { ok: true, alreadyConfirmed: false };
  }

  const confirmToken = randomToken();
  const unsubToken = randomToken();
  const record = pendingRecord({ ...input, now: deps.now, confirmToken, unsubToken });
  const inserted = await deps.store.insert(record);
  if (!inserted) return { ok: true, alreadyConfirmed: false };
  const sent = await sendConfirmation(deps.send, { ...input, confirmToken, unsubToken });
  if (!sent) {
    await deps.store.remove(record.id);
    return { ok: false, status: 502, error: "The confirmation email didn't send. Try again in a few minutes." };
  }
  return { ok: true, alreadyConfirmed: false };
}

export async function confirmHealthAlertLink(
  token: string,
  store: HealthAlertStore,
): Promise<"confirmed" | "invalid"> {
  return confirmSubscription(token, { now: Date.now(), store });
}

export async function confirmSubscription(
  token: string,
  deps: { now: number; store: HealthAlertStore },
): Promise<"confirmed" | "invalid"> {
  if (token.length < 20 || token.length > 200) return "invalid";
  const record = await deps.store.getByConfirmHash(tokenHash(token));
  if (!record || record.status !== "pending" || !record.confirmHash) return "invalid";
  await deps.store.update({
    ...record,
    status: "active",
    confirmHash: null,
    confirmedAt: deps.now,
  });
  return "confirmed";
}

export async function unsubscribeSubscription(
  token: string,
  store: HealthAlertStore,
): Promise<"unsubscribed" | "invalid"> {
  if (token.length < 20 || token.length > 200) return "invalid";
  const record = await store.getByUnsubToken(token);
  if (!record) return "invalid";
  await store.remove(record.id);
  return "unsubscribed";
}
