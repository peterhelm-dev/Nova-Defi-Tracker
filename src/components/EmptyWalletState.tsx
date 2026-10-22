"use client";

import { ConnectWallet, Wallet } from "@coinbase/onchainkit/wallet";
import { tokenIconSources } from "@/lib/tokenIcons";
import { AddWalletForm } from "./WalletBook";
import { ChainIcon } from "./ChainIcon";
import { IconImg } from "./IconImg";

const PREVIEW = [
  { symbol: "ETH", name: "Ethereum", chain: "ethereum", address: "native", amount: "1.20", value: "$3,180" },
  {
    symbol: "USDC",
    name: "USD Coin",
    chain: "base",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    amount: "840",
    value: "$840",
  },
  {
    symbol: "AERO",
    name: "Aero",
    chain: "base",
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    amount: "220",
    value: "$186",
  },
];

/** Landing shown until a wallet is connected or a watch address is saved. */
export function EmptyWalletState({ onAdd }: { onAdd: (input: string) => Promise<void> }) {
  return (
    <section
      data-tour="wallets"
      className="grid items-center gap-8 rounded-3xl border border-border-subtle bg-surface/80 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
    >
      <div className="flex flex-col gap-5">
        <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">Novafolio</p>
        <div>
          <h2 className="max-w-xl text-3xl leading-tight font-semibold text-foreground sm:text-4xl">
            Track all your crypto wallets in one place
          </h2>
          <p className="mt-3 max-w-xl text-base text-text-secondary">
            Novafolio reads public balances across Ethereum, Base, Arbitrum, Optimism,
            Polygon, BNB Chain, and Avalanche. Read-only and non-custodial — connect a
            wallet, or paste an address you want to watch. Nothing here is financial advice.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Wallet>
            <ConnectWallet className="pressable bg-accent text-text-inverse hover:bg-accent/90" />
          </Wallet>
          <span className="text-sm text-text-muted">or paste an address</span>
        </div>
        <AddWalletForm onAdd={onAdd} />
      </div>

      <div className="rounded-2xl border border-border-subtle bg-background/70 p-4 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs tracking-wide text-text-muted uppercase">Preview</p>
            <p className="mt-1 font-display text-3xl text-foreground">$4,206</p>
          </div>
          <p className="text-xs text-positive">Sample numbers</p>
        </div>
        <svg viewBox="0 0 280 72" className="mt-3 h-16 w-full" aria-hidden>
          <path
            d="M4 52 C 40 50, 60 28, 96 34 S 150 58, 188 30 240 18, 276 22"
            fill="none"
            stroke="currentColor"
            className="text-accent"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <ul className="mt-2 divide-y divide-border-subtle">
          {PREVIEW.map((row) => (
            <li key={row.symbol} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex items-center gap-2.5">
                <span className="relative">
                  <IconImg
                    sources={tokenIconSources({ iconUrl: null, chain: row.chain, address: row.address })}
                    alt=""
                    fallbackText={row.symbol}
                    size={28}
                  />
                  <span className="absolute -right-1 -bottom-1">
                    <ChainIcon chain={row.chain} size={14} />
                  </span>
                </span>
                <span>
                  <span className="block text-sm text-foreground">{row.symbol}</span>
                  <span className="block text-xs text-text-muted">{row.name}</span>
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm text-foreground">{row.value}</span>
                <span className="block text-xs text-text-muted">{row.amount}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
