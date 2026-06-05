"use client";

import { useOrdersStore } from "@/store/orders-store";
import { useMarketStore } from "@/store/market-store";
import { getInstrument } from "@/lib/constants";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatPrice, formatSigned, cn } from "@/lib/utils";

/** Open positions with live mark price + unrealized P&L. */
export function PositionsTable() {
  const positions = useOrdersStore((s) => s.positions);
  const quotes = useMarketStore((s) => s.quotes);

  if (positions.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted">No open positions.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 font-medium">Symbol</th>
            <th className="px-4 py-2.5 font-medium">Side</th>
            <th className="px-4 py-2.5 text-right font-medium">Qty</th>
            <th className="px-4 py-2.5 text-right font-medium">Avg price</th>
            <th className="px-4 py-2.5 text-right font-medium">Mark</th>
            <th className="px-4 py-2.5 text-right font-medium">Unrealized P&L</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => {
            const inst = getInstrument(p.symbol);
            const precision = inst?.pricePrecision ?? 2;
            const mark = quotes[p.symbol]?.price ?? p.markPrice;
            const dir = p.side === "buy" ? 1 : -1;
            const pnl = (mark - p.avgPrice) * p.quantity * dir;
            const pnlPct = ((mark - p.avgPrice) / p.avgPrice) * 100 * dir;
            return (
              <tr key={p.symbol} className="border-b border-border/60 hover:bg-surface-2">
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
