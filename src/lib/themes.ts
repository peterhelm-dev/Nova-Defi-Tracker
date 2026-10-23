/** Color themes. Violet is the original night palette and the default for everyone. */

export const THEME_IDS = ["violet", "copper", "harbor", "wine", "grove", "parchment"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "violet";
export const THEME_STORAGE_KEY = "nova:theme";
export const THEME_COOKIE = "nova-theme";

export type ThemeColors = {
  background: string;
  backgroundSidebar: string;
  backgroundOverlay: string;
  surface: string;
  surfaceRaised: string;
  surfaceHover: string;
  borderSubtle: string;
  borderStrong: string;
  foreground: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  brandSecondary: string;
  brandBlue: string;
  brandGlow: string;
  positive: string;
  warning: string;
  negative: string;
  info: string;
  focus: string;
};

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  blurb: string;
  light: boolean;
  colors: ThemeColors;
  gradientBrand: string;
  atmosphereA: string;
  atmosphereB: string;
  atmosphereC: string;
  atmosphereStrength: string;
};

export const THEMES: ThemeDefinition[] = [
  {
    id: "violet",
    label: "Violet",
    blurb: "The original night purple",
    light: false,
    colors: {
      background: "#060816",
      backgroundSidebar: "#080b1c",
      backgroundOverlay: "#0b1024",
      surface: "#0d1226",
      surfaceRaised: "#12182e",
      surfaceHover: "#171e38",
      borderSubtle: "#202945",
      borderStrong: "#354063",
      foreground: "#f6f7ff",
      textSecondary: "#aeb7d2",
      textMuted: "#7f89a8",
      textInverse: "#090b18",
      accent: "#9a72ff",
      brandSecondary: "#cf4dff",
      brandBlue: "#3478ff",
      brandGlow: "#a56cff",
      positive: "#4de59a",
      warning: "#ffb84d",
      negative: "#ff5c73",
      info: "#66a3ff",
      focus: "#b995ff",
    },
    gradientBrand: "linear-gradient(110deg, #c246e9 0%, #754cff 50%, #3478ff 100%)",
    atmosphereA: "154 114 255",
    atmosphereB: "52 120 255",
    atmosphereC: "77 229 154",
    atmosphereStrength: "0.22",
  },
  {
    id: "copper",
    label: "Copper",
    blurb: "Warm ink and orange",
    light: false,
    colors: {
      background: "#1a1511",
      backgroundSidebar: "#14110e",
      backgroundOverlay: "#241c16",
      surface: "#261e18",
      surfaceRaised: "#31261e",
      surfaceHover: "#3a2d23",
      borderSubtle: "#43362c",
      borderStrong: "#6a5342",
      foreground: "#f6efe6",
      textSecondary: "#d4c4b2",
      textMuted: "#a8927c",
      textInverse: "#1c1612",
      accent: "#c88858",
      brandSecondary: "#e0a36a",
      brandBlue: "#7f9aa8",
      brandGlow: "#e7b48a",
      positive: "#8fbf98",
      warning: "#e0a15c",
      negative: "#e08a7c",
      info: "#8aafc0",
      focus: "#e7c4a2",
    },
    gradientBrand: "linear-gradient(120deg, #e0a36a 0%, #c4784a 48%, #8f6a4a 100%)",
    atmosphereA: "200 136 88",
    atmosphereB: "127 154 168",
    atmosphereC: "143 191 152",
    atmosphereStrength: "0.2",
  },
  {
    id: "harbor",
    label: "Harbor",
    blurb: "Pine ink and brass",
    light: false,
    colors: {
      background: "#0e1716",
      backgroundSidebar: "#0a1211",
      backgroundOverlay: "#13201e",
      surface: "#162220",
      surfaceRaised: "#1d2c29",
      surfaceHover: "#243632",
      borderSubtle: "#2a3d38",
      borderStrong: "#4d6a62",
      foreground: "#eef6f3",
      textSecondary: "#c5d6cf",
      textMuted: "#93aea4",
      textInverse: "#1a140c",
      accent: "#e2b56a",
      brandSecondary: "#8fb9a8",
      brandBlue: "#8eb8c4",
      brandGlow: "#f0d7a4",
      positive: "#7dcaa0",
      warning: "#e2b56a",
      negative: "#e59288",
      info: "#8eb8c4",
      focus: "#f0d7a4",
    },
    gradientBrand: "linear-gradient(120deg, #f0d7a4 0%, #e2b56a 46%, #3d6d62 100%)",
    atmosphereA: "226 181 106",
    atmosphereB: "142 184 196",
    atmosphereC: "125 202 160",
    atmosphereStrength: "0.2",
  },
  {
    id: "wine",
    label: "Wine",
    blurb: "Plum ink and rose",
    light: false,
    colors: {
      background: "#160e12",
      backgroundSidebar: "#110a0e",
      backgroundOverlay: "#1c1016",
      surface: "#24161c",
      surfaceRaised: "#2e1c24",
      surfaceHover: "#3a2430",
      borderSubtle: "#3d2832",
      borderStrong: "#6a4556",
      foreground: "#f8eef2",
      textSecondary: "#e0c6d0",
      textMuted: "#b48b9c",
      textInverse: "#241018",
      accent: "#f0a0b8",
      brandSecondary: "#c4b0e0",
      brandBlue: "#c4b0e0",
      brandGlow: "#f6c6d4",
      positive: "#8fceaa",
      warning: "#e7b56a",
      negative: "#f0a0b8",
      info: "#c4b0e0",
      focus: "#f6c6d4",
    },
    gradientBrand: "linear-gradient(120deg, #f6c6d4 0%, #c45b78 48%, #5c3d72 100%)",
    atmosphereA: "240 160 184",
    atmosphereB: "196 176 224",
    atmosphereC: "143 206 170",
    atmosphereStrength: "0.2",
  },
  {
    id: "grove",
    label: "Grove",
    blurb: "Forest night and pollen",
    light: false,
    colors: {
      background: "#101610",
      backgroundSidebar: "#0c120c",
      backgroundOverlay: "#141c14",
      surface: "#182018",
      surfaceRaised: "#202a20",
      surfaceHover: "#283428",
      borderSubtle: "#2c3a2c",
      borderStrong: "#4e624e",
      foreground: "#f3f6ee",
      textSecondary: "#d0d8c4",
      textMuted: "#a3b096",
      textInverse: "#1a160c",
      accent: "#e2c56a",
      brandSecondary: "#9cbf8a",
      brandBlue: "#9eb8c0",
      brandGlow: "#f0e0a4",
      positive: "#8fce8a",
      warning: "#e2c56a",
      negative: "#e59288",
      info: "#9eb8c0",
      focus: "#f0e0a4",
    },
    gradientBrand: "linear-gradient(120deg, #f0e0a4 0%, #e2c56a 42%, #3e5c40 100%)",
    atmosphereA: "226 197 106",
    atmosphereB: "158 184 192",
    atmosphereC: "143 206 138",
    atmosphereStrength: "0.2",
  },
  {
    id: "parchment",
    label: "Parchment",
    blurb: "Warm paper for daylight",
    light: true,
    colors: {
      background: "#f4efe6",
      backgroundSidebar: "#ebe3d4",
      backgroundOverlay: "#e7dfd2",
      surface: "#fffaf3",
      surfaceRaised: "#fffdf8",
      surfaceHover: "#f3eadc",
      borderSubtle: "#e0d4c4",
      borderStrong: "#c4b29e",
      foreground: "#1c1612",
      textSecondary: "#3f342c",
      textMuted: "#5c4d42",
      textInverse: "#fffaf3",
      accent: "#8a3f1d",
      brandSecondary: "#8a4e10",
      brandBlue: "#1e4f73",
      brandGlow: "#c46a3a",
      positive: "#1d6b3a",
      warning: "#8a4e10",
      negative: "#9d2f2a",
      info: "#1e4f73",
      focus: "#8a3f1d",
    },
    gradientBrand: "linear-gradient(120deg, #c46a3a 0%, #8a3f1d 55%, #1e4f73 100%)",
    atmosphereA: "138 63 29",
    atmosphereB: "30 79 115",
    atmosphereC: "29 107 58",
    atmosphereStrength: "0.12",
  },
];

