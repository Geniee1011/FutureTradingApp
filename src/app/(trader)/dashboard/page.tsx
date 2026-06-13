"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccountStore } from "@/store/account-store";
import { useOrdersStore } from "@/store/orders-store";
import { useMarketStore } from "@/store/market-store";
import { useAuthStore, getAuthToken } from "@/store/auth-store";
import { WS_URL, USE_MOCK_FEED, getMultiplier, getMargin } from "@/lib/constants";
import { formatCurrency, clamp } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { PositionsTable } from "@/components/trade/PositionsTable";
import { OrdersTable } from "@/components/trade/OrdersTable";
import { EquityChart } from "@/components/chart/EquityChart";
import { seedEquityCurve } from "@/lib/mock/data";

const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const summary = useAccountStore((s) => s.summary);
  const orders = useOrdersStore((s) => s.orders);
  const positions = useOrdersStore((s) => s.positions);
  const quotes = useMarketStore((s) => s.quotes);
  const [equityCurve, setEquityCurve] = useState<{ time: number; value: number }[]>([]);

  // Equity curve: realized-balance series from the backend (Transaction ledger),
  // with the demo fallback when there's no backend/session.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = getAuthToken();
      if (!USE_MOCK_FEED && API_BASE && token) {
        try {
          const res = await fetch(`${API_BASE}/api/equity-curve`, { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = (await res.json()) as { time: number; value: number }[];
            if (!cancelled && data.length > 1) {
              setEquityCurve(data);
              return;
            }
          }
        } catch {
          /* fall through */
        }
      }
      if (!cancelled) setEquityCurve(seedEquityCurve());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live unrealized P&L across open positions.
  const unrealized = positions.reduce((acc, p) => {
    const mark = quotes[p.symbol]?.price ?? p.markPrice;
    const dir = p.side === "buy" ? 1 : -1;
    return acc + (mark - p.avgPrice) * p.quantity * dir * getMultiplier(p.symbol);
  }, 0);

  const equity = (summary?.balance ?? 0) + unrealized;
  // Margin held against open positions, and what's free to open more.
  const usedMargin = positions.reduce((acc, p) => acc + p.quantity * getMargin(p.symbol), 0);
  const availableMargin = equity - usedMargin;
  const profitPct = summary ? clamp((summary.totalPnl / summary.rule.profitTarget) * 100, 0, 100) : 0;

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
          label="Total P&L"
          value={formatCurrency(summary?.totalPnl ?? 0)}
          tone={(summary?.totalPnl ?? 0) >= 0 ? "long" : "short"}
          hint={summary ? `Target ${formatCurrency(summary.rule.profitTarget)}` : ""}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Available margin"
          value={formatCurrency(Math.max(0, availableMargin))}
          tone={availableMargin <= 0 ? "short" : undefined}
          hint={`Used ${formatCurrency(usedMargin)}`}
        />
        <Stat
          label="Daily P&L"
          value={formatCurrency(summary?.dailyPnl ?? 0)}
          tone={(summary?.dailyPnl ?? 0) >= 0 ? "long" : "short"}
          hint={summary ? `Loss limit ${formatCurrency(summary.rule.maxDailyLoss)}` : ""}
        />
        <Stat
          label="Current drawdown"
          value={formatCurrency(summary?.drawdown ?? 0)}
          hint={summary ? `Max ${formatCurrency(summary.rule.maxDrawdown)}` : ""}
        />
        <Stat label="Profit target" value={`${Math.round(profitPct)}%`} tone="long" hint={summary ? formatCurrency(summary.rule.profitTarget) : ""} />
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader title="Equity curve" subtitle="Last 60 days" />
          <CardBody className="h-[300px] p-2">
            <EquityChart data={equityCurve} />
          </CardBody>
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
