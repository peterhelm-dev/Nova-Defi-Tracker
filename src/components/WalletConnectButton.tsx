"use client";

import { useAccount, useConnect } from "wagmi";

/**
 * WalletConnect is only offered when a free Reown project id is configured.
 * Coinbase, MetaMask, and Rabby come from the OnchainKit connect dialog and
 * do not need this key.
 */
export function WalletConnectButton({ className = "" }: { className?: string }) {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const connector = connectors.find((item) => item.id === "walletConnect");
  if (!connector || isConnected) return null;

  return (
    <button
      type="button"
      onClick={() => connect({ connector })}
      disabled={isPending}
      className={`rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-foreground hover:border-border-strong disabled:opacity-60 ${className}`}
    >
      {isPending ? "Opening…" : "WalletConnect"}
    </button>
  );
}
