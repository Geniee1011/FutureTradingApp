"use client";

import { useState } from "react";
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

export function OrdersTable({
  orders,
  limit,
  variant = "table",
}: {
  orders: Order[];
  limit?: number;
  variant?: "table" | "compact";
}) {
  const cancelOrder = useOrdersStore((s) => s.cancelOrder);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = limit ? orders.slice(0, limit) : orders;

  async function onCancel(id: string) {
    setPendingId(id);
    setError(null);
    const res = await cancelOrder(id);
    setPendingId(null);
    if (!res.ok) setError(res.error ?? "Cancel failed.");
  }

  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-muted">No orders to show.</div>;
  }

  // Compact card list for narrow panels (e.g. the trade page side column). The
  // full table forces a horizontal scroll AND wraps the order-ID UUID across
  // several lines, so only ~2 orders fit. Here each order is two tight lines with
  // no UUID (useless at a glance) — many fit at once.
  if (variant === "compact") {
    return (
      <div>
        {error && (
          <div className="border-b border-short/40 bg-short/10 px-4 py-2 text-xs text-short">{error}</div>
        )}
        <div className="divide-y divide-border/60">
          {rows.map((o) => {
            const precision = getInstrument(o.symbol)?.pricePrecision ?? 2;
            const cancellable = o.status === "open" || o.status === "partial";
            const priceLabel =
              o.price != null
                ? formatPrice(o.price, precision)
                : o.avgFillPrice != null
                  ? formatPrice(o.avgFillPrice, precision)
                  : "MKT";
            const qtyLabel =
              o.filledQuantity > 0 && o.filledQuantity < o.quantity
                ? `${o.filledQuantity}/${o.quantity}`
                : `${o.quantity}`;
            return (
              <div key={o.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-1.5 text-sm">
                    <span className="font-medium">{o.symbol}</span>
                    <span className={cn("font-medium", o.side === "buy" ? "text-long" : "text-short")}>
                      {o.side === "buy" ? "Buy" : "Sell"}
                    </span>
                    <span className="capitalize text-muted">{o.type}</span>
                    {o.bracketRole && <BracketTag role={o.bracketRole} />}
                  </div>
                  {cancellable ? (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={pendingId === o.id}
                      disabled={pendingId === o.id}
                      onClick={() => onCancel(o.id)}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-2">—</span>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="nums text-muted">
                    {qtyLabel} @ {priceLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[o.status]}>{o.status}</Badge>
                    <span className="nums text-muted-2">{formatTime(o.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="border-b border-short/40 bg-short/10 px-4 py-2 text-xs text-short">{error}</div>
      )}
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
            {/* Pinned right so the action stays visible in narrow cards. */}
            <th className="sticky right-0 z-10 bg-surface px-4 py-2.5 text-right font-medium shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.18)]">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => {
            const precision = getInstrument(o.symbol)?.pricePrecision ?? 2;
            const cancellable = o.status === "open" || o.status === "partial";
            return (
              <tr key={o.id} className="group border-b border-border/60 hover:bg-surface-2">
                <td className="nums px-4 py-2.5 text-muted">{formatTime(o.createdAt)}</td>
                <td className="nums px-4 py-2.5 text-xs text-muted-2">{o.id}</td>
                <td className="px-4 py-2.5 font-medium">{o.symbol}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("font-medium", o.side === "buy" ? "text-long" : "text-short")}>
                    {o.side === "buy" ? "Buy" : "Sell"}
                  </span>
                </td>
                <td className="px-4 py-2.5 capitalize text-muted">
                  {o.type}
                  {o.bracketRole && <BracketTag role={o.bracketRole} />}
                </td>
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
                <td className="sticky right-0 z-10 bg-surface px-4 py-2.5 text-right shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.18)] group-hover:bg-surface-2">
                  {cancellable ? (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={pendingId === o.id}
                      disabled={pendingId === o.id}
                      onClick={() => onCancel(o.id)}
                    >
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

/** Small tag marking a bracket exit leg as the stop-loss (red) or take-profit (green). */
function BracketTag({ role }: { role: "SL" | "TP" }) {
  return (
    <span
      className={cn(
        "ml-1.5 rounded px-1 py-0.5 align-middle text-[10px] font-semibold not-italic",
        role === "SL" ? "bg-short/15 text-short" : "bg-long/15 text-long",
      )}
    >
      {role}
    </span>
  );
}
