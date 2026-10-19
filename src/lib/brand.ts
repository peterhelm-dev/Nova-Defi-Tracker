/**
 * Product name and the public site URL used in metadata.
 * The repo can keep its existing package name; the product is Novafolio.
 */

export const PRODUCT_NAME = "Novafolio";
export const PRODUCT_TAGLINE = "track all your crypto wallets in one place";
export const PRODUCT_TITLE = `${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`;
export const PRODUCTION_SITE_URL = "https://novafolio.app";

export const PRODUCT_DESCRIPTION =
  "Novafolio is a read-only tracker for wallets you connect or watch. See tokens across Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and Avalanche. Not financial advice.";

function parseUrl(value: string | undefined): URL | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

/**
 * Absolute origin for Open Graph image URLs.
 * Uses NEXT_PUBLIC_SITE_URL when set, then the current Vercel host so preview
 * deploys still resolve their own images, then the production domain.
 */
export function metadataBaseUrl(): URL {
  const configured = parseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const vercelHost = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//, "");
  const vercel = vercelHost ? parseUrl(`https://${vercelHost}`) : null;
  if (vercel) return vercel;

  if (process.env.NODE_ENV === "production") return new URL(PRODUCTION_SITE_URL);
  return new URL("http://localhost:3000");
}

/** Canonical production origin. Preview hosts must not become the public URL. */
export function canonicalSiteUrl(): string {
  const configured = parseUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return configured?.origin ?? PRODUCTION_SITE_URL;
}
