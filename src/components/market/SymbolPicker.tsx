"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMarketStore } from "@/store/market-store";
import { INSTRUMENTS } from "@/lib/constants";
import type { InstrumentCategory } from "@/lib/types";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: InstrumentCategory[] = ["Equity Index", "Energy", "Metals"];

/**
 * Searchable instrument selector (like a real trading platform's symbol search).
 * Lists every product by its resolved dated contract code (ES → ESM6) grouped by
 * category; selecting one sets the active symbol.
 */
export function SymbolPicker() {
  const selected = useMarketStore((s) => s.selectedSymbol);
  const codes = useMarketStore((s) => s.contractCodes);
  const select = useMarketStore((s) => s.selectSymbol);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INSTRUMENTS.filter((i) => {
      if (!q) return true;
      const code = (codes[i.symbol] ?? i.symbol).toLowerCase();
      return i.symbol.toLowerCase().includes(q) || code.includes(q) || i.name.toLowerCase().includes(q);
    });
  }, [query, codes]);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: filtered.filter((i) => i.category === cat),
  })).filter((g) => g.items.length > 0);

  const selCode = codes[selected] ?? selected;
  const selName = INSTRUMENTS.find((i) => i.symbol === selected)?.name ?? "";

  function choose(symbol: string) {
    select(symbol);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-left hover:border-border-strong"
      >
        <Icon name="search" width={15} height={15} className="text-muted-2" />
        <div className="leading-tight">
          <div className="nums text-sm font-semibold">{selCode}</div>
          <div className="text-[10px] text-muted-2">{selName}</div>
        </div>
        <Icon name="chevronDown" width={14} height={14} className="ml-1 text-muted" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[10vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[70vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Icon name="search" width={18} height={18} className="text-muted-2" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Select symbol…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-2 focus:outline-none"
              />
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-3 hover:text-foreground"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto">
              {grouped.map((g) => (
                <div key={g.cat}>
                  <div className="sticky top-0 bg-surface px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-2">
                    {g.cat}
                  </div>
                  {g.items.map((i) => {
                    const code = codes[i.symbol] ?? i.symbol;
                    const active = i.symbol === selected;
                    return (
                      <button
                        key={i.symbol}
                        onClick={() => choose(i.symbol)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors",
                          active ? "bg-primary/10" : "hover:bg-surface-2",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="nums text-sm font-semibold text-foreground">{code}</div>
                          <div className="truncate text-xs text-muted-2">{i.name}</div>
                        </div>
                        <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted">
                          {i.symbol}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {grouped.length === 0 && (
                <div className="px-3 py-10 text-center text-sm text-muted">No instruments match “{query}”.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
