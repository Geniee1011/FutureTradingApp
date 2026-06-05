"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccountStore } from "@/store/account-store";
import { useOrdersStore } from "@/store/orders-store";
import { useMarketStore } from "@/store/market-store";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { Watchlist } from "@/components/market/Watchlist";
import { PositionsTable } from "@/components/trade/PositionsTable";
import { OrdersTable } from "@/components/trade/OrdersTable";
import { EquityChart } from "@/components/chart/EquityChart";
import { seedEquityCurve } from "@/lib/mock/data";
import { formatCurrency, formatSigned } from "@/lib/utils";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const summary = useAccountStore((s) => s.summary);
  const orders = useOrdersStore((s) => s.orders);
  const positions = useOrdersStore((s) => s.positions);
  const quotes = useMarketStore((s) => s.quotes);
  const equityCurve = useMemo(() => seedEquityCurve(), []);

  // Live unrealized P&L across open positions.
  const unrealized = positions.reduce((acc, p) => {
    const mark = quotes[p.symbol]?.price ?? p.markPrice;
    const dir = p.side === "buy" ? 1 : -1;
    return acc + (mark - p.avgPrice) * p.quantity * dir;
  }, 0);

  const equity = (summary?.balance ?? 0) + unrealized;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0] ?? "Trader"}`}
        subtitle="Here's your portfolio at a glance."
        actions={
          <Link href="/trade">
            <Button>Open trade terminal</Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Account equity" value={formatCurrency(equity)} hint={summary ? `Balance ${formatCurrency(summary.balance)}` : ""} />
        <Stat
          label="Unrealized P&L"
          value={formatCurrency(unrealized)}
          tone={unrealized >= 0 ? "long" : "short"}
          hint={`${positions.length} open positions`}
        />
        <Stat
          label="Realized P&L (today)"
          value={formatCurrency(summary?.realizedPnlToday ?? 0)}
          tone={(summary?.realizedPnlToday ?? 0) >= 0 ? "long" : "short"}
        />
        <Stat
          label="Margin available"
          value={formatCurrency(summary?.marginAvailable ?? 0)}
          hint={summary ? `${formatSigned(((summary.marginUsed / summary.equity) * 100))}% used` : ""}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Equity curve" subtitle="Last 60 days" />
          <CardBody className="h-[300px] p-2">
            <EquityChart data={equityCurve} />
          </CardBody>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Markets" subtitle="Live prices" />
          <Watchlist />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Open positions" />
          <PositionsTable />
        </Card>
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent orders"
            action={
              <Link href="/orders" className="text-xs text-primary hover:underline">
                View all
              </Link>
            }
          />
          <OrdersTable orders={orders} limit={6} />
        </Card>
      </div>
    </div>
  );
}
