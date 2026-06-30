import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

const cdpApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: "Base Wealth Tracker",
      preference: "all",
    }),
  ],
  transports: {
    [base.id]: cdpApiKey
      ? http(`https://api.developer.coinbase.com/rpc/v1/base/${cdpApiKey}`)
      : http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
