"use client";

import { useAdminStore } from "@/store/admin-store";
import type { AdminAccount, TraderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { formatCurrency, formatCompact } from "@/lib/utils";

const STATUS_TONE: Record<TraderStatus, "long" | "short" | "warning" | "neutral"> = {
  active: "long",
  suspended: "short",
  pending: "warning",
  closed: "neutral",
};

export default function AccountsPage() {
  const accounts = useAdminStore((s) => s.accounts);
  const setStatus = useAdminStore((s) => s.setAccountStatus);

  const live = accounts.filter((a) => a.type === "live").length;
  const totalEquity = accounts.reduce((a, x) => a + x.equity, 0);
  const totalBalance = accounts.reduce((a, x) => a + x.balance, 0);

  const columns: Column<AdminAccount>[] = [
    {
      key: "id",
      header: "Account",
      sortValue: (a) => a.id,
      cell: (a) => (
        <div>
          <div className="nums font-medium text-foreground">{a.id}</div>
          <div className="text-xs text-muted-2">{a.traderName}</div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortValue: (a) => a.type,
      cell: (a) => <Badge tone={a.type === "live" ? "primary" : "neutral"}>{a.type}</Badge>,
    },
    { key: "currency", header: "Ccy", sortValue: (a) => a.currency, cell: (a) => <span className="text-muted">{a.currency}</span> },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      sortValue: (a) => a.balance,
      cell: (a) => <span className="nums">{formatCurrency(a.balance)}</span>,
    },
    {
      key: "equity",
      header: "Equity",
      align: "right",
      sortValue: (a) => a.equity,
      cell: (a) => <span className="nums">{formatCurrency(a.equity)}</span>,
    },
    {
      key: "leverage",
      header: "Leverage",
      align: "right",
      sortValue: (a) => a.leverage,
      cell: (a) => <span className="nums">{a.leverage}×</span>,
    },
    {
      key: "openPositions",
      header: "Positions",
      align: "right",
      sortValue: (a) => a.openPositions,
      cell: (a) => <span className="nums">{a.openPositions}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (a) => a.status,
      cell: (a) => <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (a) =>
        a.status === "suspended" ? (
          <Button variant="secondary" size="sm" onClick={() => setStatus(a.id, "active")}>
            Unfreeze
          </Button>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setStatus(a.id, "suspended")}>
            Freeze
          </Button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader title="Accounts" subtitle="All trading accounts across the platform." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total accounts" value={accounts.length} />
        <Stat label="Live accounts" value={live} tone="long" />
        <Stat label="Total balance" value={`$${formatCompact(totalBalance)}`} />
        <Stat label="Total equity" value={`$${formatCompact(totalEquity)}`} />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={accounts}
          rowKey={(a) => a.id}
          searchText={(a) => `${a.id} ${a.traderName} ${a.currency} ${a.type}`}
          searchPlaceholder="Search by account id or trader…"
        />
      </Card>
    </div>
  );
}
