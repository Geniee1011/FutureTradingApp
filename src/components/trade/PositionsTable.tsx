"use client";

import { useState } from "react";
import { useOrdersStore } from "@/store/orders-store";
import { useMarketStore } from "@/store/market-store";
import { getInstrument } from "@/lib/constants";
import type { Position } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPrice, formatSigned, cn } from "@/lib/utils";

/** Open positions with live mark price + unrealized P&L, and a Close action. */
export function PositionsTable({ variant = "table" }: { variant?: "table" | "compact" }) {
  const positions = useOrdersStore((s) => s.positions);
  const closePosition = useOrdersStore((s) => s.closePosition);
  const quotes = useMarketStore((s) => s.quotes);
  const [closing, setClosing] = useState<string | null>(null);

  async function close(symbol: string) {
    setClosing(symbol);
    await closePosition(symbol);
    setClosing(null);
  }

  /** Live mark + unrealized P&L ($ and %) for one position. */
  function metrics(p: Position) {
    const inst = getInstrument(p.symbol);
    const precision = inst?.pricePrecision ?? 2;
    const mark = quotes[p.symbol]?.price ?? p.markPrice;
    const dir = p.side === "buy" ? 1 : -1;
    const pnl = (mark - p.avgPrice) * p.quantity * dir * (inst?.multiplier ?? 1);
    const pnlPct = ((mark - p.avgPrice) / p.avgPrice) * 100 * dir;
    return { precision, mark, pnl, pnlPct };
  }

  if (positions.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted">No open positions.</div>;
  }

  // Compact card list for narrow panels (e.g. the trade page's side column),
  // where the full table overflows and hides Qty / Mark / P&L behind a horizontal
  // scroll — making a LIVE position look like a bare history row. Here every open
  // position clearly shows its size, mark, and live P&L, with the Close action.
  if (variant === "compact") {
    return (
      <div className="divide-y divide-border/60">
        {positions.map((p) => {
          const { precision, mark, pnl, pnlPct } = metrics(p);
          return (
            <div key={p.symbol} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{p.symbol}</span>
                  <Badge tone={p.side === "buy" ? "long" : "short"}>{p.side === "buy" ? "Long" : "Short"}</Badge>
                </div>
                <Button variant="danger" size="sm" loading={closing === p.symbol} onClick={() => close(p.symbol)}>
                  Close
                </Button>
              </div>
              <div className="mt-1.5 flex items-end justify-between gap-2">
                <div className="nums text-xs text-muted">
                  {p.quantity} @ {formatPrice(p.avgPrice, precision)}
                  <span className="text-muted-2"> → </span>
                  {formatPrice(mark, precision)}
                </div>
                <div className="text-right">
                  <div className={cn("nums text-sm font-semibold", pnl >= 0 ? "text-long" : "text-short")}>
                    {formatCurrency(pnl)}
                  </div>
                  <div className={cn("nums text-[11px]", pnl >= 0 ? "text-long" : "text-short")}>
                    {formatSigned(pnlPct)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 font-medium">Symbol</th>
            <th className="px-4 py-2.5 font-medium">Side</th>
            <th className="px-4 py-2.5 text-right font-medium">Qty</th>
            <th className="px-4 py-2.5 text-right font-medium">Avg price</th>
            <th className="px-4 py-2.5 text-right font-medium">Mark</th>
            <th className="px-4 py-2.5 text-right font-medium">Unrealized P&L</th>
            {/* Pinned right so the Close action stays visible in narrow cards. */}
            <th className="sticky right-0 z-10 bg-surface px-4 py-2.5 text-right font-medium shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.18)]"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const inst = getInstrument(p.symbol);
            const precision = inst?.pricePrecision ?? 2;
            const mark = quotes[p.symbol]?.price ?? p.markPrice;
            const dir = p.side === "buy" ? 1 : -1;
            const pnl = (mark - p.avgPrice) * p.quantity * dir * (inst?.multiplier ?? 1);
            const pnlPct = ((mark - p.avgPrice) / p.avgPrice) * 100 * dir;
            return (
              <tr key={p.symbol} className="group border-b border-border/60 hover:bg-surface-2">
                <td className="px-4 py-2.5 font-medium">{p.symbol}</td>
                <td className="px-4 py-2.5">
                  <Badge tone={p.side === "buy" ? "long" : "short"}>{p.side === "buy" ? "Long" : "Short"}</Badge>
                </td>
                <td className="nums px-4 py-2.5 text-right">{p.quantity}</td>
                <td className="nums px-4 py-2.5 text-right">{formatPrice(p.avgPrice, precision)}</td>
                <td className="nums px-4 py-2.5 text-right">{formatPrice(mark, precision)}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className={cn("nums font-medium", pnl >= 0 ? "text-long" : "text-short")}>
                    {formatCurrency(pnl)}
                  </div>
                  <div className={cn("nums text-xs", pnl >= 0 ? "text-long" : "text-short")}>
                    {formatSigned(pnlPct)}%
                  </div>
                </td>
                <td className="sticky right-0 z-10 bg-surface px-4 py-2.5 text-right shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.18)] group-hover:bg-surface-2">
                  <Button variant="danger" size="sm" loading={closing === p.symbol} onClick={() => close(p.symbol)}>
                    Close
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
