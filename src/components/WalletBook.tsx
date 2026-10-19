"use client";

import { useState } from "react";
import { shortenAddress } from "@/lib/format";
import { MAX_WALLETS, type SavedWallet } from "@/hooks/useWalletBook";

export function WalletBook({
  connectedAddress,
  wallets,
  saved,
  onAdd,
  onRemove,
  onKeep,
}: {
  connectedAddress?: string;
  wallets: SavedWallet[];
  saved: SavedWallet[];
  onAdd: (input: string) => Promise<void>;
  onRemove: (address: string) => void;
  onKeep: () => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const connected = connectedAddress?.toLowerCase();
  const connectedIsSaved = !!connected && saved.some((wallet) => wallet.address === connected);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onAdd(input);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that wallet");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Wallets</h2>
          <p className="mt-1 text-xs text-text-muted">
            Connect a wallet, or paste an address or ENS name to watch it. Novafolio
            never asks you to sign a transaction.
          </p>
        </div>
        <p className="text-xs text-text-muted">
          {wallets.length}/{MAX_WALLETS}
        </p>
      </div>

      {wallets.length > 0 ? (
        <ul className="mt-4 flex flex-col gap-2">
          {wallets.map((wallet) => {
            const isLiveConnection = wallet.address === connected && !connectedIsSaved;
            return (
              <li
                key={wallet.address}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {wallet.label === "Connected" || wallet.label === "Watch-only"
                      ? shortenAddress(wallet.address, 6)
                      : wallet.label}
                  </p>
                  <p className="text-xs text-text-muted">
                    {wallet.source === "connected" ? "Connected" : "Watch-only"}
                    {wallet.label.includes(".") ? ` · ${shortenAddress(wallet.address, 4)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isLiveConnection ? (
                    <button
                      type="button"
                      onClick={onKeep}
                      className="text-xs text-accent hover:underline"
                    >
                      Keep
                    </button>
                  ) : null}
                  {wallet.source !== "connected" || connectedIsSaved ? (
                    <button
                      type="button"
                      onClick={() => onRemove(wallet.address)}
                      className="text-xs text-text-muted hover:text-negative"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="0x… or name.eth"
          aria-label="Wallet address or ENS"
          className="min-w-0 flex-1 rounded-lg border border-border-subtle bg-background px-3 py-2 text-sm text-foreground placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add wallet"}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-negative">{error}</p> : null}
    </section>
  );
}
