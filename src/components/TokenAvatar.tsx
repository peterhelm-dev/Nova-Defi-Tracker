import { tokenIconSources } from "@/lib/tokenIcons";
import { IconImg } from "./IconImg";
import { ChainIcon } from "./ChainIcon";

type TokenAvatarProps = {
  iconUrl: string | null;
  symbol: string;
  chain: string;
  address?: string | null;
  size?: number;
};

/** Coin logo with the chain's own mark overlaid bottom-right. */
export function TokenAvatar({ iconUrl, symbol, chain, address, size = 24 }: TokenAvatarProps) {
  const badge = Math.max(12, Math.round(size * 0.5));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <IconImg
        sources={tokenIconSources({ iconUrl, chain, address })}
        alt={symbol}
        fallbackText={symbol}
        size={size}
      />
      <span className="absolute -right-1 -bottom-1">
        <ChainIcon chain={chain} size={badge} />
      </span>
    </span>
  );
}
