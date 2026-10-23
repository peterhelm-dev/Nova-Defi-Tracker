export function CoinGeckoAttribution({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://www.coingecko.com/"
      target="_blank"
      rel="noreferrer"
      className={`text-accent underline hover:text-foreground ${className}`}
    >
      CoinGecko
    </a>
  );
}
