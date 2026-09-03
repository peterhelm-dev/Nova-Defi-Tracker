"use client";

import { useEffect } from "react";
import { getSamplePositionDetail } from "@/lib/sampleData";
import { formatUsd } from "@/lib/format";
import { SampleDataBadge } from "./SampleDataBadge";

const HEALTH_FACTOR_WARNING_THRESHOLD = 1.5;

/**
 * Drill-down from a DeFi position: value, chain, protocol, collateral, debt,
 * LTV, health factor, liquidation price, net APY, per component-specs.md.
 * No lending-position-level data source is connected for any real position
 * yet (see RiskOverviewCard), so this only ever renders the sample fixture —
 * it must never be opened from a real position row, to avoid presenting
 * fabricated numbers as a real position's figures.
 */
export function PositionDetailModal({ onClose }: { onClose: () => void }) {
  const detail = getSamplePositionDetail();
  const healthy = detail.healthFactor >= HEALTH_FACTOR_WARNING_THRESHOLD;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Position detail"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface-raised p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Position detail</h2>
          <div className="flex items-center gap-2">
            <SampleDataBadge />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        <dl className="mt-4 flex flex-col divide-y divide-border-subtle text-sm">
          <Row label="Health Factor">
            <span className={healthy ? "text-positive" : "text-negative"}>
              {detail.healthFactor.toFixed(2)} · {healthy ? "Healthy" : "Review"}
            </span>
          </Row>
          <Row label="Net Estimated APY">{formatPercentValue(detail.estimatedNetApy)}</Row>
          <Row label="Collateral">
            {detail.collateral.quantity} {detail.collateral.symbol} (
            {formatUsd(detail.collateral.value)})
          </Row>
          <Row label="Debt">
            {detail.debt.quantity} {detail.debt.symbol} ({formatUsd(detail.debt.value)})
          </Row>
          <Row label="LTV">{detail.ltvPercent.toFixed(1)}%</Row>
          <Row label="Liquidation Price">{formatUsd(detail.liquidationPrice)}</Row>
        </dl>

        <p className="mt-4 text-xs text-text-muted">
          Estimated APY is variable, not guaranteed. Health factor and liquidation price are
          illustrative sample values — connect a lending-position indexer to show these for real
          positions.
        </p>
      </div>
    </div>
  );
}

function formatPercentValue(value: number): string {
  return `${value.toFixed(1)}% (Estimated)`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="font-medium text-foreground">{children}</dd>
    </div>
  );
}
