import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mergePreferences, normalizePreferences } from "./preferences";
import {
  applyTheme,
  contrastFailures,
  DEFAULT_THEME,
  readStoredTheme,
  themeBootScript,
  THEMES,
} from "./themes";

describe("color themes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.dataset.theme = "";
    localStorage.clear();
  });

  it("keeps six crafted themes and defaults to violet", () => {
    expect(THEMES.map((theme) => theme.id)).toEqual([
      "violet",
      "copper",
      "harbor",
      "wine",
      "grove",
      "parchment",
    ]);
    expect(DEFAULT_THEME).toBe("violet");
    expect(THEMES.filter((theme) => theme.light).map((theme) => theme.id)).toEqual(["parchment"]);
  });

  it("clears WCAG AA for text and a 3:1 focus ring", () => {
    expect(THEMES.flatMap((theme) => contrastFailures(theme))).toEqual([]);
  });

  it("matches the CSS variables that paint the page", () => {
    const css = readFileSync(resolve("src/app/globals.css"), "utf8");
    for (const theme of THEMES) {
      const marker = theme.id === "violet" ? '[data-theme="violet"]' : `[data-theme="${theme.id}"]`;
      const start = css.indexOf(marker);
      expect(start).toBeGreaterThan(-1);
      const slice = css.slice(start, css.indexOf("}", start));
      expect(slice).toContain(`--accent: ${theme.colors.accent}`);
      expect(slice).toContain(`--background: ${theme.colors.background}`);
      expect(slice).toContain(`--foreground: ${theme.colors.foreground}`);
      expect(slice).toContain(`--text-muted: ${theme.colors.textMuted}`);
      expect(slice).toContain(`--text-inverse: ${theme.colors.textInverse}`);
      expect(slice).toContain(`--positive: ${theme.colors.positive}`);
      expect(slice).toContain(`--negative: ${theme.colors.negative}`);
    }
    expect(css).toContain("rgb(var(--atmosphere-a)");
    expect(css).toContain("--chart-1: var(--accent)");
  });

  it("boots from localStorage before first paint and falls back to violet", () => {
    const script = themeBootScript();
    expect(script).toContain('"nova:theme"');
    expect(script).toContain('"nova:preferences"');
    expect(script).toContain('t="violet"');
    expect(script).toContain("document.documentElement.dataset.theme=t");
    expect(script).toContain("nova-theme=");
  });

  it("reads the dedicated key, then the synced preferences blob", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      clear: () => store.clear(),
    });
    store.set("nova:theme", "harbor");
    store.set("nova:preferences", JSON.stringify({ theme: "wine" }));
    expect(readStoredTheme()).toBe("harbor");
    store.delete("nova:theme");
    expect(readStoredTheme()).toBe("wine");
    store.set("nova:theme", "nope");
    expect(readStoredTheme()).toBe("wine");
  });

  it("applies a theme to the document, localStorage, and the cookie", () => {
    applyTheme("grove");
    expect(document.documentElement.dataset.theme).toBe("grove");
    expect(localStorage.getItem("nova:theme")).toBe("grove");
    expect(document.cookie).toContain("nova-theme=grove");
    applyTheme("not-a-theme");
    expect(document.documentElement.dataset.theme).toBe("violet");
  });

  it("keeps a guest theme when the remote profile is still the default", () => {
    const local = normalizePreferences({ theme: "copper" });
    const remote = normalizePreferences({ theme: "violet" });
    expect(mergePreferences(local, remote).theme).toBe("copper");
    expect(mergePreferences(remote, normalizePreferences({ theme: "parchment" })).theme).toBe("parchment");
    expect(normalizePreferences({ theme: "nope" }).theme).toBe("violet");
  });

  it("leaves the share image on the original purple", () => {
    const source = readFileSync(resolve("src/app/opengraph-image.tsx"), "utf8");
    expect(source).toContain("#060816");
    expect(source).toContain("#7c4dff");
    expect(source).not.toContain("var(--accent)");
    expect(source).not.toContain("#c4784a");
  });
});
