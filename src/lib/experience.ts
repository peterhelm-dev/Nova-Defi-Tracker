/** Persisted preferences for sound and the first-run tour. */

export const SOUND_STORAGE_KEY = "nova:sound-enabled";
export const TOUR_STORAGE_KEY = "nova:tour-complete";
export const NORI_STORAGE_KEY = "nova:nori-dismissed";

export type SoundKind = "click" | "success" | "refresh";

export function canPlaySound(opts: { enabled: boolean; unlocked: boolean }): boolean {
  return opts.enabled && opts.unlocked;
}

/** Missing key means sound stays on. An explicit false turns it off. */
export function soundEnabledFromStorage(raw: string | null): boolean {
  if (raw === null || raw === "") return true;
  try {
    return JSON.parse(raw) !== false;
  } catch {
    return true;
  }
}

export function tourIsComplete(value: unknown): boolean {
  return value === true;
}

export const TOUR_STEPS = [
  {
    id: "welcome",
    title: "This is Novafolio",
    body: "A calm, read-only view of the wallets you care about. Nothing here can move funds or tell you what to buy.",
    target: null,
  },
  {
    id: "nav",
    title: "Find your way",
    body: "Portfolio is home. Explore, activity, and settings live in this menu.",
    target: "[data-tour='nav']",
  },
  {
    id: "wallets",
    title: "Add a wallet",
    body: "Connect a wallet you control, or paste any address or ENS name to watch it. You can name each one.",
    target: "[data-tour='wallets']",
  },
  {
    id: "defi",
    title: "Yields, when you want them",
    body: "Protocol and chain logos sit on each pool. Tracking a position only saves a note in this browser.",
    target: "#defi-pools",
  },
] as const;

export type WalletAvatarChoice =
  | { kind: "emoji"; value: string }
  | { kind: "image"; value: string };

export const WALLET_EMOJIS = [
  "🌿",
  "☕",
  "🌙",
  "🦊",
  "🦉",
  "🐢",
  "🌊",
  "🌾",
  "🪵",
  "🍋",
  "📘",
  "🪴",
  "🐚",
  "🧭",
  "🕯️",
  "🌸",
] as const;

const GENERIC_LABELS = new Set(["Connected", "Watch-only", "Saved wallet"]);

/** Nickname wins, then an ENS or custom label, otherwise the caller shortens the address. */
export function walletTitle(wallet: { nickname?: string; label: string }): string | null {
  const nickname = wallet.nickname?.trim();
  if (nickname) return nickname;
  if (wallet.label && !GENERIC_LABELS.has(wallet.label)) return wallet.label;
  return null;
}

export function resolveWalletAvatar(
  wallet: { avatar?: WalletAvatarChoice | null },
  ensAvatar: string | null | undefined,
  generatedSrc: string,
): { emoji: string | null; src: string | null } {
  if (wallet.avatar?.kind === "emoji" && wallet.avatar.value) {
    return { emoji: wallet.avatar.value, src: null };
  }
  if (wallet.avatar?.kind === "image" && wallet.avatar.value) {
    return { emoji: null, src: wallet.avatar.value };
  }
  if (ensAvatar) return { emoji: null, src: ensAvatar };
  return { emoji: null, src: generatedSrc };
}

/** A small geometric mark, deterministic per address, stored as an SVG URL. */
export function generatedAvatarSrc(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = [18, 28, 152, 200, 36][hash % 5];
  const cx = 18 + (hash % 28);
  const cy = 16 + ((hash >> 5) % 24);
  const r = 8 + (hash % 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="hsl(${hue} 32% 28%)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${hue} 42% 68%)"/><circle cx="${(hash >> 8) % 30 + 16}" cy="${(hash >> 13) % 22 + 30}" r="6" fill="hsl(${(hue + 24) % 360} 30% 78%)"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
