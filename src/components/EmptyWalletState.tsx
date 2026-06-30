"use client";

import { ConnectWallet, Wallet } from "@coinbase/onchainkit/wallet";

export function EmptyWalletState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-surface px-6 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl">
        🔵
      </span>
      <h2 className="text-xl font-semibold text-white">
        Connect a wallet to see your Base net worth
      </h2>
      <p className="max-w-md text-sm text-white/60">
        We&apos;ll read your ETH and token balances directly from Base
        mainnet, price them live, and chart your net worth over time.
      </p>
      <Wallet>
        <ConnectWallet className="bg-accent hover:bg-accent/90" />
      </Wallet>
    </div>
  );
}
