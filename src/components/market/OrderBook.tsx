"use client";

import { useMarketStore } from "@/store/market-store";
import { getInstrument } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

/** Top-of-book depth ladder for the active symbol. */
export function OrderBook({ symbol }: { symbol: string }) {
  const book = useMarketStore((s) => s.orderbook);
  const quote = useMarketStore((s) => s.quotes[symbol]);
  const inst = getInstrument(symbol);
  const precision = inst?.pricePrecision ?? 2;

  if (!book || book.symbol !== symbol) {
    return <div className="flex h-full items-center justify-center text-xs text-muted">Loading book…</div>;
  }

  const asks = book.asks.slice(0, 10).reverse();
  const bids = book.bids.slice(0, 10);
  const maxSize = Math.max(...book.asks.slice(0, 10).map((l) => l.size), ...book.bids.slice(0, 10).map((l) => l.size), 1);

  return (
    <div className="flex h-full flex-col text-xs">
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-2">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 space-y-px">
        {asks.map((lvl, i) => (
          <Row key={`a${i}`} price={lvl.price} size={lvl.size} max={maxSize} precision={precision} side="ask" />
        ))}
      </div>

      <div className="border-y border-border px-3 py-1.5 text-center">
        <span className="nums text-sm font-semibold">
          {quote ? formatPrice(quote.price, precision) : "—"}
        </span>
        <span className="ml-2 text-[10px] text-muted-2">spread {quote ? formatPrice(quote.ask - quote.bid, precision) : "—"}</span>
      </div>

      <div className="flex-1 space-y-px">
        {bids.map((lvl, i) => (
          <Row key={`b${i}`} price={lvl.price} size={lvl.size} max={maxSize} precision={precision} side="bid" />
        ))}
      </div>
    </div>
  );
}

function Row({
  price,
  size,
  max,
  precision,
  side,
}: {
  price: number;
  size: number;
  max: number;
  precision: number;
  side: "bid" | "ask";
}) {
  const pct = Math.min(100, (size / max) * 100);
  return (
    <div className="relative grid grid-cols-3 px-3 py-0.5">
      <div
        className={`absolute inset-y-0 right-0 ${side === "ask" ? "bg-short/10" : "bg-long/10"}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`nums relative ${side === "ask" ? "text-short" : "text-long"}`}>
        {formatPrice(price, precision)}
      </span>
      <span className="nums relative text-right text-muted">{size.toFixed(3)}</span>
      <span className="nums relative text-right text-muted-2">{(price * size).toFixed(0)}</span>
    </div>
  );
}
