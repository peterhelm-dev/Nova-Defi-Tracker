"use client";

import { ConnectWallet, Wallet } from "@coinbase/onchainkit/wallet";
import { NoriCoachCard } from "./nova/NoriCoachCard";

/** "Disconnected wallet" state, per DESIGN_SPEC.md required application states. */
export function EmptyWalletState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-surface px-6 py-16 text-center">
      <NoriCoachCard
        state="neutral"
        title="Connect a wallet to see your net worth"
        message="We'll detect your token balances and DeFi positions across every chain your wallet touches, price them live, and chart your net worth over time."
        size="hero"
        layout="center"
        className="max-w-md border-none bg-transparent p-0"
      />
      <Wallet>
        <ConnectWallet className="bg-accent hover:bg-accent/90" />
      </Wallet>
    </div>
  );
}
