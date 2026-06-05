"use client";

import { useOrdersStore } from "@/store/orders-store";
import { getInstrument } from "@/lib/constants";
import type { Order, OrderStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatPrice, formatTime, cn } from "@/lib/utils";

const STATUS_TONE: Record<OrderStatus, "long" | "short" | "warning" | "info" | "neutral" | "primary"> = {
  filled: "long",
  open: "info",
  partial: "warning",
  pending: "neutral",
  cancelled: "neutral",
  rejected: "short",
};

export function OrdersTable({ orders, limit }: { orders: Order[]; limit?: number }) {
  const cancelOrder = useOrdersStore((s) => s.cancelOrder);
  const rows = limit ? orders.slice(0, limit) : orders;

  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted">No orders to show.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2.5 font-medium">Time</th>
            <th className="px-4 py-2.5 font-medium">Order ID</th>
            <th className="px-4 py-2.5 font-medium">Symbol</th>
            <th className="px-4 py-2.5 font-medium">Side</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 text-right font-medium">Qty</th>
            <th className="px-4 py-2.5 text-right font-medium">Price</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const precision = getInstrument(o.symbol)?.pricePrecision ?? 2;
            const cancellable = o.status === "open" || o.status === "partial";
            return (
              <tr key={o.id} className="border-b border-border/60 hover:bg-surface-2">
                <td className="nums px-4 py-2.5 text-muted">{formatTime(o.createdAt)}</td>
                <td className="nums px-4 py-2.5 text-xs text-muted-2">{o.id}</td>
                <td className="px-4 py-2.5 font-medium">{o.symbol}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("font-medium", o.side === "buy" ? "text-long" : "text-short")}>
                    {o.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className="px-4 py-2.5 capitalize text-muted">{o.type}</td>
                <td className="nums px-4 py-2.5 text-right">
                  {o.filledQuantity > 0 && o.filledQuantity < o.quantity ? (
                    <span>
                      {o.filledQuantity}
                      <span className="text-muted-2">/{o.quantity}</span>
                    </span>
                  ) : (
                    o.quantity
                  )}
                </td>
                <td className="nums px-4 py-2.5 text-right">
                  {o.price != null ? formatPrice(o.price, precision) : o.avgFillPrice != null ? formatPrice(o.avgFillPrice, precision) : "MKT"}
                </td>
                <td className="px-4 py-2.5">
                  <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                  {o.reason && <div className="mt-0.5 text-[10px] text-muted-2">{o.reason}</div>}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {cancellable ? (
                    <Button variant="danger" size="sm" onClick={() => cancelOrder(o.id)}>
                      Cancel
                    </Button>
                  ) : (
                    <span className="text-muted-2">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
