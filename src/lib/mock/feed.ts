/* ------------------------------------------------------------------ *
 * MockFeed — a self-contained simulated market data source.
 *
 * It produces the same ServerMessage shape the real TradingBackend WS is
 * expected to emit, so the UI is identical whether data comes from here or
 * from a live socket. Used by ws-client when NEXT_PUBLIC_WS_URL is unset.
 *
 * Runs on the client only (started by the WS client after mount), so using
 * Date.now()/Math.random() here is safe from hydration concerns.
 * ------------------------------------------------------------------ */

import { INSTRUMENTS, getInstrument } from "../constants";
import type { Candle, OrderBook, Quote, ServerMessage } from "../types";

type Listener = (msg: ServerMessage) => void;

interface SymbolState {
  price: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

const TICK_MS = 1000;

export class MockFeed {
  private listeners = new Set<Listener>();
  private state = new Map<string, SymbolState>();
  private subscribedQuotes = new Set<string>();
  private subscribedBooks = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    for (const inst of INSTRUMENTS) {
      this.state.set(inst.symbol, {
        price: inst.basePrice,
        open24h: inst.basePrice,
        high24h: inst.basePrice,
        low24h: inst.basePrice,
        volume24h: inst.basePrice * 1000,
      });
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribe(channel: string, symbol?: string) {
    if (channel === "quotes") {
      for (const s of symbol ? [symbol] : INSTRUMENTS.map((i) => i.symbol)) {
        this.subscribedQuotes.add(s);
        this.emitQuote(s); // immediate snapshot
      }
    } else if (channel === "orderbook" && symbol) {
      this.subscribedBooks.add(symbol);
      this.emitBook(symbol);
    }
  }

  unsubscribe(channel: string, symbol?: string) {
    if (channel === "quotes" && symbol) this.subscribedQuotes.delete(symbol);
    if (channel === "orderbook" && symbol) this.subscribedBooks.delete(symbol);
  }

  /** Historical candles for the chart datafeed. */
  getHistory(symbol: string, resolutionSec: number, count: number): Candle[] {
    const inst = getInstrument(symbol);
    const seed = inst?.basePrice ?? this.state.get(symbol)?.price ?? 100;
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - (now % resolutionSec) - (count - 1) * resolutionSec;

    const candles: Candle[] = [];
    let price = seed * 0.96; // start slightly below current and drift up
    const vol = seed * 0.004;
    for (let i = 0; i < count; i++) {
      const time = startTime + i * resolutionSec;
      const open = price;
      const drift = (this.state.get(symbol)?.price ?? seed) > seed ? 1 : 1;
      const move = (Math.random() - 0.48) * vol * drift;
      const close = Math.max(open + move, seed * 0.5);
      const high = Math.max(open, close) + Math.random() * vol * 0.5;
      const low = Math.min(open, close) - Math.random() * vol * 0.5;
      candles.push({
        time,
        open: round(open, inst?.pricePrecision ?? 2),
        high: round(high, inst?.pricePrecision ?? 2),
        low: round(low, inst?.pricePrecision ?? 2),
        close: round(close, inst?.pricePrecision ?? 2),
        volume: Math.round(Math.random() * 500 + 50),
      });
      price = close;
    }
    return candles;
  }

  /** Current price for a symbol (used to seed order fills, positions, etc.). */
  getPrice(symbol: string): number {
    return this.state.get(symbol)?.price ?? getInstrument(symbol)?.basePrice ?? 0;
  }

  private tick() {
    for (const symbol of this.subscribedQuotes) this.emitQuote(symbol);
    for (const symbol of this.subscribedBooks) this.emitBook(symbol);
  }

  private emitQuote(symbol: string) {
    const st = this.state.get(symbol);
    const inst = getInstrument(symbol);
    if (!st || !inst) return;

    // Random walk with mild mean reversion toward base price.
    const reversion = (inst.basePrice - st.price) * 0.002;
    const shock = (Math.random() - 0.5) * inst.basePrice * 0.0015;
    st.price = Math.max(st.price + reversion + shock, inst.basePrice * 0.2);
    st.high24h = Math.max(st.high24h, st.price);
    st.low24h = Math.min(st.low24h, st.price);
    st.volume24h += Math.random() * inst.basePrice * 0.5;

    const spread = st.price * 0.0002;
    const quote: Quote = {
      symbol,
      price: round(st.price, inst.pricePrecision),
      bid: round(st.price - spread, inst.pricePrecision),
      ask: round(st.price + spread, inst.pricePrecision),
      change24h: (st.price - st.open24h) / st.open24h,
      high24h: round(st.high24h, inst.pricePrecision),
      low24h: round(st.low24h, inst.pricePrecision),
      volume24h: Math.round(st.volume24h),
      ts: Date.now(),
    };
    this.emit({ type: "quote", data: quote });
  }

  private emitBook(symbol: string) {
    const st = this.state.get(symbol);
    const inst = getInstrument(symbol);
    if (!st || !inst) return;

    const mid = st.price;
    const tick = Math.max(mid * 0.0001, 10 ** -inst.pricePrecision);
    const bids = Array.from({ length: 12 }, (_, i) => ({
      price: round(mid - tick * (i + 1), inst.pricePrecision),
      size: round(Math.random() * 5 + 0.1, 3),
    }));
    const asks = Array.from({ length: 12 }, (_, i) => ({
      price: round(mid + tick * (i + 1), inst.pricePrecision),
      size: round(Math.random() * 5 + 0.1, 3),
    }));
    const book: OrderBook = { symbol, bids, asks, ts: Date.now() };
    this.emit({ type: "orderbook", data: book });
  }

  private emit(msg: ServerMessage) {
    for (const l of this.listeners) l(msg);
  }
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Singleton mock feed shared across the app. */
let singleton: MockFeed | null = null;
export function getMockFeed(): MockFeed {
  if (!singleton) singleton = new MockFeed();
  return singleton;
}
