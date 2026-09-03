import { chainIconUrl } from "@/lib/chainIcons";
import { formatChainName } from "@/lib/format";
import { IconImg } from "./IconImg";

/** Small chain-logo indicator, replacing a text "Base"/"Ethereum" pill. Hover for the name. */
export function ChainIcon({ chain, size = 16 }: { chain: string; size?: number }) {
  const label = formatChainName(chain);
  return (
    <IconImg
      src={chainIconUrl(chain)}
      alt={label}
      fallbackText={label}
      size={size}
      className="ring-1 ring-background"
    />
  );
}
