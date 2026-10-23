import Link from "next/link";

export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`mx-auto w-full max-w-6xl px-6 py-6 text-center text-xs text-text-muted ${className}`}>
      <p>
        Read-only and non-custodial — this app never has access to your keys
        or funds. Balances come from public chain data; prices and pool data
        come from CoinGecko, Alchemy, and DeFiLlama and may be delayed or
        unavailable. Nothing here is investment advice.
      </p>
      <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/pricing" className="hover:text-foreground">
          Pricing
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/support" className="hover:text-foreground">
          Support
        </Link>
      </nav>
    </footer>
  );
}
