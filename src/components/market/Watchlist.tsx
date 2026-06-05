"use client";

import { useMarketStore } from "@/store/market-store";
import { WATCHLIST, getInstrument } from "@/lib/constants";
import type { Instrument } from "@/lib/types";
import { LivePrice } from "./LivePrice";
import { formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Watchlist of pinned favorites with live prices. Use SymbolPicker for the full list. */
export function Watchlist({ selectable = true }: { selectable?: boolean }) {
  const selected = useMarketStore((s) => s.selectedSymbol);
  const selectSymbol = useMarketStore((s) => s.selectSymbol);
  const quotes = useMarketStore((s) => s.quotes);
  const codes = useMarketStore((s) => s.contractCodes);
  const instruments = WATCHLIST.map(getInstrument).filter((i): i is Instrument => i != null);

  return (
    <div className="divide-y divide-border">
      {instruments.map((inst) => {
        const q = quotes[inst.symbol];
        const change = q?.change24h ?? 0;
        const active = selectable && selected === inst.symbol;
        return (
          <button
            key={inst.symbol}
            onClick={() => selectable && selectSymbol(inst.symbol)}
            className={cn(
              "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors",
              active ? "bg-surface-3" : "hover:bg-surface-2",
              !selectable && "cursor-default hover:bg-transparent",
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="nums text-sm font-medium">{codes[inst.symbol] ?? inst.symbol}</span>
                {active && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
              <div className="truncate text-xs text-muted-2">{inst.name}</div>
            </div>
            <div className="text-right">
              <LivePrice symbol={inst.symbol} className="text-sm" />
              <div
                className={cn(
                  "nums text-xs",
                  change > 0 ? "text-long" : change < 0 ? "text-short" : "text-muted",
                )}
              >
                {formatPercent(change)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
