export function CoinGeckoAttribution({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://www.coingecko.com/"
      target="_blank"
      rel="noreferrer"
      className={`underline hover:text-foreground ${className}`}
    >
      CoinGecko
    </a>
  );
}
