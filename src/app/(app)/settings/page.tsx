"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { SyncControl } from "@/components/SyncControl";
import { NORI_STORAGE_KEY, SOUND_STORAGE_KEY, TOUR_STORAGE_KEY } from "@/lib/experience";
import { usePreferences } from "@/hooks/usePreferences";
import { usePrivacyMode } from "@/lib/privacy";
import { usePersistedState } from "@/lib/usePersistedState";
import { shortenAddress } from "@/lib/format";
import { applyTheme, THEMES } from "@/lib/themes";
import { PositionDetailModal } from "@/components/nova/PositionDetailModal";

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { privacyMode, togglePrivacyMode } = usePrivacyMode();
  const [soundOn, setSoundOn] = usePersistedState(SOUND_STORAGE_KEY, true);
  const [, setTourComplete] = usePersistedState(TOUR_STORAGE_KEY, false);
  const [noriHidden, setNoriHidden] = usePersistedState(NORI_STORAGE_KEY, false);
  const [showPositionPreview, setShowPositionPreview] = useState(false);
  const { prefs, setPrefs } = usePreferences();

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
        <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        <p className="mt-1 text-xs text-text-muted">
          Violet is the main theme. Choosing another updates the app immediately.
          The choice stays in this browser and, if you sign in, on your account.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Color theme">
          {THEMES.map((theme) => {
            const selected = prefs.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  applyTheme(theme.id);
                  setPrefs((current) => ({ ...current, theme: theme.id }));
                }}
                className={`pressable rounded-xl border p-3 text-left ${
                  selected ? "border-accent" : "border-border-subtle hover:border-border-strong"
                }`}
              >
                <span
                  className="flex items-center gap-2 rounded-lg border px-2 py-2"
                  style={{
                    background: theme.colors.background,
                    borderColor: theme.colors.borderSubtle,
                  }}
                >
                  <span
                    className="rounded-md px-2 py-1 text-xs font-semibold"
                    style={{ background: theme.colors.surface, color: theme.colors.foreground }}
                  >
                    Aa
                  </span>
                  <span
                    className="rounded-md px-2 py-1 text-xs font-semibold"
                    style={{ background: theme.colors.accent, color: theme.colors.textInverse }}
                  >
                    Go
                  </span>
                  <span className="ml-auto h-3 w-3 rounded-full" style={{ background: theme.colors.positive }} />
                </span>
                <span className="mt-2 block text-sm font-medium text-foreground">{theme.label}</span>
                <span className="block text-xs text-text-muted">{theme.blurb}</span>
              </button>
            );
          })}
        </div>
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
            aria-label="Privacy mode"
            onClick={togglePrivacyMode}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
              privacyMode ? "bg-accent" : "bg-border-strong"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition-transform duration-200 ${
                privacyMode ? "translate-x-5 bg-text-inverse" : "translate-x-0.5 bg-foreground"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Sound</h2>
        <div className="mt-3 flex items-center justify-between">
          <div className="pr-4">
            <p className="text-sm text-foreground">Interface sounds</p>
            <p className="text-xs text-text-muted">
              Soft clicks and a quiet chime when a wallet is added or balances refresh.
              Off stays silent. Sounds never play before you interact with the page.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundOn}
            aria-label="Interface sounds"
            onClick={() => setSoundOn((value) => !value)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
              soundOn ? "bg-accent" : "bg-border-strong"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full transition-transform duration-200 ${
                soundOn ? "translate-x-5 bg-text-inverse" : "translate-x-0.5 bg-foreground"
              }`}
            />
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border-subtle bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">Tour</h2>
        <p className="mt-1 text-xs text-text-muted">
          A short look at Portfolio, the menu, wallets, and DeFi. Shown once, then only if you ask.
        </p>
        <button
          type="button"
          onClick={() => setTourComplete(false)}
          className="pressable mt-3 rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-text-secondary hover:border-border-strong hover:text-foreground"
        >
          Replay the tour
        </button>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-foreground">Nori</p>
            <p className="text-xs text-text-muted">The small note at the bottom of the sidebar.</p>
          </div>
          <button
            type="button"
            onClick={() => setNoriHidden((hidden) => !hidden)}
            className="pressable rounded-lg border border-border-subtle px-3 py-1.5 text-sm text-text-secondary hover:border-border-strong hover:text-foreground"
          >
            {noriHidden ? "Show Nori" : "Hide Nori"}
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
