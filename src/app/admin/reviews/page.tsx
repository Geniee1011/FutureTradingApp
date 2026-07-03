"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminStore } from "@/store/admin-store";
import { getWsClient } from "@/lib/ws-client";
import { USE_MOCK_FEED } from "@/lib/constants";
import type { AdminPendingReview } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

export default function AdminReviewsPage() {
  const getPendingReviews = useAdminStore((s) => s.getPendingReviews);
  const submitReviewDecision = useAdminStore((s) => s.submitReviewDecision);

  const [rows, setRows] = useState<AdminPendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // accountId mid-decision
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      setRows(await getPendingReviews());
      if (!silent) setLoading(false);
    },
    [getPendingReviews],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Live: the backend pushes an admin_update when an account is flagged (PENDING_REVIEW) or a
  // decision lands, so the queue reflects new passes and removals without a manual refresh.
  useEffect(() => {
    if (USE_MOCK_FEED) return;
    const off = getWsClient().onMessage((msg) => {
      if (msg.type === "admin_update") void load({ silent: true });
    });
    return off;
  }, [load]);

  const decide = async (r: AdminPendingReview, decision: "approve" | "disapprove") => {
    const verb = decision === "approve" ? "APPROVE" : "DISAPPROVE";
    const outcome =
      decision === "approve"
        ? `advance ${r.traderName} to: ${r.decisionType}${r.nextTierLabel ? ` (${r.nextTierLabel})` : ""}`
        : `reset ${r.traderName}'s current phase (${r.currentTierLabel ?? "current tier"}) for a retry`;
    if (!confirm(`${verb} — this will ${outcome}. Continue?`)) return;
    setBusy(r.accountId);
    setError(null);
    const res = await submitReviewDecision(r.accountId, decision);
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? "Decision failed.");
      return;
    }
    await load({ silent: true });
  };

  const totalProfit = rows.reduce((s, r) => s + r.realizedProfit, 0);

  return (
    <div>
      <PageHeader
        title="Profit-target reviews"
        subtitle="Traders who hit their profit target, awaiting your manual review before advancing."
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Awaiting review" value={rows.length} />
        <Stat label="Combined realized profit" value={formatCurrency(totalProfit)} tone={totalProfit >= 0 ? "long" : "short"} />
        <Stat label="Traders" value={new Set(rows.map((r) => r.traderId)).size} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-short/40 bg-short/10 px-4 py-2.5 text-sm text-short">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium text-foreground">Pending queue ({rows.length})</span>
          <Button variant="secondary" size="sm" onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <Th>Trader</Th>
                <Th>Current</Th>
                <Th className="text-right">Realized profit</Th>
                <Th className="text-right">Target</Th>
                <Th>On approve</Th>
                <Th>Passed at</Th>
                <Th className="text-right">Decision</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.accountId} className="border-b border-border/60 hover:bg-surface-2">
                  <Td>
                    <Link href={`/admin/traders/${r.traderId}`} className="font-medium text-foreground hover:underline">
                      {r.traderName}
                    </Link>
                    <div className="text-xs text-muted-2">{r.email}</div>
                  </Td>
                  <Td>
                    <div className="font-medium">{r.currentTierLabel ?? "—"}</div>
                    <div className="text-xs text-muted-2">{r.currentPhase ?? ""}</div>
                  </Td>
                  <Td className="nums text-right text-long">{formatCurrency(r.realizedProfit)}</Td>
                  <Td className="nums text-right text-muted">{formatCurrency(r.profitTarget)}</Td>
                  <Td>
                    <Badge tone="long">{r.decisionType}</Badge>
                    {r.nextTierLabel && <div className="mt-0.5 text-xs text-muted-2">{r.nextTierLabel}</div>}
                  </Td>
                  <Td className="nums text-muted">{formatDateTime(r.pendingReviewAt)}</Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => void decide(r, "approve")} loading={busy === r.accountId} disabled={busy != null}>
                        Approve
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => void decide(r, "disapprove")} disabled={busy != null}>
                        Disapprove
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted">
                    {loading ? "Loading…" : "No accounts awaiting review."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted-2">
        Approve advances the trader to their next phase / funded tier (a clean-slate reset to that tier). Disapprove resets
        the current phase so they can retry. Either way the trader keeps trading until you decide.
      </p>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2.5 font-medium", className)}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-2.5", className)}>{children}</td>;
}
