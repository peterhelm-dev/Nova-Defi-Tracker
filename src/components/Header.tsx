"use client";

import { Address, Avatar, Identity, Name } from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import Link from "next/link";
import { SyncControl } from "./SyncControl";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
          B
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Base Wealth Tracker</p>
          <p className="text-xs text-white/50">Onchain net worth, built on Base</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/pricing"
          className="hidden text-sm text-white/60 hover:text-white sm:block"
        >
          Pricing
        </Link>
        <SyncControl />
        <Wallet>
          <ConnectWallet className="bg-accent hover:bg-accent/90">
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2">
              <Avatar />
              <Name />
              <Address />
            </Identity>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>
    </header>
  );
}
