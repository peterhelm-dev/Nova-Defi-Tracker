"use client";

import { useQuery } from "@tanstack/react-query";
import { revokeUrl, valueAtRisk } from "@/lib/approvals";
import { formatChainName, formatUsd, shortenAddress } from "@/lib/format";
import type { TokenHolding } from "@/types";
import type { WalletApproval } from "@/lib/server/approvals/read";

type ApprovalResponse = {
  address?: string;
  approvals?: WalletApproval[];
  partial?: boolean;
};

export function ApprovalsCard({
  address,
  holdings,
}: {
  address: string | undefined;
  holdings: TokenHolding[];
}) {
  const query = useQuery({
    queryKey: ["approvals", address],
    enabled: Boolean(address),
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<ApprovalResponse> => {
      const res = await fetch(`/api/approvals?address=${address}`);
      if (!res.ok) throw new Error("approvals");
      return res.json();
    },
  });

  if (!address) return null;
  const approvals = query.data?.approvals ?? [];
  const wallet = query.data?.address ?? address;

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Token approvals</h2>
          <p className="mt-1 max-w-xl text-sm text-text-secondary">
            Open ERC-20 approvals for this wallet. Novafolio only reads logs and allowances. Nothing is signed here.
          </p>
        </div>
        <a
          href={revokeUrl(wallet, 1)}
          target="_blank"
          rel="noreferrer"
          className="layout-chip"
        >
          Review on revoke.cash
        </a>
      </div>
      {query.isLoading ? <p className="mt-4 text-sm text-text-muted">Reading approval logs…</p> : null}
      {query.isError ? (
        <p className="mt-4 text-sm text-text-muted">Approval history didn&apos;t load. The revoke.cash link still opens the full list.</p>
      ) : null}
      {query.data?.partial ? (
        <p className="mt-3 text-xs text-text-muted">
          Some chains only returned a recent window of logs. An older approval can still be open. Use revoke.cash for the full history.
        </p>
      ) : null}
      {!query.isLoading && approvals.length === 0 && !query.isError ? (
        <p className="mt-4 text-sm text-text-muted">No open approvals showed up in the logs we could read.</p>
      ) : null}
      {approvals.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-border-subtle">
          {approvals.map((approval) => {
            const holding = holdings.find(
              (item) => item.chain === approval.chain && item.address.toLowerCase() === approval.token.toLowerCase(),
            );
            const price = holding?.priceUsd ?? null;
            const balance = Number(approval.balance);
            const allowance = Number(approval.allowance);
            const risk = valueAtRisk(balance, allowance, price, approval.unlimited);
            return (
              <li key={`${approval.chain}:${approval.token}:${approval.spender}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    {approval.symbol} on {formatChainName(approval.chain)}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    Spender {approval.spenderLabel ?? "Unknown spender"} · {shortenAddress(approval.spender)}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {approval.unlimited ? "Unlimited approval" : `Allowance ${approval.allowance}`}
                    {approval.unlimited ? "" : ""}
                    {risk === null ? "" : ` · ${formatUsd(risk)} at risk`}
                  </p>
                </div>
                <a
                  href={revokeUrl(wallet, approval.chainId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-accent"
                >
                  Revoke on revoke.cash
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
