"use client";

import { useAccountStore } from "@/store/account-store";
import { useAuthStore } from "@/store/auth-store";
import type { AccountSummary, Transaction } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDateTime, clamp, cn } from "@/lib/utils";

const TX_TONE: Record<Transaction["type"], "long" | "short" | "neutral" | "warning" | "info"> = {
  deposit: "long",
  withdrawal: "short",
  fee: "warning",
  trade: "info",
  funding: "neutral",
};

const STATUS_TONE: Record<AccountSummary["status"], "info" | "long" | "short" | "warning"> = {
  ACTIVE: "info",
  PASSED: "long",
  FAILED: "short",
  SUSPENDED: "warning",
};

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const summary = useAccountStore((s) => s.summary);
  const transactions = useAccountStore((s) => s.transactions);

  if (!summary) return null;

  const { rule } = summary;
  const profitPct = clamp((summary.totalPnl / rule.profitTarget) * 100, 0, 100);
  // Equity-based day loss — the exact figure the engine enforces (includes unrealized).
  const dailyLossUsed = Math.max(0, -summary.dailyPnl);
  const dailyLossPct = clamp((dailyLossUsed / rule.maxDailyLoss) * 100, 0, 100);
  const drawdownPct = clamp((summary.drawdown / rule.maxDrawdown) * 100, 0, 100);

  return (
    <div>
      <PageHeader
        title="Account"
        subtitle={`Account ${summary.accountId} · ${summary.currency}`}
        actions={<Badge tone={STATUS_TONE[summary.status]}>{summary.status}</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Balance" value={formatCurrency(summary.balance)} hint={`Start ${formatCurrency(summary.startingBalance)}`} />
        <Stat label="Equity" value={formatCurrency(summary.equity)} />
        <Stat
          label="Unrealized P&L"
          value={formatCurrency(summary.unrealizedPnl)}
          tone={summary.unrealizedPnl >= 0 ? "long" : "short"}
        />
        <Stat
          label="Total P&L"
          value={formatCurrency(summary.totalPnl)}
          tone={summary.totalPnl >= 0 ? "long" : "short"}
          hint={`Today ${formatCurrency(summary.realizedPnlToday)}`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          {/* Evaluation objectives (from the Rule table) */}
          <Card>
            <CardHeader title="Evaluation" subtitle="Objectives & risk limits" />
            <div className="space-y-4 p-4">
              <ProgressRow
                label="Profit target"
                value={`${formatCurrency(Math.max(0, summary.totalPnl))} / ${formatCurrency(rule.profitTarget)}`}
                pct={profitPct}
                tone="long"
              />
              <ProgressRow
                label="Daily loss limit"
                value={`${formatCurrency(dailyLossUsed)} / ${formatCurrency(rule.maxDailyLoss)}`}
                pct={dailyLossPct}
                tone={dailyLossPct > 80 ? "short" : dailyLossPct > 50 ? "warning" : "neutral"}
              />
              <ProgressRow
                label="Max drawdown"
                value={`${formatCurrency(summary.drawdown)} / ${formatCurrency(rule.maxDrawdown)}`}
                pct={drawdownPct}
                tone={drawdownPct > 80 ? "short" : drawdownPct > 50 ? "warning" : "neutral"}
              />
              <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted">Max position size</span>
                <span className="nums font-medium">{rule.maxContracts} contracts</span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Profile" />
            <div className="space-y-3 p-4 text-sm">
              <InfoRow label="Name" value={user?.name ?? "—"} />
              <InfoRow label="Email" value={user?.email ?? "—"} />
              <InfoRow label="Role" value={<Badge tone="primary">{user?.role}</Badge>} />
              <InfoRow label="Account ID" value={<span className="nums">{summary.accountId}</span>} />
              <InfoRow label="Status" value={<Badge tone={STATUS_TONE[summary.status]}>{summary.status}</Badge>} />
              <InfoRow label="Base currency" value={summary.currency} />
            </div>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Transaction history" subtitle="From the account ledger" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/60 hover:bg-surface-2">
                    <td className="nums px-4 py-2.5 text-muted">{formatDateTime(tx.ts)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={TX_TONE[tx.type]}>{tx.type}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{tx.description}</td>
                    <td className={cn("nums px-4 py-2.5 text-right font-medium", tx.amount >= 0 ? "text-long" : "text-short")}>
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted">
                      No transactions yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone: "long" | "short" | "warning" | "neutral";
}) {
  const bar =
    tone === "long" ? "bg-long" : tone === "short" ? "bg-short" : tone === "warning" ? "bg-warning" : "bg-primary";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="nums">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
