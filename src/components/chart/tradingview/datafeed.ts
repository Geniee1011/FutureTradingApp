/* ------------------------------------------------------------------ *
 * TradingView Charting Library datafeed adapter.
 *
 * Implements the (subset of the) IBasicDataFeed interface the proprietary
 * TradingView Charting Library expects, backed by our WS client / mock feed.
 *
 * The Charting Library itself is licensed and not redistributable, so it is
 * NOT bundled. To enable the advanced chart:
 *   1. Request access: https://www.tradingview.com/charting-library/
 *   2. Drop the library build into  public/charting_library/
 *   3. AdvancedChart will load it and hand it this datafeed.
 *
 * Until then the app uses CandleChart (lightweight-charts), which needs no
 * license and renders the same data.
 * ------------------------------------------------------------------ */

import { INSTRUMENTS, getInstrument } from "@/lib/constants";
import { getWsClient } from "@/lib/ws-client";
import type { ServerMessage } from "@/lib/types";

// Minimal structural types mirroring the Charting Library's datafeed API.
type ResolutionString = string;
interface Bar {
  time: number; // epoch ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
interface LibrarySymbolInfo {
  name: string;
  full_name: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  exchange: string;
  listed_exchange: string;
  format: "price";
  pricescale: number;
  minmov: number;
  has_intraday: boolean;
  supported_resolutions: ResolutionString[];
  volume_precision: number;
  data_status: string;
}

function resolutionToSeconds(resolution: ResolutionString): number {
  if (resolution === "D" || resolution === "1D") return 86400;
  if (resolution === "W") return 604800;
  const n = parseInt(resolution, 10);
  return Number.isFinite(n) ? n * 60 : 60;
}

interface Subscription {
  symbol: string;
  resolutionSec: number;
  lastBar: Bar | null;
  onTick: (bar: Bar) => void;
  unsubscribe: () => void;
}

/** Factory returning an object compatible with `new widget({ datafeed })`. */
export function createDatafeed() {
  const subscriptions = new Map<string, Subscription>();
  // Last bar per symbol:resolution, so realtime ticks continue from history.
  const lastBars = new Map<string, Bar>();

  return {
    onReady(callback: (config: unknown) => void) {
      setTimeout(
        () =>
          callback({
            supported_resolutions: ["1", "5", "15", "60", "240", "1D"],
            supports_marks: false,
            supports_timescale_marks: false,
            supports_time: true,
          }),
        0,
      );
    },

    searchSymbols(
      userInput: string,
      _exchange: string,
      _symbolType: string,
      onResult: (symbols: unknown[]) => void,
    ) {
      const q = userInput.toLowerCase();
      onResult(
        INSTRUMENTS.filter(
          (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
        ).map((i) => ({
          symbol: i.symbol,
          full_name: i.symbol,
          description: i.name,
          exchange: "TradingBackend",
          type: i.category,
        })),
      );
    },

    resolveSymbol(
      symbolName: string,
      onResolve: (info: LibrarySymbolInfo) => void,
      onError: (reason: string) => void,
    ) {
      const inst = getInstrument(symbolName);
      if (!inst) return onError("unknown symbol");
      const pricescale = 10 ** inst.pricePrecision;
      // minmov = ticks per price-scale unit, so minmov/pricescale = the real tick size
      // (ES/NQ 0.25 → 25, GC 0.1 → 1, CL 0.01 → 1, YM 1 → 1). Was hardcoded to 1 (→ 0.01).
      const minmov = Math.max(1, Math.round(inst.tickSize * pricescale));
      onResolve({
        name: inst.symbol,
        full_name: inst.symbol,
        description: inst.name,
        type: inst.category,
        session: "24x7",
        timezone: "Etc/UTC",
        exchange: "TradingBackend",
        listed_exchange: "TradingBackend",
        format: "price",
        pricescale,
        minmov,
        has_intraday: true,
        supported_resolutions: ["1", "5", "15", "60", "240", "1D"],
        volume_precision: 2,
        data_status: "streaming",
      });
    },

    async getBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      periodParams: { from: number; to: number; countBack: number; firstDataRequest: boolean },
      onResult: (bars: Bar[], meta: { noData: boolean }) => void,
      onError: (reason: string) => void,
    ) {
      // Our backend serves the latest N bars only (no from/to range), so we
      // only answer the first request and report no older data for paging.
      if (!periodParams.firstDataRequest) {
        onResult([], { noData: true });
        return;
      }
      try {
        const sec = resolutionToSeconds(resolution);
        const candles = await getWsClient().getHistory(
          symbolInfo.name,
          sec,
          Math.max(periodParams.countBack, 240),
        );
        const bars: Bar[] = candles.map((c) => ({
          time: c.time * 1000,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        }));
        if (bars.length) lastBars.set(`${symbolInfo.name}:${resolution}`, bars[bars.length - 1]!);
        onResult(bars, { noData: bars.length === 0 });
      } catch (e) {
        onError(String(e));
      }
    },

    subscribeBars(
      symbolInfo: LibrarySymbolInfo,
      resolution: ResolutionString,
      onTick: (bar: Bar) => void,
      listenerGuid: string,
    ) {
      const resolutionSec = resolutionToSeconds(resolution);
      const ws = getWsClient();
      const handler = (msg: ServerMessage) => {
        if (msg.type !== "quote" || msg.data.symbol !== symbolInfo.name) return;
        const sub = subscriptions.get(listenerGuid);
        if (!sub) return;
        const bucket = Math.floor(msg.data.ts / 1000 / resolutionSec) * resolutionSec * 1000;
        const price = msg.data.price;
        const last = sub.lastBar;
        const bar: Bar =
          !last || bucket > last.time
            ? { time: bucket, open: price, high: price, low: price, close: price, volume: 0 }
            : { ...last, high: Math.max(last.high, price), low: Math.min(last.low, price), close: price };
        sub.lastBar = bar;
        onTick(bar);
      };
      const unsubscribe = ws.onMessage(handler);
      subscriptions.set(listenerGuid, {
        symbol: symbolInfo.name,
        resolutionSec,
        lastBar: lastBars.get(`${symbolInfo.name}:${resolution}`) ?? null,
        onTick,
        unsubscribe,
      });
    },

    unsubscribeBars(listenerGuid: string) {
      subscriptions.get(listenerGuid)?.unsubscribe();
      subscriptions.delete(listenerGuid);
    },
  };
}

export type Datafeed = ReturnType<typeof createDatafeed>;
