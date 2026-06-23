"use client";

import { useEffect, useState, type ReactNode } from "react";
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

  const [type, setType] = useState<OrderType>("market");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [slTicks, setSlTicks] = useState("");
  const [tpTicks, setTpTicks] = useState("");
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
  const multiplier = inst?.multiplier ?? 1;
  const tickSize = inst?.tickSize ?? 0.01;

  // Convert a tick distance to an SL/TP price, oriented to the side: a stop sits
  // adverse to the trade (below a long / above a short), a target favourable.
  // Ticks are the native futures unit (e.g. 1 ES tick = 0.25 pt = $12.50).
  const ticksToPrice = (ticksStr: string, isStop: boolean, ts: Side, ref: number = refPrice) => {
    const t = parseFloat(ticksStr) || 0;
    if (t <= 0 || ref <= 0) return 0;
    const stopDir = ts === "buy" ? -1 : 1; // a long's stop is below the entry
    const dir = isStop ? stopDir : -stopDir;
    return ref + dir * t * tickSize;
  };

  // Resolve the active bracket to SL/TP prices for an order at `entry`, oriented to the
  // side. Returns nulls when the bracket toggle is off. Shared by the main Buy/Sell
  // buttons and the quick-trade buttons so both honour the bracket.
  const bracketFor = (orderSide: Side, entry: number) => ({
    sl: bracketOn && slTicks ? Number(ticksToPrice(slTicks, true, orderSide, entry).toFixed(precision)) || null : null,
    tp: bracketOn && tpTicks ? Number(ticksToPrice(tpTicks, false, orderSide, entry).toFixed(precision)) || null : null,
  });

  // Preview SL/TP (shown under the inputs + used for the risk/reward readout). With
  // no side toggle, preview uses the BUY orientation; the actual order re-orients to
  // whichever button is pressed. Risk magnitude is the same either way.
  const slPriceEff = bracketOn ? ticksToPrice(slTicks, true, "buy") : 0;
  const tpPriceEff = bracketOn ? ticksToPrice(tpTicks, false, "buy") : 0;

  // When the bracket is enabled (or the side flips while it's on), seed a sensible
  // 1:2 default (10-tick stop, 20-tick target). The trader fine-tunes from there.
  useEffect(() => {
    if (!bracketOn || refPrice <= 0) return;
    setSlTicks("10");
    setTpTicks("20");
    // Intentionally re-seed only on enable, not on every price tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracketOn]);

  // Live risk / reward for the active bracket (in account currency).
  const riskUsd = slPriceEff > 0 && refPrice > 0 ? Math.abs(refPrice - slPriceEff) * qtyNum * multiplier : 0;
  const rewardUsd = tpPriceEff > 0 && refPrice > 0 ? Math.abs(tpPriceEff - refPrice) * qtyNum * multiplier : 0;
  const rr = riskUsd > 0 ? rewardUsd / riskUsd : 0;

  async function submitOrder(orderSide: Side) {
    if (submitting) return;
    setSubmitting(true);
    // Orient the bracket to the side actually submitted (SL adverse, TP favourable).
    const { sl, tp } = bracketFor(orderSide, refPrice);
    const res = await placeOrder({
      symbol,
      side: orderSide,
      type,
      quantity: qtyNum,
      price: type === "market" ? null : parseFloat(price),
      timeInForce: tif,
      stopLoss: sl,
      takeProfit: tp,
    });
    setSubmitting(false);
    if (res.ok) {
      setFeedback({ ok: true, msg: `${orderSide === "buy" ? "Bought" : "Sold"} ${qtyNum} ${symbol}` });
      setQuantity("");
      setSlTicks("");
      setTpTicks("");
      setBracketOn(false);
    } else {
      setFeedback({ ok: false, msg: res.error ?? "Order rejected" });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  // One-click quick trade: MKT (market), Ask / Bid (limit at the live quote).
  // Buy-at-ask / sell-at-bid cross the spread (fill now); buy-at-bid / sell-at-ask
  // rest passively. Honours the bracket toggle (SL/TP attached relative to the
  // quick-trade entry: the live mark for MKT, the ask/bid for limit).
  async function quickOrder(orderSide: Side, mode: "mkt" | "ask" | "bid") {
    if (submitting) return;
    if (qtyNum <= 0) {
      setFeedback({ ok: false, msg: "Enter a quantity first." });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    const orderType: OrderType = mode === "mkt" ? "market" : "limit";
    const limitPrice = mode === "ask" ? quote?.ask : mode === "bid" ? quote?.bid : null;
    if (orderType === "limit" && !(typeof limitPrice === "number" && limitPrice > 0)) {
      setFeedback({ ok: false, msg: "No live bid/ask available yet." });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }
    const entry = mode === "mkt" ? quote?.price ?? 0 : (limitPrice as number);
    const { sl, tp } = bracketFor(orderSide, entry);
    setSubmitting(true);
    const res = await placeOrder({
      symbol,
      side: orderSide,
      type: orderType,
      quantity: qtyNum,
      price: orderType === "market" ? null : (limitPrice as number),
      timeInForce: tif,
      stopLoss: sl,
      takeProfit: tp,
    });
    setSubmitting(false);
    const label = `${orderSide === "buy" ? "Buy" : "Sell"} ${qtyNum} ${symbol} ${mode.toUpperCase()}`;
    setFeedback(res.ok ? { ok: true, msg: label } : { ok: false, msg: res.error ?? "Order rejected" });
    setTimeout(() => setFeedback(null), 4000);
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3 p-3">
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
            {/* SL/TP entered as a tick distance from the entry (futures-native).
                The resolved price shows under each field for reference. */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-short">Stop loss</Label>
                <TickInput value={slTicks} onChange={setSlTicks} tone="short" />
                <Hint>{slPriceEff > 0 ? `= ${formatPrice(slPriceEff, precision)}` : "ticks from entry"}</Hint>
              </div>
              <div>
                <Label className="text-long">Take profit</Label>
                <TickInput value={tpTicks} onChange={setTpTicks} tone="long" />
                <Hint>{tpPriceEff > 0 ? `= ${formatPrice(tpPriceEff, precision)}` : "ticks from entry"}</Hint>
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

      <div className="space-y-2 rounded-lg bg-surface-2 px-3 py-2 text-xs">
        {/* Bid / Ask — the live two-sided market (you buy at the ask, sell at the bid). */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-long/10 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-2">Bid</div>
            <div className="nums text-sm font-semibold text-long">
              {quote ? formatPrice(quote.bid, precision) : "—"}
            </div>
          </div>
          <div className="rounded-md bg-short/10 px-2 py-1.5 text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted-2">Ask</div>
            <div className="nums text-sm font-semibold text-short">
              {quote ? formatPrice(quote.ask, precision) : "—"}
            </div>
          </div>
        </div>
        <Row label="Last price" value={quote ? formatPrice(quote.price, precision) : "—"} />
      </div>

      {/* Quick trade: one-click entry at market / ask / bid for the entered qty. */}
      <div>
        <Label>Quick trade</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <QuickBtn tone="long" solid disabled={qtyNum <= 0 || submitting} onClick={() => quickOrder("buy", "mkt")}>
            Buy MKT
          </QuickBtn>
          <QuickBtn tone="short" solid disabled={qtyNum <= 0 || submitting} onClick={() => quickOrder("sell", "mkt")}>
            Sell MKT
          </QuickBtn>
          <QuickBtn tone="long" disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("buy", "ask")}>
            Buy Ask
          </QuickBtn>
          <QuickBtn tone="short" disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("sell", "ask")}>
            Sell Ask
          </QuickBtn>
          <QuickBtn tone="long" disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("buy", "bid")}>
            Buy Bid
          </QuickBtn>
          <QuickBtn tone="short" disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("sell", "bid")}>
            Sell Bid
          </QuickBtn>
        </div>
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

      {/* Direction is chosen here (replaces the old Buy/Sell toggle). */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="long"
          size="lg"
          loading={submitting}
          disabled={qtyNum <= 0}
          onClick={() => submitOrder("buy")}
        >
          Buy {symbol}
        </Button>
        <Button
          type="button"
          variant="short"
          size="lg"
          loading={submitting}
          disabled={qtyNum <= 0}
          onClick={() => submitOrder("sell")}
        >
          Sell {symbol}
        </Button>
      </div>
    </form>
  );
}

/** One-click quick-trade button: bright `solid` for MKT, muted for Ask/Bid; green long / red short. */
function QuickBtn({
  tone,
  solid = false,
  disabled,
  onClick,
  children,
}: {
  tone: "long" | "short";
  solid?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const styles = solid
    ? tone === "long"
      ? "bg-long text-black hover:brightness-110"
      : "bg-short text-white hover:brightness-110"
    : tone === "long"
      ? "bg-long/15 text-long hover:bg-long/25"
      : "bg-short/15 text-short hover:bg-short/25";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-md px-2 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        styles,
      )}
    >
      {children}
    </button>
  );
}

/** Numeric tick-count input with a trailing "ticks" unit label, tinted to side. */
function TickInput({ value, onChange, tone }: { value: string; onChange: (v: string) => void; tone: "short" | "long" }) {
  return (
    <div className="relative">
      <Input
        type="number"
        step="1"
        min="0"
        inputMode="numeric"
        placeholder="ticks"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "nums pr-11",
          tone === "short"
            ? "border-short/40 focus:border-short/70 focus:ring-short/30"
            : "border-long/40 focus:border-long/70 focus:ring-long/30",
        )}
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-2">
        ticks
      </span>
    </div>
  );
}

/** Small muted helper line under a bracket input (shows the value in the other unit). */
function Hint({ children }: { children: ReactNode }) {
  return <div className="nums mt-1 text-[10px] text-muted-2">{children}</div>;
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
