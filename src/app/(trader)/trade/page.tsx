"use client";

import { useState } from "react";
import { useMarketStore } from "@/store/market-store";
import { useOrdersStore } from "@/store/orders-store";
import { getInstrument } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Watchlist } from "@/components/market/Watchlist";
import { OrderBook } from "@/components/market/OrderBook";
import { OrderTicket } from "@/components/trade/OrderTicket";
import { PositionsTable } from "@/components/trade/PositionsTable";
import { OrdersTable } from "@/components/trade/OrdersTable";
import { AdvancedChart } from "@/components/chart/tradingview/AdvancedChart";
import { LivePrice } from "@/components/market/LivePrice";
import { SymbolPicker } from "@/components/market/SymbolPicker";
import { formatPrice, formatPercent, formatCompact, cn } from "@/lib/utils";

export default function TradePage() {
  const symbol = useMarketStore((s) => s.selectedSymbol);
  const quote = useMarketStore((s) => s.quotes[symbol]);
  const contractCode = useMarketStore((s) => s.contractCodes[symbol]);
  const orders = useOrdersStore((s) => s.orders);
  const inst = getInstrument(symbol);
  const precision = inst?.pricePrecision ?? 2;
  const [bottomTab, setBottomTab] = useState<"positions" | "orders">("positions");

  const openOrders = orders.filter((o) => o.status === "open" || o.status === "partial");

  return (
    <div className="grid gap-3 lg:grid-cols-[240px_1fr_300px]">
      {/* Left: market list */}
      <Card className="order-2 overflow-hidden lg:order-1">
        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Markets
        </div>
        <Watchlist />
      </Card>

      {/* Center: instrument header + chart + bottom tabs */}
      <div className="order-1 flex flex-col gap-3 lg:order-2">
        <Card>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <SymbolPicker />
            <div>
              <div className="flex items-center gap-2">
                <span className="nums text-lg font-semibold">{contractCode ?? symbol}</span>
                <Badge tone="neutral">{inst?.category}</Badge>
              </div>
              <div className="text-xs text-muted-2">{inst?.name}</div>
            </div>
            <div>
              <LivePrice symbol={symbol} className="text-lg font-semibold" />
              <div
                className={cn(
                  "nums text-xs",
                  (quote?.change24h ?? 0) >= 0 ? "text-long" : "text-short",
                )}
              >
                {formatPercent(quote?.change24h ?? 0)} 24h
              </div>
            </div>
            <HeaderStat label="24h High" value={quote ? formatPrice(quote.high24h, precision) : "—"} />
            <HeaderStat label="24h Low" value={quote ? formatPrice(quote.low24h, precision) : "—"} />
            <HeaderStat label="24h Volume" value={quote ? formatCompact(quote.volume24h) : "—"} />
          </div>
        </Card>

        <Card className="h-[420px] overflow-hidden">
          <AdvancedChart symbol={symbol} />
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            <TabButton active={bottomTab === "positions"} onClick={() => setBottomTab("positions")}>
              Positions
            </TabButton>
            <TabButton active={bottomTab === "orders"} onClick={() => setBottomTab("orders")}>
              Open orders ({openOrders.length})
            </TabButton>
          </div>
          {bottomTab === "positions" ? <PositionsTable /> : <OrdersTable orders={openOrders} />}
        </Card>
      </div>

      {/* Right: order ticket + order book */}
      <div className="order-3 flex flex-col gap-3">
        <Card className="overflow-hidden">
          <OrderTicket symbol={symbol} />
        </Card>
        <Card className="h-[320px] overflow-hidden">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Order book
          </div>
          <div className="h-[calc(100%-37px)]">
            <OrderBook symbol={symbol} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden sm:block">
      <div className="text-[10px] uppercase tracking-wide text-muted-2">{label}</div>
      <div className="nums text-sm">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-surface-3 text-foreground" : "text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
