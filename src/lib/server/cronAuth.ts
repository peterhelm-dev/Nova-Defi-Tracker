/**
 * Authorizes scheduled-job requests. Cron routes are unauthenticated by
 * nature, so they're gated on a shared secret. Vercel Cron sends
 * `Authorization: Bearer <CRON_SECRET>`. A query parameter is not accepted,
 * so the secret never lands in an access log URL. If no secret is configured
 * we refuse rather than run open.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