const BY_ID = new Map(THEMES.map((theme) => [theme.id, theme]));

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && BY_ID.has(value as ThemeId);
}

export function normalizeTheme(value: unknown): ThemeId {
  return isThemeId(value) ? value : DEFAULT_THEME;
}

export function themeById(id: ThemeId): ThemeDefinition {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_THEME)!;
}

/** Pairs that must clear WCAG AA for normal text (4.5:1). */
export const TEXT_CONTRAST_PAIRS: [keyof ThemeColors, keyof ThemeColors][] = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["foreground", "surfaceRaised"],
  ["foreground", "surfaceHover"],
  ["foreground", "backgroundSidebar"],
  ["textSecondary", "background"],
  ["textSecondary", "surface"],
  ["textSecondary", "surfaceRaised"],
  ["textMuted", "background"],
  ["textMuted", "surface"],
  ["textMuted", "surfaceRaised"],
  ["textMuted", "backgroundSidebar"],
  ["accent", "background"],
  ["accent", "surface"],
  ["accent", "surfaceRaised"],
  ["accent", "backgroundSidebar"],
  ["textInverse", "accent"],
  ["positive", "surface"],
  ["positive", "surfaceRaised"],
  ["negative", "surface"],
  ["negative", "surfaceRaised"],
  ["warning", "surface"],
  ["warning", "surfaceRaised"],
  ["info", "surface"],
];

