/**
 * Authorizes scheduled-job requests. Cron routes are unauthenticated by
 * nature, so they're gated on a shared secret: Vercel Cron sends it as a
 * Bearer token; a query param is accepted for manual triggering. If no secret
 * is configured we refuse rather than run open.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get("secret") === secret;
}
