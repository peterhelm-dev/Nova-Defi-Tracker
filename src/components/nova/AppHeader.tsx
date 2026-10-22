"use client";

import { Address, Avatar, Identity, Name } from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { PRODUCT_NAME } from "@/lib/brand";
import { SyncControl } from "@/components/SyncControl";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { PAGE_TITLES } from "./pageTitles";
import { PrivacyToggleButton } from "./PrivacyToggleButton";

/** Desktop header (title/search/notifications/wallet/privacy) + mobile top bar, per DESIGN_SPEC.md. */
export function AppHeader() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? PRODUCT_NAME;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-background/80 px-4 py-4 backdrop-blur min-[1200px]:px-8">
      <div className="flex items-center gap-2 min-[1200px]:hidden">
        <BrandMark iconSize={24} />
      </div>

      <h1 className="hidden font-display text-xl font-bold text-foreground min-[1200px]:block">
        {title}
      </h1>

      <div className="flex items-center gap-2 min-[1200px]:gap-4">
        <PrivacyToggleButton />
        <WalletConnectButton className="hidden sm:inline" />
        <div className="hidden min-[1200px]:block">
          <SyncControl />
        </div>
        <Wallet>
          <ConnectWallet className="bg-accent text-text-inverse hover:bg-accent/90">
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
