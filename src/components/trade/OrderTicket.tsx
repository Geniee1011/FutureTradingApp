"use client";

import { useEffect, useState } from "react";
import { useOrdersStore } from "@/store/orders-store";
import { useMarketStore } from "@/store/market-store";
import { getInstrument } from "@/lib/constants";
import type { OrderType, Side, TimeInForce } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { formatCurrency, formatPrice, cn } from "@/lib/utils";

export function OrderTicket({ symbol }: { symbol: string }) {
  const placeOrder = useOrdersStore((s) => s.placeOrder);
  const quote = useMarketStore((s) => s.quotes[symbol]);
  const inst = getInstrument(symbol);
  const precision = inst?.pricePrecision ?? 2;

  const [side, setSide] = useState<Side>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [tif, setTif] = useState<TimeInForce>("GTC");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Prefill limit/stop price with the current market price when switching modes.
  useEffect(() => {
    if (type !== "market" && !price && quote) setPrice(quote.price.toFixed(precision));
  }, [type, quote, price, precision]);

  const qtyNum = parseFloat(quantity) || 0;
  const refPrice = type === "market" ? quote?.price ?? 0 : parseFloat(price) || 0;
  const notional = qtyNum * refPrice;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = placeOrder({
      symbol,
      side,
      type,
      quantity: qtyNum,
      price: type === "market" ? null : parseFloat(price),
      timeInForce: tif,
    });
    if (res.ok) {
      setFeedback({
        ok: true,
        msg: `${side === "buy" ? "Bought" : "Sold"} ${qtyNum} ${symbol} (${res.order!.status})`,
      });
      setQuantity("");
    } else {
      setFeedback({ ok: false, msg: res.error ?? "Order rejected" });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 p-3">
      {/* Buy / Sell toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setSide("buy")}
          className={cn(
            "rounded-md py-2 text-sm font-semibold transition-colors",
            side === "buy" ? "bg-long text-black" : "text-muted hover:text-foreground",
          )}
        >
          Buy / Long
        </button>
        <button
          type="button"
          onClick={() => setSide("sell")}
          className={cn(
            "rounded-md py-2 text-sm font-semibold transition-colors",
            side === "sell" ? "bg-short text-white" : "text-muted hover:text-foreground",
          )}
        >
          Sell / Short
        </button>
      </div>

      <div>
        <Label>Order type</Label>
        <Select value={type} onChange={(e) => setType(e.target.value as OrderType)}>
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
        </Select>
      </div>

      <div>
        <Label>Quantity (contracts)</Label>
        <Input
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="nums"
        />
      </div>

      {type !== "market" && (
        <div>
          <Label>{type === "stop" ? "Stop price" : "Limit price"} (USD)</Label>
          <Input
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="nums"
          />
        </div>
      )}

      <div>
        <Label>Time in force</Label>
        <Select value={tif} onChange={(e) => setTif(e.target.value as TimeInForce)}>
          <option value="GTC">Good til cancelled</option>
          <option value="DAY">Day</option>
          <option value="IOC">Immediate or cancel</option>
          <option value="FOK">Fill or kill</option>
        </Select>
      </div>

      <div className="space-y-1 rounded-lg bg-surface-2 px-3 py-2 text-xs">
        <Row label="Last price" value={quote ? formatPrice(quote.price, precision) : "—"} />
        <Row label="Order value" value={formatCurrency(notional)} />
        <Row label="Est. fee (0.05%)" value={formatCurrency(notional * 0.0005)} />
      </div>

      {feedback && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            feedback.ok ? "border-long/40 bg-long/10 text-long" : "border-short/40 bg-short/10 text-short",
          )}
        >
          {feedback.msg}
        </div>
      )}

      <Button type="submit" variant={side === "buy" ? "long" : "short"} size="lg" disabled={qtyNum <= 0}>
        {side === "buy" ? "Buy" : "Sell"} {symbol}
      </Button>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="nums text-foreground">{value}</span>
    </div>
  );
}
