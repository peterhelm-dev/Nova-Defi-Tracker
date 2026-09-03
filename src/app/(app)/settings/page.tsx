"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { SyncControl } from "@/components/SyncControl";
import { usePrivacyMode } from "@/lib/privacy";
import { shortenAddress } from "@/lib/format";
import { PositionDetailModal } from "@/components/nova/PositionDetailModal";

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();
  const [showPositionPreview, setShowPositionPreview] = useState(false);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <section className="rounded-xl border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Account</h2>
        {isConnected && address ? (
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{shortenAddress(address)}</p>
              <p className="text-xs text-text-muted">Connected wallet</p>
            </div>
            <SyncControl />
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            Connect a wallet from the header to see account options.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Privacy</h2>
        <div className="mt-3 flex items-center justify-between">
          <div className="pr-4">
            <p className="text-sm text-foreground">Privacy mode</p>
            <p className="text-xs text-text-muted">
              Masks balances and figures in the interface. Doesn&apos;t change what&apos;s
              visible onchain.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={privacyMode}
            onClick={togglePrivacyMode}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
              privacyMode ? "bg-accent" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
                privacyMode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">About</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <Link href="/pricing" className="text-accent hover:underline">
            Pricing
          </Link>
          <Link href="/privacy" className="text-accent hover:underline">
            Privacy policy
          </Link>
          <Link href="/terms" className="text-accent hover:underline">
            Terms of service
          </Link>
          <Link href="/support" className="text-accent hover:underline">
            Support
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Design preview</h2>
        <p className="mt-1 text-xs text-text-muted">
          Previews a UI pattern that has no live data source connected yet (see the
          &quot;Sample data&quot; badge inside).
        </p>
        <button
          type="button"
          onClick={() => setShowPositionPreview(true)}
          className="mt-3 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-text-secondary hover:border-border-strong hover:text-foreground"
        >
          Preview position detail
        </button>
      </section>

      {showPositionPreview && (
        <PositionDetailModal onClose={() => setShowPositionPreview(false)} />
      )}
    </div>
  );
}
