"use client";

import { useEffect, useRef, useState } from "react";
import { useMarketStore } from "@/store/market-store";
import { getInstrument } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Live price that briefly flashes green/red on each tick. */
export function LivePrice({ symbol, className }: { symbol: string; className?: string }) {
  const quote = useMarketStore((s) => s.quotes[symbol]);
  const prevRef = useRef<number | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const inst = getInstrument(symbol);

  useEffect(() => {
    if (!quote) return;
    const prev = prevRef.current;
    if (prev != null && quote.price !== prev) {
      setFlash(quote.price > prev ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prevRef.current = quote.price;
      return () => clearTimeout(t);
    }
    prevRef.current = quote.price;
  }, [quote]);

  if (!quote) return <span className={cn("nums text-muted-2", className)}>—</span>;

  return (
    <span
      className={cn(
        "nums rounded px-1 transition-colors",
        flash === "up" && "flash-up text-long",
        flash === "down" && "flash-down text-short",
        className,
      )}
    >
      {formatPrice(quote.price, inst?.pricePrecision ?? 2)}
    </span>
  );
}
