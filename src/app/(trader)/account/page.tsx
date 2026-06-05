"use client";

import { useAccountStore } from "@/store/account-store";
import { useAuthStore } from "@/store/auth-store";
import type { Transaction } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

const TX_TONE: Record<Transaction["type"], "long" | "short" | "neutral" | "warning" | "info"> = {
  deposit: "long",
  withdrawal: "short",
  fee: "warning",
  trade: "info",
  funding: "neutral",
};

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const summary = useAccountStore((s) => s.summary);
  const transactions = useAccountStore((s) => s.transactions);

  if (!summary) return null;

  const marginPct = (summary.marginUsed / summary.equity) * 100;

  return (
    <div>
      <PageHeader
        title="Account"
        subtitle={`Account ${summary.accountId} · ${summary.currency}`}
        actions={
          <>
            <Button variant="secondary">Withdraw</Button>
            <Button>Deposit</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Balance" value={formatCurrency(summary.balance)} />
        <Stat label="Equity" value={formatCurrency(summary.equity)} />
        <Stat label="Buying power" value={formatCurrency(summary.buyingPower)} hint={`${summary.leverage}× leverage`} />
        <Stat
          label="Unrealized P&L"
          value={formatCurrency(summary.unrealizedPnl)}
          tone={summary.unrealizedPnl >= 0 ? "long" : "short"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Margin + profile */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Margin usage" />
            <div className="p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted">Used</span>
                <span className="nums">{formatCurrency(summary.marginUsed)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={cn("h-full rounded-full", marginPct > 80 ? "bg-short" : marginPct > 50 ? "bg-warning" : "bg-long")}
                  style={{ width: `${Math.min(100, marginPct)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{marginPct.toFixed(1)}% utilized</span>
                <span>Available {formatCurrency(summary.marginAvailable)}</span>
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
              <InfoRow label="Base currency" value={summary.currency} />
              <InfoRow label="KYC" value={<Badge tone="long">Verified</Badge>} />
            </div>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Transaction history" subtitle="Recent account activity" />
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
              </tbody>
            </table>
          </div>
        </Card>
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
