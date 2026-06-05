"use client";

import { useAdminStore } from "@/store/admin-store";
import type { KycStatus, TraderRecord, TraderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatCurrency, formatCompact, timeAgo, cn } from "@/lib/utils";

const STATUS_TONE: Record<TraderStatus, "long" | "short" | "warning" | "neutral"> = {
  active: "long",
  suspended: "short",
  pending: "warning",
  closed: "neutral",
};
const KYC_TONE: Record<KycStatus, "long" | "warning" | "short" | "neutral"> = {
  verified: "long",
  pending: "warning",
  rejected: "short",
  unsubmitted: "neutral",
};
const TIER_TONE = { bronze: "neutral", silver: "info", gold: "warning", platinum: "primary" } as const;

const NOW = Date.UTC(2026, 5, 4, 12, 0, 0);

export default function TradersPage() {
  const traders = useAdminStore((s) => s.traders);
  const setStatus = useAdminStore((s) => s.setTraderStatus);

  const active = traders.filter((t) => t.status === "active").length;
  const pendingKyc = traders.filter((t) => t.kyc === "pending").length;
  const totalEquity = traders.reduce((a, t) => a + t.equity, 0);

  const columns: Column<TraderRecord>[] = [
    {
      key: "name",
      header: "Trader",
      sortValue: (t) => t.name,
      cell: (t) => (
        <div>
          <div className="font-medium text-foreground">{t.name}</div>
          <div className="text-xs text-muted-2">{t.email}</div>
        </div>
      ),
    },
    { key: "country", header: "Country", sortValue: (t) => t.country, cell: (t) => <span className="text-muted">{t.country}</span> },
    {
      key: "tier",
      header: "Tier",
      sortValue: (t) => t.tier,
      cell: (t) => <Badge tone={TIER_TONE[t.tier]}>{t.tier}</Badge>,
    },
    {
      key: "kyc",
      header: "KYC",
      sortValue: (t) => t.kyc,
      cell: (t) => <Badge tone={KYC_TONE[t.kyc]}>{t.kyc}</Badge>,
    },
    {
      key: "equity",
      header: "Equity",
      align: "right",
      sortValue: (t) => t.equity,
      cell: (t) => <span className="nums">{formatCurrency(t.equity)}</span>,
    },
    {
      key: "pnl",
      header: "P&L 30d",
      align: "right",
      sortValue: (t) => t.pnl30d,
      cell: (t) => (
        <span className={cn("nums", t.pnl30d >= 0 ? "text-long" : "text-short")}>{formatCurrency(t.pnl30d)}</span>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      align: "right",
      sortValue: (t) => t.riskScore,
      cell: (t) => (
        <span
          className={cn(
            "nums font-medium",
            t.riskScore > 70 ? "text-short" : t.riskScore > 40 ? "text-warning" : "text-long",
          )}
        >
          {t.riskScore}
        </span>
      ),
    },
    {
      key: "lastActive",
      header: "Last active",
      sortValue: (t) => t.lastActive,
      cell: (t) => <span className="text-xs text-muted">{timeAgo(t.lastActive, NOW)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (t) => t.status,
      cell: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (t) =>
        t.status === "active" ? (
          <Button variant="danger" size="sm" onClick={() => setStatus(t.id, "suspended")}>
            Suspend
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setStatus(t.id, "active")}>
            Activate
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Traders" subtitle="Manage trader accounts, KYC and risk." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total traders" value={traders.length} />
        <Stat label="Active" value={active} tone="long" />
        <Stat label="Pending KYC" value={pendingKyc} tone={pendingKyc > 0 ? "short" : "neutral"} />
        <Stat label="Total equity (AUM)" value={`$${formatCompact(totalEquity)}`} />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={traders}
          rowKey={(t) => t.id}
          searchText={(t) => `${t.name} ${t.email} ${t.country} ${t.id}`}
          searchPlaceholder="Search traders by name, email, country…"
        />
      </Card>
    </div>
  );
}
