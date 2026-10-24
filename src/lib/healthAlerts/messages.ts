import { canonicalSiteUrl } from "@/lib/brand";
import { ESTIMATE_NOTE } from "@/lib/disclaimers";
import { formatThreshold, healthAlertSentence, HEALTH_FACTOR_GLOSS } from "@/lib/defi/loanCopy";
import { shortenAddress } from "@/lib/format";

export type HealthHit = {
  protocol: string;
  market: string | null;
  chain: string;
  healthFactor: number;
};

const COOLDOWN_SENTENCE =
  "The check runs once a day. While a loan stays under your alert, Novafolio sends at most one email every 6 days.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pageUrl(path: string, token: string): string {
  const url = new URL(path, canonicalSiteUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export function confirmUrl(token: string): string {
  return pageUrl("/alerts/confirm", token);
}

export function unsubscribeUrl(token: string): string {
  return pageUrl("/alerts/unsubscribe", token);
}

export type AlertMail = { subject: string; text: string; html: string };

export function confirmationMail(input: {
  email: string;
  address: string;
  threshold: number;
  confirmToken: string;
  unsubToken: string;
}): AlertMail {
  const confirm = confirmUrl(input.confirmToken);
  const unsubscribe = unsubscribeUrl(input.unsubToken);
  const threshold = formatThreshold(input.threshold);
  const wallet = shortenAddress(input.address);
  const subject = "Confirm Novafolio health factor alerts";
  const text = [
    `Confirm that ${input.email} should receive a message when an Aave or Compound health factor for ${input.address} drops below ${threshold}.`,
    "",
    HEALTH_FACTOR_GLOSS,
    "This is information, not a recommendation.",
    ESTIMATE_NOTE,
    COOLDOWN_SENTENCE,
    "",
    `Confirm: ${confirm}`,
    "",
    "If you did not ask for this, ignore this email.",
    `Unsubscribe: ${unsubscribe}`,
  ].join("\n");
  const html = [
    `<p>Confirm that ${escapeHtml(input.email)} should receive a message when an Aave or Compound health factor for ${escapeHtml(wallet)} drops below ${escapeHtml(threshold)}.</p>`,
    `<p>${escapeHtml(HEALTH_FACTOR_GLOSS)} This is information, not a recommendation. ${escapeHtml(ESTIMATE_NOTE)}</p>`,
    `<p>${escapeHtml(COOLDOWN_SENTENCE)}</p>`,
    `<p><a href="${escapeHtml(confirm)}">Confirm this alert</a></p>`,
    `<p>If you did not ask for this, ignore this email. <a href="${escapeHtml(unsubscribe)}">Unsubscribe</a></p>`,
  ].join("");
  return { subject, text, html };
}

export function healthAlertMail(input: {
  hits: HealthHit[];
  threshold: number;
  unsubToken: string;
}): AlertMail {
  const lines = input.hits.map((hit) => healthAlertSentence({ ...hit, threshold: input.threshold }));
  const unsubscribe = unsubscribeUrl(input.unsubToken);
  const subject = lines.length === 1
    ? lines[0]!.replace(/\.$/, "")
    : "A health factor is below your alert";
  const text = [
    ...lines,
    "",
    HEALTH_FACTOR_GLOSS,
    "This is information, not a recommendation.",
    ESTIMATE_NOTE,
    COOLDOWN_SENTENCE,
    "",
    `Unsubscribe: ${unsubscribe}`,
  ].join("\n");
  const html = [
    ...lines.map((line) => `<p>${escapeHtml(line)}</p>`),
    `<p>${escapeHtml(HEALTH_FACTOR_GLOSS)} This is information, not a recommendation. ${escapeHtml(ESTIMATE_NOTE)}</p>`,
    `<p>${escapeHtml(COOLDOWN_SENTENCE)}</p>`,
    `<p><a href="${escapeHtml(unsubscribe)}">Unsubscribe</a></p>`,
  ].join("");
  return { subject, text, html };
}
