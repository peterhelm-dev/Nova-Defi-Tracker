"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { PRODUCT_NAME } from "@/lib/brand";
import { wagmiConfig } from "@/lib/wagmi";
import { SoundProvider } from "@/components/SoundProvider";
import { ThemeSync } from "@/components/ThemeSync";
import { PreferencesProvider } from "@/hooks/usePreferences";
import { CurrencyProvider } from "@/lib/currency";
import { PrivacyProvider } from "@/lib/privacy";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            analytics: false,
            appearance: {
              name: PRODUCT_NAME,
              mode: "dark",
              theme: "default",
            },
            wallet: {
              display: "modal",
              termsUrl: "/terms",
              privacyUrl: "/privacy",
              supportedWallets: { rabby: true, trust: false, frame: false },
            },
          }}
        >
          <PrivacyProvider>
            <SoundProvider>
              <PreferencesProvider>
                <ThemeSync />
                <CurrencyProvider>{children}</CurrencyProvider>
              </PreferencesProvider>
            </SoundProvider>
          </PrivacyProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
