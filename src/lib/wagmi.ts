import { createConfig, http, type CreateConnectorFn } from "wagmi";
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
} from "wagmi/chains";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import { PRODUCT_NAME, canonicalSiteUrl } from "@/lib/brand";

const cdpApiKey = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY;
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors: CreateConnectorFn[] = [
  coinbaseWallet({
    appName: PRODUCT_NAME,
    preference: "all",
  }),
  metaMask(),
  injected({ target: "rabby" }),
];

if (walletConnectProjectId) {
  connectors.push(
    walletConnect({
      projectId: walletConnectProjectId,
      showQrModal: true,
      metadata: {
        name: PRODUCT_NAME,
        description: "Track all your crypto wallets in one place",
        url: canonicalSiteUrl(),
        icons: [],
      },
    }),
  );
}

export const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, optimism, polygon, bsc, avalanche],
  connectors,
  transports: {
    [mainnet.id]: http("https://ethereum.publicnode.com"),
    [base.id]: cdpApiKey
      ? http(`https://api.developer.coinbase.com/rpc/v1/base/${cdpApiKey}`)
      : http("https://base.publicnode.com"),
    [arbitrum.id]: http("https://arbitrum-one.publicnode.com"),
    [optimism.id]: http("https://optimism.publicnode.com"),
    [polygon.id]: http("https://polygon-bor.publicnode.com"),
    [bsc.id]: http("https://bsc.publicnode.com"),
    [avalanche.id]: http("https://avalanche-c-chain.publicnode.com"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
