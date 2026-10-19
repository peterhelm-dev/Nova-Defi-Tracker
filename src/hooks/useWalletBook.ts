"use client";

import { useCallback, useMemo } from "react";
import { isAddress } from "viem";
import { usePersistedState } from "@/lib/usePersistedState";

export const MAX_WALLETS = 8;

export type SavedWallet = {
  address: string;
  label: string;
  source: "connected" | "watch";
};

const STORAGE_KEY = "nova:wallets";

/**
 * Wallets shown on the dashboard. The connected wallet is included while the
 * session lasts; pasted addresses and ENS names are saved in this browser.
 * Capped so a Hobby deploy doesn't fan out into too many indexer calls.
 */
export function useWalletBook(connectedAddress?: string) {
  const [saved, setSaved] = usePersistedState<SavedWallet[]>(STORAGE_KEY, []);
  const connected = connectedAddress?.toLowerCase();

  const wallets = useMemo(() => {
    const list = saved.filter((wallet) => isAddress(wallet.address));
    if (!connected || !isAddress(connected)) return list;
    if (list.some((wallet) => wallet.address === connected)) {
      return list.map((wallet) =>
        wallet.address === connected ? { ...wallet, source: "connected" as const } : wallet,
      );
    }
    return [{ address: connected, label: "Connected", source: "connected" as const }, ...list];
  }, [saved, connected]);

  const addWatch = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) throw new Error("Enter a wallet address or ENS name");

      const res = await fetch(`/api/ens?name=${encodeURIComponent(trimmed)}`);
      const data = (await res.json().catch(() => ({}))) as { address?: string; error?: string };
      if (!res.ok || !data.address || !isAddress(data.address)) {
        throw new Error(data.error ?? "Could not add that wallet");
      }

      const address = data.address.toLowerCase();
      if (saved.some((wallet) => wallet.address === address)) return;

      const label = trimmed.includes(".") ? trimmed : "Watch-only";
      if (saved.length >= MAX_WALLETS) {
        throw new Error(`Novafolio tracks up to ${MAX_WALLETS} saved wallets.`);
      }

      setSaved((prev) => {
        if (prev.some((wallet) => wallet.address === address) || prev.length >= MAX_WALLETS) {
          return prev;
        }
        return [...prev, { address, label, source: "watch" }];
      });
    },
    [saved, setSaved],
  );

  const removeWallet = useCallback(
    (address: string) => {
      setSaved((prev) => prev.filter((wallet) => wallet.address !== address.toLowerCase()));
    },
    [setSaved],
  );

  const keepConnected = useCallback(() => {
    if (!connected) return;
    setSaved((prev) => {
      if (prev.some((wallet) => wallet.address === connected)) return prev;
      return [{ address: connected, label: "Saved wallet", source: "watch" }, ...prev];
    });
  }, [connected, setSaved]);

  return { wallets, addWatch, removeWallet, keepConnected, saved };
}
