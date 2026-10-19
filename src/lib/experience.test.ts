import { describe, expect, it } from "vitest";
import { chainIconUrl, protocolIconUrl } from "./chainIcons";
import {
  canPlaySound,
  generatedAvatarSrc,
  resolveWalletAvatar,
  soundEnabledFromStorage,
  tourIsComplete,
  walletTitle,
} from "./experience";
import { monogramLabel, monogramStyle, tokenIconSources } from "./tokenIcons";

describe("chain and token icons", () => {
  it("uses self-hosted official marks, including Base's own logo", () => {
    expect(chainIconUrl("base")).toBe("/chains/base.png");
    expect(chainIconUrl("ethereum")).toBe("/chains/ethereum.png");
    expect(chainIconUrl("arbitrum")).toBe("/chains/arbitrum.png");
    expect(chainIconUrl("optimism")).toBe("/chains/optimism.png");
    expect(chainIconUrl("polygon")).toBe("/chains/polygon.png");
    expect(chainIconUrl("avalanche")).toBe("/chains/avalanche.png");
    expect(chainIconUrl("binance-smart-chain")).toBe("/chains/bnb.png");
    expect(chainIconUrl("BSC")).toBe("/chains/bnb.png");
    expect(chainIconUrl("Binance")).toBe("/chains/bnb.png");
  });

  it("builds a protocol icon URL from a DeFiLlama slug", () => {
    expect(protocolIconUrl("aave-v3")).toContain("/aave-v3");
    expect(protocolIconUrl("Aerodrome")).toContain("/aerodrome");
  });

  it("falls back through metadata, the chain mark, and Trust Wallet", () => {
    const native = tokenIconSources({
      iconUrl: null,
      chain: "ethereum",
      address: "native",
    });
    expect(native[0]).toBe("/chains/ethereum.png");
    expect(native.some((url) => url.includes("trustwallet/assets"))).toBe(true);

    const usdc = tokenIconSources({
      iconUrl: "https://example.com/usdc.png",
      chain: "ethereum",
      address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    });
    expect(usdc[0]).toBe("https://example.com/usdc.png");
    expect(usdc[1]).toContain("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  });

  it("makes a two-letter monogram with a stable color", () => {
    expect(monogramLabel("usdc")).toBe("US");
    expect(monogramLabel("?")).toBe("?");
    expect(monogramStyle("usdc")).toEqual(monogramStyle("USDC"));
    expect(monogramStyle("usdc").background).toMatch(/^hsl\(/);
    expect(monogramStyle("dai").background).not.toBe(monogramStyle("brett").background);
  });
});

describe("sound and tour gates", () => {
  it("never plays before a gesture or when sound is off", () => {
    expect(canPlaySound({ enabled: true, unlocked: false })).toBe(false);
    expect(canPlaySound({ enabled: false, unlocked: true })).toBe(false);
    expect(canPlaySound({ enabled: true, unlocked: true })).toBe(true);
  });

  it("defaults sound on and treats an explicit false as off", () => {
    expect(soundEnabledFromStorage(null)).toBe(true);
    expect(soundEnabledFromStorage("true")).toBe(true);
    expect(soundEnabledFromStorage("false")).toBe(false);
  });

  it("remembers the tour only after it is completed", () => {
    expect(tourIsComplete(false)).toBe(false);
    expect(tourIsComplete(undefined)).toBe(false);
    expect(tourIsComplete(true)).toBe(true);
  });
});

describe("wallet identity", () => {
  it("prefers a nickname over a generic label", () => {
    expect(walletTitle({ nickname: "  Rainy day  ", label: "Connected" })).toBe("Rainy day");
    expect(walletTitle({ label: "vitalik.eth" })).toBe("vitalik.eth");
    expect(walletTitle({ label: "Watch-only" })).toBeNull();
  });

  it("picks emoji, then an upload, then ENS, then a generated mark", () => {
    const generated = generatedAvatarSrc("0xabc");
    expect(generated.startsWith("data:image/svg+xml")).toBe(true);

    expect(
      resolveWalletAvatar({ avatar: { kind: "emoji", value: "🦉" } }, "https://ens/a.png", generated),
    ).toEqual({ emoji: "🦉", src: null });

    expect(
      resolveWalletAvatar(
        { avatar: { kind: "image", value: "data:image/jpeg;base64,abc" } },
        "https://ens/a.png",
        generated,
      ).src,
    ).toBe("data:image/jpeg;base64,abc");

    expect(resolveWalletAvatar({}, "https://ens/a.png", generated).src).toBe("https://ens/a.png");
    expect(resolveWalletAvatar({}, null, generated).src).toBe(generated);
  });
});
