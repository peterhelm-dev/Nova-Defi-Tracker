import { healthAlertMail, type HealthHit } from "@/lib/healthAlerts/messages";
import type { HealthAlertStore } from "./store";
import type { MailSender } from "./subscribe";

/** While a loan stays under the threshold, send at most one email per 6 days. */
export const HEALTH_ALERT_COOLDOWN_MS = 6 * 24 * 60 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

export type ProtocolHealth = {
  protocol: string;
  chain: string;
  market: string | null;
  healthFactor: number;
};

export type HealthAlertRun = {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
};

export async function evaluateHealthAlerts(deps: {
  now: number;
  store: HealthAlertStore;
  readHealth: (address: string) => Promise<ProtocolHealth[]>;
  send: MailSender;
  cooldownMs?: number;
}): Promise<HealthAlertRun> {
  const cooldownMs = deps.cooldownMs ?? HEALTH_ALERT_COOLDOWN_MS;
  const result: HealthAlertRun = { checked: 0, sent: 0, skipped: 0, failed: 0 };
  const subscriptions = await deps.store.listActive();
  for (const subscription of subscriptions) {
    const claim = await deps.store.claim(subscription.id, deps.now, cooldownMs, LOCK_MS);
    if (!claim) {
      result.skipped += 1;
      continue;
    }
    result.checked += 1;
    try {
      const readings = await deps.readHealth(subscription.address);
      const hits: HealthHit[] = readings
        .filter((reading) => Number.isFinite(reading.healthFactor) && reading.healthFactor < subscription.threshold)
        .map((reading) => ({
          protocol: reading.protocol,
          market: reading.market,
          chain: reading.chain,
          healthFactor: reading.healthFactor,
        }));
      if (hits.length === 0) {
        await deps.store.release(subscription.id, claim.lockUntil);
        result.skipped += 1;
        continue;
      }
      const mail = healthAlertMail({ hits, threshold: subscription.threshold, unsubToken: subscription.unsubToken });
      const sent = await deps.send({ to: subscription.email, ...mail });
      if (!sent) {
        await deps.store.release(subscription.id, claim.lockUntil);
        result.failed += 1;
        continue;
      }
      await deps.store.commitAlert(subscription.id, deps.now, claim.lockUntil);
      result.sent += 1;
    } catch (error) {
      console.error("Health alert check failed", error instanceof Error ? error.message : "unknown");
      await deps.store.release(subscription.id, claim.lockUntil);
      result.failed += 1;
    }
  }
  return result;
}
