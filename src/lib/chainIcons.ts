// DeFiLlama's public icon CDN — already implicitly trusted since this app
// pulls pool data from DeFiLlama. No API key, stable URL pattern per chain id.
export function chainIconUrl(chainId: string): string {
  return `https://icons.llamao.fi/icons/chains/rsz_${chainId}.jpg`;
}
