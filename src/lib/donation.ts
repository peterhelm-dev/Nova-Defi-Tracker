import { isAddress } from "viem";

/** Base mainnet chain id, used for the EIP-681 wallet deep link. */
const BASE_CHAIN_ID = 8453;

export type DonationConfig = {
  /** Wallet that receives tips, or null when unset/invalid. */
  address: `0x${string}` | null;
  /** Optional Buy Me a Coffee page (https URL), or null. */
  coffeeUrl: string | null;
};

/**
 * Reads the optional donation settings. Both are public by design — they're
 * rendered on the /donate page — so they live in NEXT_PUBLIC_* vars.
 */
export function getDonationConfig(
  env: Record<string, string | undefined> = {
    NEXT_PUBLIC_DONATION_ADDRESS: process.env.NEXT_PUBLIC_DONATION_ADDRESS,
    NEXT_PUBLIC_BUYMEACOFFEE_URL: process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL,
  },
): DonationConfig {
  const rawAddress = env.NEXT_PUBLIC_DONATION_ADDRESS?.trim();
  const address =
    rawAddress && isAddress(rawAddress) ? (rawAddress as `0x${string}`) : null;

  const rawCoffee = env.NEXT_PUBLIC_BUYMEACOFFEE_URL?.trim();
  let coffeeUrl: string | null = null;
  if (rawCoffee) {
    try {
      const url = new URL(rawCoffee);
      if (url.protocol === "https:") coffeeUrl = url.toString();
    } catch {
      // Ignore malformed URLs rather than rendering a broken link.
    }
  }

  return { address, coffeeUrl };
}

export function isDonationEnabled(config: DonationConfig = getDonationConfig()) {
  return config.address !== null || config.coffeeUrl !== null;
}

/** EIP-681 link that opens a wallet's send screen pointed at Base. */
export function donationPaymentUri(address: string) {
  return `ethereum:${address}@${BASE_CHAIN_ID}`;
}
