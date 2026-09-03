import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

const cdpApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;

export const wagmiConfig = createConfig({
  chains: [base, mainnet],
  connectors: [
    coinbaseWallet({
      appName: "NOVA",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: cdpApiKey
      ? http(`https://api.developer.coinbase.com/rpc/v1/base/${cdpApiKey}`)
      : http(),
    // Ethereum mainnet is needed only for ENS name resolution (e.g. .base.eth
    // names). Cloudflare's public endpoint is reliable for this read-only use.
    [mainnet.id]: http("https://cloudflare-eth.com"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
