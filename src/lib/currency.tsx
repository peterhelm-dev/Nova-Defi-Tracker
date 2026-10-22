"use client";

import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, normalizeCurrency, type DisplayCurrency, type FxRates } from "@/lib/balanceView";
import { usePreferences } from "@/hooks/usePreferences";

type CurrencyContextValue = {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  rates: FxRates | null;
  formatValue: (usd: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { prefs, setPrefs } = usePreferences();
  const currency = prefs.displayCurrency;
  const query = useQuery({
    queryKey: ["fx-rates"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<FxRates | null> => {
      const res = await fetch("/api/fx");
      if (!res.ok) return null;
      return (await res.json()) as FxRates;
    },
  });
  const rates = query.data ?? null;

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency: (next) => {
        const displayCurrency = normalizeCurrency(next);
        setPrefs((prev) => (prev.displayCurrency === displayCurrency ? prev : { ...prev, displayCurrency }));
      },
      rates,
      formatValue: (usd) => formatMoney(usd, currency, rates),
    }),
    [currency, rates, setPrefs],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useDisplayMoney(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  return {
    currency: "USD",
    setCurrency: () => {},
    rates: null,
    formatValue: (usd) => formatMoney(usd, "USD", null),
  };
}
