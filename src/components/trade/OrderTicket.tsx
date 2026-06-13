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
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [bracketOn, setBracketOn] = useState(false);
  const [tif, setTif] = useState<TimeInForce>("GTC");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Prefill limit/stop price with the current market price when switching modes.
  useEffect(() => {
    if (type !== "market" && !price && quote) setPrice(quote.price.toFixed(precision));
  }, [type, quote, price, precision]);

  const qtyNum = parseFloat(quantity) || 0;
  const refPrice = type === "market" ? quote?.price ?? 0 : parseFloat(price) || 0;
  // Contract notional in USD = price × point value × qty (ES @ 7574 = $378,700/contract).
  const multiplier = inst?.multiplier ?? 1;
  const notional = qtyNum * refPrice * multiplier;

  // When the bracket is enabled (or the side flips while it's on), seed sensible
  // SL/TP levels around the entry — SL ~0.25% adverse, TP ~0.5% favourable (1:2),
  // oriented to the side. The trader can then fine-tune either field.
  useEffect(() => {
    if (!bracketOn || refPrice <= 0) return;
    const sl = side === "buy" ? refPrice * (1 - 0.0025) : refPrice * (1 + 0.0025);
    const tp = side === "buy" ? refPrice * (1 + 0.005) : refPrice * (1 - 0.005);
    setStopLoss(sl.toFixed(precision));
    setTakeProfit(tp.toFixed(precision));
    // Intentionally re-seed only on enable / side change, not on every price tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracketOn, side]);

  // Live risk / reward for the active bracket (in account currency).
  const slNum = parseFloat(stopLoss) || 0;
  const tpNum = parseFloat(takeProfit) || 0;
  const riskUsd = bracketOn && slNum > 0 && refPrice > 0 ? Math.abs(refPrice - slNum) * qtyNum * multiplier : 0;
  const rewardUsd = bracketOn && tpNum > 0 && refPrice > 0 ? Math.abs(tpNum - refPrice) * qtyNum * multiplier : 0;
  const rr = riskUsd > 0 ? rewardUsd / riskUsd : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const res = await placeOrder({
      symbol,
      side,
      type,
      quantity: qtyNum,
      price: type === "market" ? null : parseFloat(price),
      timeInForce: tif,
      stopLoss: bracketOn && stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: bracketOn && takeProfit ? parseFloat(takeProfit) : null,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedback({ ok: true, msg: `${side === "buy" ? "Bought" : "Sold"} ${qtyNum} ${symbol}` });
      setQuantity("");
      setStopLoss("");
      setTakeProfit("");
      setBracketOn(false);
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

      {/* Bracket strategy: protective stop-loss + take-profit, placed on entry fill.
          Toggle on to attach an SL/TP bracket; off sends a plain order. */}
      <div className="rounded-lg border border-border bg-surface-2">
        <button
          type="button"
          onClick={() => setBracketOn((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2.5"
          aria-pressed={bracketOn}
        >
          <span className="text-sm font-medium text-foreground">Stop loss / Take profit</span>
          <Switch on={bracketOn} />
        </button>

        {bracketOn && (
          <div className="space-y-3 border-t border-border px-3 py-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-short">Stop loss</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="price"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="nums border-short/40 focus:border-short/70 focus:ring-short/30"
                />
              </div>
              <div>
                <Label className="text-long">Take profit</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  placeholder="price"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="nums border-long/40 focus:border-long/70 focus:ring-long/30"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md bg-surface-3 px-2.5 py-1.5 text-xs">
              <span className="text-short">Risk {riskUsd > 0 ? formatCurrency(-riskUsd) : "—"}</span>
              <span className="nums text-muted">{rr > 0 ? `1 : ${rr.toFixed(1)}` : "R/R"}</span>
              <span className="text-long">Reward {rewardUsd > 0 ? formatCurrency(rewardUsd) : "—"}</span>
            </div>
          </div>
        )}
      </div>

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

      <Button
        type="submit"
        variant={side === "buy" ? "long" : "short"}
        size="lg"
        loading={submitting}
        disabled={qtyNum <= 0}
      >
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

/** Small on/off pill toggle used by the bracket header. */
function Switch({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        on ? "bg-primary" : "bg-surface-3",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </span>
  );
}
