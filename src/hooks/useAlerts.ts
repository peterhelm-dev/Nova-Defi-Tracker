"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AlertEvent, AlertRule } from "@/types";

type AlertsPayload = { rules: AlertRule[]; events: AlertEvent[] };

/**
 * Price-alert rules and fired events for the signed-in wallet. Rules use the
 * same replace-style PUT contract as tracked positions; events are dismissed
 * individually. Refetches periodically so alerts fired by the hourly cron
 * show up without a reload.
 */
export function useAlerts(authedAddress: string | null) {
  const queryClient = useQueryClient();
  const enabled = authedAddress !== null;
  const queryKey = ["alerts", authedAddress];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled,
    staleTime: 30_000,
    refetchInterval: enabled ? 120_000 : false,
    queryFn: async (): Promise<AlertsPayload> => {
      const res = await fetch("/api/alerts", { credentials: "same-origin" });
      if (!res.ok) throw new Error("Failed to load alerts");
      return res.json();
    },
  });

  const putRules = useCallback(
    async (rules: AlertRule[]) => {
      const res = await fetch("/api/alerts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) throw new Error("Failed to save alerts");
      await queryClient.invalidateQueries({ queryKey });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, authedAddress],
  );

  const addRule = useCallback(
    (input: Omit<AlertRule, "id" | "armed" | "createdAt">) =>
      putRules([
        { ...input, id: crypto.randomUUID(), armed: true, createdAt: Date.now() },
        ...(data?.rules ?? []),
      ]),
    [putRules, data?.rules],
  );

  const removeRule = useCallback(
    (id: string) => putRules((data?.rules ?? []).filter((r) => r.id !== id)),
    [putRules, data?.rules],
  );

  const dismissEvent = useCallback(
    async (eventId: string) => {
      await fetch("/api/alerts/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ eventId }),
      });
      await queryClient.invalidateQueries({ queryKey });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, authedAddress],
  );

  return {
    rules: data?.rules ?? [],
    events: data?.events ?? [],
    isLoading: enabled && isLoading,
    addRule,
    removeRule,
    dismissEvent,
  };
}
