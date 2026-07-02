import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto max-w-6xl px-6 py-6 text-center text-xs text-white/30">
      <p>
        Read-only and non-custodial — this app never has access to your keys
        or funds. Balances are read directly from Base; prices and pool data
        come from CoinGecko and DeFiLlama and may be delayed or unavailable.
        Nothing here is investment advice.
      </p>
      <nav className="mt-3 flex items-center justify-center gap-4">
        <Link href="/pricing" className="hover:text-white/60">
          Pricing
        </Link>
        <Link href="/terms" className="hover:text-white/60">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-white/60">
          Privacy
        </Link>
        <Link href="/support" className="hover:text-white/60">
          Support
        </Link>
      </nav>
    </footer>
  );
}