function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
}

function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const r = linearize(channel(hex, 0));
  const g = linearize(channel(hex, 1));
  const b = linearize(channel(hex, 2));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const left = relativeLuminance(foreground);
  const right = relativeLuminance(background);
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastFailures(theme: ThemeDefinition, minimum = 4.5): string[] {
  const failures: string[] = [];
  for (const [ink, paper] of TEXT_CONTRAST_PAIRS) {
    const ratio = contrastRatio(theme.colors[ink], theme.colors[paper]);
    if (ratio < minimum) {
      failures.push(`${theme.id} ${ink} on ${paper} is ${ratio.toFixed(2)}`);
    }
  }
  const focus = contrastRatio(theme.colors.focus, theme.colors.background);
  if (focus < 3) failures.push(`${theme.id} focus on background is ${focus.toFixed(2)}`);
  return failures;
}

export function readStoredTheme(): ThemeId {
  if (typeof localStorage === "undefined") return DEFAULT_THEME;
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeId(raw)) return raw;
  try {
    const prefs = JSON.parse(localStorage.getItem("nova:preferences") || "null") as { theme?: unknown } | null;
    return normalizeTheme(prefs?.theme);
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: unknown): void {
  const id = normalizeTheme(theme);
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* private mode */
  }
  document.cookie = `${THEME_COOKIE}=${id}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/** Blocking script for the root layout. Runs before paint. */
export function themeBootScript(): string {
  return `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var allow=${JSON.stringify([...THEME_IDS])};var t=localStorage.getItem(k);if(allow.indexOf(t)<0){t=null;try{var p=JSON.parse(localStorage.getItem("nova:preferences")||"null");if(p&&allow.indexOf(p.theme)>=0)t=p.theme;}catch(e){}}if(!t)t=${JSON.stringify(DEFAULT_THEME)};document.documentElement.dataset.theme=t;document.cookie=${JSON.stringify(`${THEME_COOKIE}=`)}+t+"; Path=/; Max-Age=31536000; SameSite=Lax";}catch(e){document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)};}})();`;
}

export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const;

export const chartTooltipStyle = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  color: "var(--foreground)",
} as const;
