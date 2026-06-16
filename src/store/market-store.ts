"use client";

import { create } from "zustand";
import type { ConnectionStatus, OrderBook, Quote } from "@/lib/types";
import { DEFAULT_SYMBOL, INSTRUMENTS, WS_URL } from "@/lib/constants";
import { computeContractCode } from "@/lib/contract-code";
import { getWsClient } from "@/lib/ws-client";
import { getAuthToken } from "@/store/auth-store";
import { isByoMode } from "@/store/market-data-store";

/** REST base of the TradingBackend (Model B per-user quote polling). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

/* Model B: poll the user's own quote endpoint for the selected symbol and push
   it into the store as a Quote, so the chart's forming-candle logic is unchanged
   (no shared WS market feed — that would be the wrong, simulated price in byo). */
let byoTimer: ReturnType<typeof setInterval> | null = null;
let byoSymbol = "";

async function pollByoQuote(symbol: string, apply: (q: Quote) => void) {
  const token = getAuthToken();
  if (!token || !API_BASE) return;
  try {
    const res = await fetch(`${API_BASE}/api/market-data/quote?symbol=${encodeURIComponent(symbol)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 204 = the user's Live session is still warming up (no trade yet) → keep last quote.
    if (res.status === 204 || !res.ok) return;
    const q = (await res.json()) as Quote; // full real-time quote (incl. 24h stats)
    if (q && typeof q.price === "number") apply(q);
  } catch {
    /* keep last quote */
  }
}

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
  /** Model B: poll the per-user REST quote endpoint for `symbol`. */
  watchByo: (symbol: string) => void;
}

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

    if (isByoMode()) {
      // Model B: no shared market feed — poll the selected symbol via the user's key.
      get().watchByo(get().selectedSymbol);
    } else {
      // Subscribe to the selected symbol's quotes. Position symbols are subscribed
      // by TraderProvider so their P&L stays live. (Subscriptions are
      // subscriber-driven, so the backend only streams what's actually shown.)
      ws.subscribe("quotes", get().selectedSymbol);
    }

    void get().loadInstruments();
  },

  selectSymbol: (symbol) => {
    const prev = get().selectedSymbol;
    if (prev === symbol) return;

    if (isByoMode()) {
      get().watchByo(symbol);
    } else {
      getWsClient().subscribe("quotes", symbol); // cumulative; ws-client de-dupes
    }

    set({ selectedSymbol: symbol, orderbook: null });
  },

  /** Start/replace the Model B quote poll for `symbol` (per-user REST feed). */
  watchByo: (symbol) => {
    if (byoTimer && byoSymbol === symbol) return;
    if (byoTimer) clearInterval(byoTimer);
    byoSymbol = symbol;
    const apply = (q: Quote) =>
      set((s) => ({
        prevPrice: { ...s.prevPrice, [q.symbol]: s.quotes[q.symbol]?.price ?? q.price },
        quotes: { ...s.quotes, [q.symbol]: q },
      }));
    void pollByoQuote(symbol, apply); // immediate
    // Snapshot is in-memory on the backend (cheap) — poll briskly for a live feel.
    byoTimer = setInterval(() => void pollByoQuote(byoSymbol, apply), 1500);
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
