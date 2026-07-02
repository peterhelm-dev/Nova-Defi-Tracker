"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

type BillingStatus = {
  configured: boolean;
  entitled: boolean;
  plan: "free" | "pro";
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  hasSubscription: boolean;
};

async function redirectTo(endpoint: string): Promise<void> {
  const res = await fetch(endpoint, { method: "POST", credentials: "same-origin" });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Billing request failed");
  }
  const { url } = (await res.json()) as { url?: string };
  if (url) window.location.href = url;
}

/**
 * Billing state + actions for the signed-in wallet. Status is only fetched when
 * signed in (billing is per-account); checkout and portal redirect to Stripe.
 */
export function useBilling() {
  const { authedAddress } = useAuth();
  const isSignedIn = authedAddress !== null;

  const { data, isLoading } = useQuery({
    queryKey: ["billing", authedAddress],
    enabled: isSignedIn,
    staleTime: 30_000,
    queryFn: async (): Promise<BillingStatus> => {
      const res = await fetch("/api/billing/status", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load billing status");
      return res.json();
    },
  });

  const startCheckout = useCallback(() => redirectTo("/api/billing/checkout"), []);
  const openPortal = useCallback(() => redirectTo("/api/billing/portal"), []);

  return {
    isSignedIn,
    isLoading: isSignedIn && isLoading,
    configured: data?.configured ?? false,
    entitled: data?.entitled ?? false,
    status: data?.status ?? "none",
    currentPeriodEnd: data?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: data?.cancelAtPeriodEnd ?? false,
    hasSubscription: data?.hasSubscription ?? false,
    startCheckout,
    openPortal,
  };
}
