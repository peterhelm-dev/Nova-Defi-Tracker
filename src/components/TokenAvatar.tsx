import { IconImg } from "./IconImg";
import { ChainIcon } from "./ChainIcon";

type TokenAvatarProps = {
  iconUrl: string | null;
  symbol: string;
  chain: string;
  size?: number;
};

/** Coin logo with a small chain-logo badge overlaid bottom-right, like most wallet UIs. */
export function TokenAvatar({ iconUrl, symbol, chain, size = 24 }: TokenAvatarProps) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <IconImg src={iconUrl} alt={symbol} fallbackText={symbol} size={size} />
      <span className="absolute -right-0.5 -bottom-0.5">
        <ChainIcon chain={chain} size={Math.max(10, Math.round(size * 0.5))} />
      </span>
    </span>
  );
}
