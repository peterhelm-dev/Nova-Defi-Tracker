import { getAddress, isAddress } from "viem";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DEFAULT_HEALTH_THRESHOLD = 1.5;
export const MIN_HEALTH_THRESHOLD = 1.01;
export const MAX_HEALTH_THRESHOLD = 10;

export function parseAlertEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !EMAIL.test(email)) return null;
  return email;
}

export function parseAlertAddress(value: unknown): string | null {
  if (typeof value !== "string" || !isAddress(value)) return null;
  return getAddress(value);
}

/** Absent means the default. Anything else must be a finite number inside the range. */
export function parseAlertThreshold(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return DEFAULT_HEALTH_THRESHOLD;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed * 100) / 100;
  if (rounded < MIN_HEALTH_THRESHOLD || rounded > MAX_HEALTH_THRESHOLD) return null;
  return rounded;
}
