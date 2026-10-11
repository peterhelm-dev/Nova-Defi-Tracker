import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CopyAddressButton } from "@/components/CopyAddressButton";
import { InfoPage } from "@/components/InfoPage";
import { donationPaymentUri, getDonationConfig, isDonationEnabled } from "@/lib/donation";

export const metadata: Metadata = {
  title: "Donate — NOVA",
  description: "Support NOVA with a tip in crypto or a coffee.",
};

export default function DonatePage() {
  const config = getDonationConfig();
  if (!isDonationEnabled(config)) notFound();
  const { address, coffeeUrl } = config;

  return (
    <InfoPage title="Support NOVA">
      <p>
        NOVA is built independently. If it&apos;s useful to you, a tip helps
        keep the data flowing and new features shipping. Entirely optional —
        thank you either way.
      </p>

      {address ? (
        <>
          <h2>Send crypto</h2>
          <p>
            Send ETH, USDC, or any token on <strong>Base</strong>{" "}
            (or another
            EVM chain) to this address. Double-check the network before sending
            — transfers can&apos;t be reversed.
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-surface px-4 py-3">
            <code className="min-w-0 flex-1 break-all font-mono text-xs text-white/90 select-all">
              {address}
            </code>
            <CopyAddressButton value={address} />
          </div>
          <p>
            <a href={donationPaymentUri(address)}>Open in wallet app →</a>
          </p>
        </>
      ) : null}

      {coffeeUrl ? (
        <>
          <h2>Buy me a coffee</h2>
          <p>Prefer a card? Tip via Buy Me a Coffee.</p>
          <p>
            <a
              href={coffeeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFDD00] px-4 py-2 text-sm font-semibold !text-black hover:!no-underline hover:opacity-90"
            >
              ☕ Buy me a coffee
            </a>
          </p>
        </>
      ) : null}
    </InfoPage>
  );
}
