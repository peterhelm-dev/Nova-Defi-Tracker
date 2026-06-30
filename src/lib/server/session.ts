import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless, signed session cookies.
 *
 * Phase 1 keeps sessions stateless: a session is a base64url JSON payload
 * (the authenticated wallet address + expiry) plus an HMAC-SHA256 signature
 * over that payload, keyed by SESSION_SECRET. No server-side session table is
 * needed to verify a request — the signature proves the cookie was issued by
 * us and hasn't been tampered with. Swap to DB-backed sessions later if you
 * need revocation.
 */

export const SESSION_COOKIE = "bwt_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  /** Lower-cased wallet address. */
  address: string;
  /** Unix seconds at which the session expires. */
  exp: number;
};

const DEV_FALLBACK_SECRET = "dev-insecure-session-secret-change-me";

function secret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
  return DEV_FALLBACK_SECRET;
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Serialize and sign a session payload into a cookie value. */
export function createSessionToken(
  address: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): string {
  const payload: SessionPayload = {
    address: address.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const body = b64urlEncode(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/**
 * Verify a cookie value. Returns the payload when the signature is valid and
 * the session has not expired, otherwise null.
 */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(body);

  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(body)) as SessionPayload;
    if (typeof payload.address !== "string" || typeof payload.exp !== "number") {
      return null;
    }
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
