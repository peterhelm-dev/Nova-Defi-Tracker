import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/**
 * Server-side Base client used to verify Sign-In With Ethereum signatures.
 * A public client (not just `verifyMessage`) is required so smart-contract
 * wallets — like the Coinbase Smart Wallet this app targets — verify via
 * ERC-1271 / ERC-6492 rather than plain EOA `ecrecover`.
 */
function createBaseClient() {
  const cdpApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
  return createPublicClient({
    chain: base,
    transport: cdpApiKey
      ? http(`https://api.developer.coinbase.com/rpc/v1/base/${cdpApiKey}`)
      : http(),
  });
}

let client: ReturnType<typeof createBaseClient> | undefined;

export function getPublicClient() {
  if (!client) client = createBaseClient();
  return client;
}
