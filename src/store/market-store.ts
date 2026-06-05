"use client";

import { create } from "zustand";
import type { ConnectionStatus, OrderBook, Quote } from "@/lib/types";
import { DEFAULT_SYMBOL, INSTRUMENTS, WATCHLIST } from "@/lib/constants";
import { computeContractCode } from "@/lib/contract-code";
import { getWsClient } from "@/lib/ws-client";

interface MarketState {
  quotes: Record<string, Quote>;
  prevPrice: Record<string, number>; // for up/down flash
  orderbook: OrderBook | null;
  selectedSymbol: string;
  contractCodes: Record<string, string>; // root → dated code (e.g. ES → ESM6)
  status: ConnectionStatus;
  initialized: boolean;

  init: () => void;
  selectSymbol: (symbol: string) => void;
  loadInstruments: () => Promise<void>;
}

/** Symbols we currently have a live quote subscription for (non-reactive). */
const quoteSubs = new Set<string>();

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes: {},
  prevPrice: {},
  orderbook: null,
  selectedSymbol: DEFAULT_SYMBOL,
  contractCodes: {},
  status: "idle",
  initialized: false,

  init: () => {
    if (get().initialized) return;
    set({ initialized: true });

    const ws = getWsClient();
    ws.onStatus((status) => set({ status }));
    ws.onMessage((msg) => {
      if (msg.type === "quote") {
        const q: Quote = msg.data;
        set((s) => ({
          prevPrice: { ...s.prevPrice, [q.symbol]: s.quotes[q.symbol]?.price ?? q.price },
          quotes: { ...s.quotes, [q.symbol]: q },
        }));
      } else if (msg.type === "orderbook") {
        if (msg.data.symbol === get().selectedSymbol) set({ orderbook: msg.data });
      }
    });

    ws.connect();

    // Subscribe quotes only for the watchlist + selected symbol (keeps the
    // backend polling lean). The picker can list all instruments without prices.
    for (const sym of new Set<string>([...WATCHLIST, get().selectedSymbol])) {
      ws.subscribe("quotes", sym);
      quoteSubs.add(sym);
    }
    ws.subscribe("orderbook", get().selectedSymbol);

    void get().loadInstruments();
  },

  selectSymbol: (symbol) => {
    const prev = get().selectedSymbol;
    if (prev === symbol) return;
    const ws = getWsClient();

    ws.unsubscribe("orderbook", prev);
    ws.subscribe("orderbook", symbol);

    if (!quoteSubs.has(symbol)) {
      ws.subscribe("quotes", symbol);
      quoteSubs.add(symbol);
    }
    // Drop the previous symbol's quote stream unless it's a pinned favorite.
    if (!WATCHLIST.includes(prev) && prev !== symbol) {
      ws.unsubscribe("quotes", prev);
      quoteSubs.delete(prev);
    }

    set({ selectedSymbol: symbol, orderbook: null });
  },

  loadInstruments: async () => {
    // Seed with locally-computed codes so the UI is populated immediately.
    const now = new Date();
    const codes: Record<string, string> = {};
    for (const inst of INSTRUMENTS) codes[inst.symbol] = computeContractCode(inst.symbol, inst.category, now);
    set({ contractCodes: codes });

    // Override with backend-resolved (Databento-accurate) codes when available.
    const fetched = await getWsClient().getInstruments();
    if (fetched) {
      const merged = { ...get().contractCodes };
      for (const i of fetched) merged[i.symbol] = i.contractCode;
      set({ contractCodes: merged });
    }
  },
}));
