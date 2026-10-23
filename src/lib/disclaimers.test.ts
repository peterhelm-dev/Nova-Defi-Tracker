import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ESTIMATE_NOTE, SITE_DISCLAIMER } from "./disclaimers";

const ADVICE_PHRASES = [
  /you should (buy|sell|deposit|stake)/i,
  /recommend(s|ed)? (buying|selling|a deposit)/i,
  /good time to (buy|sell)/i,
  /we suggest you (buy|sell)/i,
];

describe("disclaimers", () => {
  it("states that Novafolio is not advice and that figures are estimates", () => {
    expect(SITE_DISCLAIMER).toContain("not financial, investment, legal or tax advice");
    expect(SITE_DISCLAIMER).toContain("Do your own research.");
    expect(ESTIMATE_NOTE).toBe("Estimates only, not financial advice.");
  });

  it("places the site line in the footer and the short note beside yield views", () => {
    const footer = readFileSync(resolve("src/components/Footer.tsx"), "utf8");
    const terms = readFileSync(resolve("src/app/terms/page.tsx"), "utf8");
    expect(footer).toContain("SITE_DISCLAIMER");
    expect(terms).toContain("No financial advice");
    expect(terms).toContain("fiduciary");
    expect(terms).toContain("Alchemy, CoinGecko, and DeFiLlama");
    expect(terms).toContain("Past APY does not guarantee future returns");
    expect(terms).toContain("PendingLegalReview");
    for (const file of [
      "src/components/DefiPoolsSection.tsx",
      "src/components/TrueYieldCalculator.tsx",
      "src/components/DetectedPositionsCard.tsx",
      "src/components/ResearchDesk.tsx",
      "src/app/(app)/earn/page.tsx",
    ]) {
      expect(readFileSync(resolve(file), "utf8")).toContain("EstimateNote");
    }
  });

  it("keeps Nori copy from telling someone to buy or sell", () => {
    const files = [
      "src/components/nova/Sidebar.tsx",
      "src/components/nova/StakingRewardsCard.tsx",
      "src/components/nova/ComingSoonPage.tsx",
      "src/app/(app)/activity/page.tsx",
      "src/app/(app)/earn/page.tsx",
      "src/lib/experience.ts",
    ];
    for (const file of files) {
      const source = readFileSync(resolve(file), "utf8");
      for (const phrase of ADVICE_PHRASES) {
        expect(source).not.toMatch(phrase);
      }
    }
    const sidebar = readFileSync(resolve("src/components/nova/Sidebar.tsx"), "utf8");
    expect(sidebar).toContain("doesn't suggest buying or selling");
  });
});