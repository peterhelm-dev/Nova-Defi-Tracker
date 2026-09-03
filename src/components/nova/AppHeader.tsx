"use client";

import { Address, Avatar, Identity, Name } from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SyncControl } from "@/components/SyncControl";
import { BellIcon, SearchIcon } from "./icons";
import { PAGE_TITLES } from "./pageTitles";
import { PrivacyToggleButton } from "./PrivacyToggleButton";

/** Desktop header (title/search/notifications/wallet/privacy) + mobile top bar, per DESIGN_SPEC.md. */
export function AppHeader() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "NOVA";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-background/80 px-4 py-4 backdrop-blur min-[1200px]:px-8">
      <div className="flex items-center gap-2 min-[1200px]:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/nova/app-icon.png" alt="" width={24} height={24} className="rounded-md" />
          <span className="font-display text-base font-bold text-foreground">NOVA</span>
        </Link>
      </div>

      <h1 className="hidden font-display text-xl font-bold text-foreground min-[1200px]:block">
        {title}
      </h1>

      <div className="flex items-center gap-2 min-[1200px]:gap-4">
        <div className="hidden min-[1200px]:flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-sm text-text-muted">
          <SearchIcon className="h-4 w-4" />
          <span>Search coins, apps…</span>
        </div>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-secondary hover:text-foreground"
          aria-label="Notifications"
        >
          <BellIcon className="h-4 w-4" />
        </button>
        <PrivacyToggleButton />
        <div className="hidden min-[1200px]:block">
          <SyncControl />
        </div>
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
