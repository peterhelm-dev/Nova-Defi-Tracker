import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./session";

/**
 * Reads and verifies the session cookie on the current request, returning the
 * authenticated lower-cased address or null. Used by data route handlers to
 * scope reads/writes to the signed-in user.
 */
export async function getSessionAddress(): Promise<string | null> {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  return session?.address ?? null;
}
