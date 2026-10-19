import { NextResponse } from "next/server";

/**
 * Where server writes are allowed to go.
 *
 * The JSON file store under ./.data is fine for local dev and for one
 * long-running Node server. Vercel runs this app as serverless functions:
 * each instance has its own ephemeral disk, so a write to ./.data (or to
 * memory after that write fails) does not survive the next request. Reporting
 * success in that case would drop waitlist emails and "synced" portfolios
 * without telling anyone.
 *
 * On Vercel, Postgres (`DATABASE_URL`) is required for the waitlist and for
 * sign-in sync. When it is absent those features stay off. Guest mode
 * (localStorage) is unaffected.
 */
export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

export function isDurableStoreAvailable(): boolean {
  if (process.env.DATABASE_URL) return true;
  return !isVercelRuntime();
}

/** Production refuses to sign session cookies with the dev fallback secret. */
export function hasSessionSecret(): boolean {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length > 0) {
    return true;
  }
  return process.env.NODE_ENV !== "production";
}

/**
 * Sign-in sync is offered only when a session cookie can be signed and the
 * data will still be there on the next request.
 */
export function isAccountSyncAvailable(): boolean {
  return isDurableStoreAvailable() && hasSessionSecret();
}

export const STORE_UNAVAILABLE_MESSAGE =
  "Cloud sync and the waitlist are off on this deployment because there is no database to store them. Novafolio keeps your portfolio in this browser instead of accepting data it would lose. Set DATABASE_URL to turn them on.";

export const SESSION_SECRET_MESSAGE =
  "Sign-in is off until SESSION_SECRET is set, so Novafolio will not issue a session cookie it cannot sign.";

export function accountSyncBlockReason(): string | null {
  if (!isDurableStoreAvailable()) return STORE_UNAVAILABLE_MESSAGE;
  if (!hasSessionSecret()) return SESSION_SECRET_MESSAGE;
  return null;
}

export function storeUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: STORE_UNAVAILABLE_MESSAGE, code: "store_unavailable" },
    { status: 503 },
  );
}

/** Return a 503 response when the deployment cannot keep server data, else null. */
export function requireDurableStore(): NextResponse | null {
  if (isDurableStoreAvailable()) return null;
  return storeUnavailableResponse();
}
