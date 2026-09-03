"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSiweMessage } from "viem/siwe";
import { base } from "wagmi/chains";
import {
  useAccount,
  useChainId,
  useSignMessage,
  useSwitchChain,
} from "wagmi";

const SESSION_KEY = ["auth", "session"] as const;

async function fetchSession(): Promise<string | null> {
  const res = await fetch("/api/auth/session", { credentials: "same-origin" });
  if (!res.ok) return null;
  const data = (await res.json()) as { address: string | null };
  return data.address;
}

/**
 * Sign-In With Ethereum on top of the connected wagmi wallet. The connected
 * address proves wallet ownership for reads; signing in additionally proves it
 * to the server (smart-wallet aware) so per-account data can sync. Guest mode
 * — connected but not signed in — keeps working against localStorage.
 */
export function useAuth() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const queryClient = useQueryClient();

  const { data: authedAddress = null, isLoading } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: fetchSession,
    staleTime: 60_000,
  });

  const signIn = useCallback(async () => {
    if (!address) throw new Error("Connect a wallet first");

    // The server verifies the signature against the wallet contract as
    // deployed on Base — smart wallets keep a separate owner registry per
    // chain, so a signature produced while connected to another chain (e.g.
    // Ethereum mainnet) can be rejected even though the address matches.
    // Force Base before asking for a signature.
    let signInChainId = chainId;
    if (chainId !== base.id) {
      await switchChainAsync({ chainId: base.id });
      signInChainId = base.id;
    }

    const nonceRes = await fetch("/api/auth/nonce", { credentials: "same-origin" });
    if (!nonceRes.ok) throw new Error("Could not start sign-in");
    const { nonce } = (await nonceRes.json()) as { nonce: string };

    const message = createSiweMessage({
      address,
      chainId: signInChainId,
      domain: window.location.host,
      nonce,
      uri: window.location.origin,
      version: "1",
      statement: "Sign in to NOVA to sync your portfolio.",
    });

    const signature = await signMessageAsync({ message });

    const verifyRes = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ message, signature }),
    });
    if (!verifyRes.ok) {
      const { error } = (await verifyRes.json().catch(() => ({}))) as { error?: string };
      throw new Error(error ?? "Sign-in failed");
    }

    await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
  }, [address, chainId, signMessageAsync, switchChainAsync, queryClient]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
    await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
  }, [queryClient]);

  // A session is only meaningful while the matching wallet is connected.
  const isAuthed =
    isConnected &&
    !!authedAddress &&
    !!address &&
    authedAddress.toLowerCase() === address.toLowerCase();

  return {
    address,
    isConnected,
    authedAddress: isAuthed ? authedAddress : null,
    isAuthed,
    isLoading,
    signIn,
    signOut,
  };
}
