import sampleData from "./sample-portfolio.json";

/**
 * DEVELOPMENT-ONLY DATA ADAPTER.
 *
 * Backs UI surfaces (staking rewards, risk score/health-factor/LTV, position
 * detail) that no real integration exists for yet. Per the NOVA handoff:
 * "do not invent API endpoints" — so rather than fabricate a fake network
 * call, this is a static, clearly-labeled fixture. Every component that
 * reads from here must show a "Sample data" badge; never present these
 * numbers as a real wallet's figures.
 *
 * Swap this for a real integration (a lending-position indexer for
 * health-factor/LTV, a staking-protocol adapter for rewards) before shipping
 * these surfaces for real. See the "Unresolved integrations" note in the
 * NOVA implementation plan.
 */
export type SampleRiskFactor = {
  id: string;
  label: string;
  level: "low" | "moderate" | "elevated" | "critical" | "unknown";
};

export type SampleRisk = {
  score: number;
  level: "low" | "moderate" | "elevated" | "critical" | "unknown";
  updatedAt: string;
  factors: SampleRiskFactor[];
};

export type SamplePositionDetail = {
  positionId: string;
  collateral: { symbol: string; quantity: number; value: number };
  debt: { symbol: string; quantity: number; value: number };
  ltvPercent: number;
  healthFactor: number;
  liquidationPrice: number;
  estimatedNetApy: number;
};

export function getSampleRisk(): SampleRisk {
  return sampleData.risk as SampleRisk;
}

export function getSamplePositionDetail(): SamplePositionDetail {
  return sampleData.positionDetail as SamplePositionDetail;
}
