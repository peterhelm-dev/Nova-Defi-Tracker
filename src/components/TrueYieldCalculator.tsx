"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { depositChecklist, type ProtocolFact } from "@/lib/depositChecklist";
import type { ChainCost } from "@/lib/dust";
import { normalizeChainId } from "@/lib/chainIcons";
import { formatUsd } from "@/lib/format";
import {
  actionGasUnits,
  gasCostUsd,
  impermanentLoss,
  poolHasImpermanentLoss,
  trueYield,
  YIELD_GAS_UNITS,
} from "@/lib/trueYield";
import type { PoolHit } from "@/lib/research";

function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return formatUsd(value);
}

export function TrueYieldCalculator({
  pool,
  protocol,
}: {
  pool: PoolHit;
  protocol: ProtocolFact | null;
}) {
  const [deposit, setDeposit] = useState("1000");
  const [days, setDays] = useState(365);
  const [haircut, setHaircut] = useState(0);
  const [move, setMove] = useState(0);
  const volatile = poolHasImpermanentLoss(pool.symbol);
  const chain = normalizeChainId(pool.chain);
  const costs = useQuery({
    queryKey: ["network-costs"],
    staleTime: 120_000,
    queryFn: async () => {
      const res = await fetch("/api/network-costs");
      if (!res.ok) return [] as ChainCost[];
      const json = (await res.json()) as { costs?: ChainCost[] };
      return json.costs ?? [];
    },
  });
  const cost = costs.data?.find((item) => item.chain === chain);
  const depositUsd = Number(deposit);
  const safeDeposit = Number.isFinite(depositUsd) ? Math.max(0, depositUsd) : 0;
  const ilFraction = volatile ? impermanentLoss(1 + move / 100) : 0;
  const gasUsd = cost ? gasCostUsd(BigInt(cost.gasPriceWei || "0"), actionGasUnits(days, pool.apyReward), cost.nativeUsd) : null;
  const exitGas = cost ? gasCostUsd(BigInt(cost.gasPriceWei || "0"), YIELD_GAS_UNITS.withdraw, cost.nativeUsd) : null;
  const result = trueYield({
    depositUsd: safeDeposit,
    days,
    baseApyPct: pool.apyBase,
    rewardApyPct: pool.apyReward,
    rewardHaircutPct: haircut,
    ilFraction,
    feeAprPct: null,
    gasUsd: gasUsd ?? 0,
  });
  const checklist = depositChecklist({
    symbol: pool.symbol,
    project: pool.project,
    poolTvlUsd: pool.tvlUsd,
    protocol,
    exitGasUsd: exitGas,
  });
  const claims = Math.floor(days / 30);

  return (
    <div className="mt-6 flex flex-col gap-5">
      <section className="rounded-2xl border border-border-subtle bg-background/40 p-4">
        <h3 className="text-sm font-semibold text-foreground">Before you deposit</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {checklist.map((item) => (
            <li key={item.id}>
              <p className="text-xs tracking-wide text-text-muted uppercase">{item.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-background/40 p-4">
        <h3 className="text-sm font-semibold text-foreground">True yield</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Headline APY counts rewards at full price and ignores gas. This subtracts a reward haircut you choose,
          an impermanent-loss estimate for volatile pairs, and gas for one deposit, one withdraw
          {pool.apyReward && pool.apyReward > 0 ? `, and a reward claim every 30 days (${claims} over this hold)` : ""}.
          No separate vault fee was published for this pool, so none is subtracted beyond the listed rates.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-text-muted">
            Deposit, USD
            <input
              inputMode="decimal"
              value={deposit}
              onChange={(event) => setDeposit(event.target.value)}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="block text-xs text-text-muted">
            Holding period
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </label>
          <label className="block text-xs text-text-muted sm:col-span-2">
            Reward-token haircut: {haircut}%
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={haircut}
              onChange={(event) => setHaircut(Number(event.target.value))}
              className="mt-2 w-full accent-[var(--accent,#c4784a)]"
            />
            <span className="mt-1 block text-text-secondary">
              Reward APY is often paid in the protocol&apos;s own token. 0% keeps the listed reward. 100% ignores it.
            </span>
          </label>
          {volatile ? (
            <label className="block text-xs text-text-muted sm:col-span-2">
              Volatile price move by exit: {move > 0 ? `+${move}` : move}%
              <input
                type="range"
                min={-80}
                max={200}
                step={5}
                value={move}
                onChange={(event) => setMove(Number(event.target.value))}
                className="mt-2 w-full"
              />
              <span className="mt-1 block text-text-secondary">
                Assumes a 50/50 pool. This move would cost about {Math.round(ilFraction * 1000) / 10}% of the deposit
                versus holding the two coins.
              </span>
            </label>
          ) : (
            <p className="text-sm text-text-secondary sm:col-span-2">
              This listing looks like one asset or a stable pair, so the impermanent-loss slider stays off.
            </p>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-surface px-3 py-2">
            <dt className="text-[11px] tracking-wide text-text-muted uppercase">Net dollars</dt>
            <dd className={`mt-1 text-sm ${result.netUsd < 0 ? "text-negative" : "text-foreground"}`}>{money(result.netUsd)}</dd>
          </div>
          <div className="rounded-xl bg-surface px-3 py-2">
            <dt className="text-[11px] tracking-wide text-text-muted uppercase">Net APY</dt>
            <dd className="mt-1 text-sm text-foreground">{result.netApyPct === null ? "—" : `${result.netApyPct.toFixed(2)}%`}</dd>
          </div>
          <div className="rounded-xl bg-surface px-3 py-2">
            <dt className="text-[11px] tracking-wide text-text-muted uppercase">Break-even deposit</dt>
            <dd className="mt-1 text-sm text-foreground">
              {result.breakEvenDepositUsd === null ? "Yield doesn't cover the drag" : money(result.breakEvenDepositUsd)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-text-muted">
          {gasUsd === null
            ? "Gas price didn't load, so this total leaves gas out."
            : `Gas in this estimate is about ${money(gasUsd)} on ${pool.chain}.`}{" "}
          Base yield {money(result.grossUsd)}, rewards after the haircut {money(result.rewardUsd)}, impermanent loss {money(result.ilUsd)}.
          This is a sketch of public data, not financial advice.
        </p>
      </section>
    </div>
  );
}
