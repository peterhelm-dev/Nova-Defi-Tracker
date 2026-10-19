"use client";

import { ConnectWallet, Wallet } from "@coinbase/onchainkit/wallet";
import { NoriCoachCard } from "./nova/NoriCoachCard";

/** Shown until the visitor connects a wallet or adds a watch-only address. */
export function EmptyWalletState() {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border-subtle bg-surface px-6 py-10 text-center">
      <NoriCoachCard
        state="neutral"
        title="Track all your crypto wallets in one place"
        message="Connect Coinbase, MetaMask, or Rabby — or paste an address above. Novafolio is read-only and non-custodial. Nothing here is financial advice."
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
