"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useOrdersStore } from "@/store/orders-store";
import { useMarketStore } from "@/store/market-store";
import { useAccountStore } from "@/store/account-store";
import { getInstrument } from "@/lib/constants";
import type { OrderType, Side, TimeInForce } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Field";
import { formatCurrency, formatPrice, cn } from "@/lib/utils";

/** Returned by the backend when the order risk exceeds the per-trade limit. */
interface Suggestion { symbol: string; quantity: number; risk: number }

export function OrderTicket({ symbol }: { symbol: string }) {
  const placeOrder = useOrdersStore((s) => s.placeOrder);
  const quote = useMarketStore((s) => s.quotes[symbol]);
  const rule = useAccountStore((s) => s.summary?.rule);
  const inst = getInstrument(symbol);
  const precision = inst?.pricePrecision ?? 2;

  // Per-trade risk cap from the account's rule (0 / undefined = no cap).
  const maxRiskPerTrade = rule?.maxRiskPerTrade ?? 0;

  const [type, setType] = useState<OrderType>("market");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [slTicks, setSlTicks] = useState("10");
  const [tpTicks, setTpTicks] = useState("20");
  const [tif, setTif] = useState<TimeInForce>("GTC");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pending micro-alternative suggestion (shown in an action dialog when the backend
  // blocks an order because it would exceed the max-risk-per-trade limit).
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    msg: string;
    suggestion: Suggestion;
    side: Side;
  } | null>(null);

  // Prefill limit/stop price with the current market price when switching modes.
  useEffect(() => {
    if (type !== "market" && !price && quote) setPrice(quote.price.toFixed(precision));
  }, [type, quote, price, precision]);

  const qtyNum = parseFloat(quantity) || 0;
  const refPrice = type === "market" ? quote?.price ?? 0 : parseFloat(price) || 0;
  const multiplier = inst?.multiplier ?? 1;
  const tickSize = inst?.tickSize ?? 0.01;

  // Convert a tick distance to an SL/TP price, oriented to the side.
  const ticksToPrice = (ticksStr: string, isStop: boolean, ts: Side, ref: number = refPrice) => {
    const t = parseFloat(ticksStr) || 0;
    if (t <= 0 || ref <= 0) return 0;
    const stopDir = ts === "buy" ? -1 : 1;
    const dir = isStop ? stopDir : -stopDir;
    return ref + dir * t * tickSize;
  };

  // Bracket as POSITIVE price offsets (ticks → price distance). Sent to the backend so the
  // SL/TP are anchored to the ACTUAL fill price — symmetric ticks stay symmetric even when a
  // market order fills a tick or two off the quote shown when the trader clicked.
  const bracketOffsets = () => ({
    slOffset: slTicks ? (parseFloat(slTicks) || 0) * tickSize || null : null,
    tpOffset: tpTicks ? (parseFloat(tpTicks) || 0) * tickSize || null : null,
  });

  // Preview SL/TP (shown under inputs + risk/reward readout), using BUY orientation.
  const slPriceEff = ticksToPrice(slTicks, true, "buy");
  const tpPriceEff = ticksToPrice(tpTicks, false, "buy");

  const riskUsd   = slPriceEff > 0 && refPrice > 0 ? Math.abs(refPrice - slPriceEff) * qtyNum * multiplier : 0;
  const rewardUsd = tpPriceEff > 0 && refPrice > 0 ? Math.abs(tpPriceEff - refPrice) * qtyNum * multiplier : 0;
  const rr = riskUsd > 0 ? rewardUsd / riskUsd : 0;

  // Proactively flag when the order's implied risk exceeds the per-trade cap.
  const overRisk = maxRiskPerTrade > 0 && riskUsd > maxRiskPerTrade;

  function showFeedback(ok: boolean, msg: string) {
    setFeedback({ ok, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function sendOrder(orderSide: Side, overrideSymbol?: string, overrideQty?: number) {
    if (submitting) return;
    setSubmitting(true);
    const sym = overrideSymbol ?? symbol;
    const qty = overrideQty ?? qtyNum;
    const res = await placeOrder({
      symbol: sym,
      side: orderSide,
      type,
      quantity: qty,
      price: type === "market" ? null : parseFloat(price),
      timeInForce: tif,
      ...bracketOffsets(),
    });
    setSubmitting(false);
    if (res.ok) {
      showFeedback(true, `${orderSide === "buy" ? "Bought" : "Sold"} ${qty} ${sym}`);
      setQuantity("");
      setSlTicks("10");
      setTpTicks("20");
      setPendingSuggestion(null);
    } else if (res.suggestion) {
      // Max-risk-per-trade exceeded → surface the micro alternative.
      setPendingSuggestion({ msg: res.error ?? "Order exceeds max risk.", suggestion: res.suggestion, side: orderSide });
    } else {
      showFeedback(false, res.error ?? "Order rejected");
    }
  }

  async function submitOrder(orderSide: Side) {
    setPendingSuggestion(null);
    await sendOrder(orderSide);
  }

  async function quickOrder(orderSide: Side, mode: "mkt" | "ask" | "bid") {
    if (submitting) return;
    if (qtyNum <= 0) { showFeedback(false, "Enter a quantity first."); return; }
    const orderType: OrderType = mode === "mkt" ? "market" : "limit";
    const limitPrice = mode === "ask" ? quote?.ask : mode === "bid" ? quote?.bid : null;
    if (orderType === "limit" && !(typeof limitPrice === "number" && limitPrice > 0)) {
      showFeedback(false, "No live bid/ask available yet.");
      return;
    }
    setSubmitting(true);
    const res = await placeOrder({
      symbol,
      side: orderSide,
      type: orderType,
      quantity: qtyNum,
      price: orderType === "market" ? null : (limitPrice as number),
      timeInForce: tif,
      ...bracketOffsets(),
    });
    setSubmitting(false);
    if (res.ok) {
      showFeedback(true, `${orderSide === "buy" ? "Buy" : "Sell"} ${qtyNum} ${symbol} ${mode.toUpperCase()}`);
    } else if (res.suggestion) {
      setPendingSuggestion({ msg: res.error ?? "Order exceeds max risk.", suggestion: res.suggestion, side: orderSide });
    } else {
      showFeedback(false, res.error ?? "Order rejected");
    }
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

      {/* Stop loss + Take profit — always visible; both are required by the rules. */}
      <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Stop loss / Take profit</span>
          <span className="text-xs text-muted-2">Required</span>
        </div>
        <div className="space-y-3">
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

          {/* Per-trade risk cap from the account rules — shown so the trader sees the limit
              before submitting, and turns red when the current order would breach it. */}
          {maxRiskPerTrade > 0 && (
            <div
              className={cn(
                "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs",
                overRisk ? "bg-short/15 text-short" : "bg-surface-3 text-muted",
              )}
            >
              <span>Max risk / trade</span>
              <span className="nums font-medium">
                {formatCurrency(maxRiskPerTrade)}
                {overRisk && " · over limit"}
              </span>
            </div>
          )}
        </div>
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

      <div>
        <Label>Quick trade</Label>
        <div className="grid grid-cols-2 gap-1.5">
          <QuickBtn tone="long"  solid disabled={qtyNum <= 0 || submitting} onClick={() => quickOrder("buy",  "mkt")}>Buy MKT</QuickBtn>
          <QuickBtn tone="short" solid disabled={qtyNum <= 0 || submitting} onClick={() => quickOrder("sell", "mkt")}>Sell MKT</QuickBtn>
          <QuickBtn tone="long"       disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("buy",  "ask")}>Buy Ask</QuickBtn>
          <QuickBtn tone="short"      disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("sell", "ask")}>Sell Ask</QuickBtn>
          <QuickBtn tone="long"       disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("buy",  "bid")}>Buy Bid</QuickBtn>
          <QuickBtn tone="short"      disabled={qtyNum <= 0 || submitting || !quote} onClick={() => quickOrder("sell", "bid")}>Sell Bid</QuickBtn>
        </div>
      </div>

      {/* Max-risk-per-trade suggestion — pinned to the TOP of the page as a fixed banner
          (centered, above the content) so it can't be missed, instead of tucked beside the
          order buttons. Two-button: place the suggested micros or cancel. */}
      {pendingSuggestion && (
        <div className="fixed inset-x-0 top-28 z-50 flex justify-center px-4">
          <div className="w-full max-w-md rounded-lg border border-warning/50 bg-surface-2 px-4 py-3 text-xs shadow-2xl">
            <p className="mb-2 font-medium text-warning">{pendingSuggestion.msg}</p>
            <p className="mb-3 text-muted">
              Suggested alternative: {pendingSuggestion.suggestion.quantity} {pendingSuggestion.suggestion.symbol} micros
              (risk {formatCurrency(pendingSuggestion.suggestion.risk)})
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  const { suggestion, side } = pendingSuggestion;
                  void sendOrder(side, suggestion.symbol, suggestion.quantity);
                }}
                className="rounded-md bg-primary px-3 py-1.5 font-semibold text-white hover:brightness-110 disabled:opacity-50"
              >
                Place {pendingSuggestion.suggestion.quantity} {pendingSuggestion.suggestion.symbol} micros
              </button>
              <button
                type="button"
                onClick={() => setPendingSuggestion(null)}
                className="rounded-md border border-border px-3 py-1.5 text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

function QuickBtn({
  tone, solid = false, disabled, onClick, children,
}: { tone: "long" | "short"; solid?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  const styles = solid
    ? tone === "long"  ? "bg-long text-black hover:brightness-110"  : "bg-short text-white hover:brightness-110"
    : tone === "long"  ? "bg-long/15 text-long hover:bg-long/25"    : "bg-short/15 text-short hover:bg-short/25";
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
