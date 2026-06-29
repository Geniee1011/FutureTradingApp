"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type AutoscaleInfo,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";
import { getWsClient } from "@/lib/ws-client";
import { useMarketStore } from "@/store/market-store";
import { useOrdersStore } from "@/store/orders-store";
import { useAccountStore } from "@/store/account-store";
import { useThemeStore } from "@/store/theme-store";
import { getChartColors } from "@/lib/chart-theme";
import { getInstrument } from "@/lib/constants";
import type { Order, OrderType, Side } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";

const RESOLUTIONS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "1h", seconds: 3600 },
  { label: "1D", seconds: 86400 },
];

// Minimum bars before we reveal the chart (hide the loading spinner) and lock the
// initial fit. Below this we keep the spinner up and re-fit each frame, so the
// sparse "live bars only" first response from the backend isn't shown as a lonely
// 1–2 candle sliver while the full history backfills.
const REVEAL_MIN_BARS = 30;

// How many bars of history to request per resolution. 1m is sized to ~7 trading
// days (CME trades ~23h/day ≈ 1,380 one-minute bars/day); coarser frames cover
// proportionally longer spans. The backend widens its fetch window to match.
const HISTORY_COUNT: Record<number, number> = {
  60: 9600, // 1m  → ~7 trading days
  300: 4000, // 5m  → ~14 trading days
  900: 2000, // 15m → ~3 weeks
  3600: 1200, // 1h  → ~6 weeks
  86400: 500, // 1D  → ~2 years
};
const DEFAULT_HISTORY_COUNT = 500;

// Bars shown by default after a load / reset. The full history above stays scrollable
// to the left — this just keeps the opening view a readable recent window instead of
// squashing all ~7 days into hairline candles. 480 ≈ 8 hours at 1m.
const DEFAULT_VISIBLE_BARS = 480;

/** Pending click-to-trade ticket: chart pixel position + the price clicked. */
interface ChartTicket {
  x: number;
  y: number;
  price: number;
}

/** A level positioned on the chart: a working order (draggable) or the open position. */
interface LevelPos {
  lineKey: string; // key into orderLinesRef + the drag-override map
  orderId: string; // order id, or the symbol for a position
  role: "entry" | "SL" | "TP";
  isLeg: boolean; // true = a live exit leg on a filled position; false = pending entry / its bracket
  kind: "order" | "position"; // a working order vs the filled position's average-entry line
  draggable: boolean; // a filled position's entry line is shown but cannot be moved
  y: number; // pixel Y of the line
  price: number;
  side: Side;
  qty: number;
  type: OrderType;
  right: number; // px from the right edge (clears the price axis)
}

/** A dropped-but-unconfirmed drag awaiting the ✓/✗ inline confirm. */
type PendingConfirm =
  | { kind: "move"; lineKey: string; orderId: string; role: "entry" | "SL" | "TP"; isLeg: boolean; newPrice: number }
  | { kind: "add"; which: "SL" | "TP"; isPos: boolean; orderId: string; newPrice: number; entryPrice: number; side: Side; qty: number };

/** A shaded profit (entry↔TP) or risk (entry↔SL) zone behind a pending order. */
interface ZonePos {
  key: string;
  top: number; // pixel Y of the band's top
  height: number; // band height in px
  lineY: number; // pixel Y of the TP/SL line (where the P&L badge sits)
  pnl: number; // USD P&L if this level is reached (signed)
  right: number;
}

/**
 * Live candlestick + volume chart powered by lightweight-charts. Supports
 * "trade from chart": click a price level to get Buy/Sell buttons there. The
 * order type is inferred from the click price vs the market (above → Sell LIMIT
 * / Buy STOP; below → Sell STOP / Buy LIMIT), matching standard futures DOM UX.
 */
export function CandleChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lastCandleRef = useRef<CandlestickData<UTCTimestamp> | null>(null);
  const lastVolumeRef = useRef<HistogramData<UTCTimestamp> | null>(null);
  const barCountRef = useRef(0); // bars currently in the series — drives the default visible window
  const priceLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const orderLinesRef = useRef<Map<string, IPriceLine>>(new Map());
  // Active working-order price levels (entry + SL/TP) for THIS symbol, fed into the
  // candle series' autoscale so an order's bracket is included when the view fits —
  // otherwise a tightly-zoomed vertical range hides SL/TP that sit beyond the candles.
  const orderLevelsRef = useRef<number[]>([]);
  // Live price overrides while a level is being dragged, keyed by lineKey (orderId
  // for the entry/leg line, `${orderId}:SL` / `:TP` for a pending bracket leg). The
  // rAF loop positions the pills from these so a drag isn't snapped back by the
  // order's (still-unchanged) stored price until the modify persists.
  const dragOverrideRef = useRef<Map<string, number>>(new Map());
  // Active "drag to add SL/TP" gesture — drives a live preview zone (fill + USD P&L)
  // between the entry and the dragged level while +SL/+TP is being placed.
  const addDragRef = useRef<{ entryPrice: number; price: number; side: Side; qty: number } | null>(null);
  // A drag that's been dropped but is awaiting the trader's ✓/✗ confirm before it persists.
  const pendingConfirmRef = useRef<PendingConfirm | null>(null); // read by the rAF loop
  const addPreviewRef = useRef<IPriceLine | null>(null); // the +SL/+TP preview line, kept until confirm/cancel
  const lastTagsRef = useRef<string>("");
  const loadCleanupRef = useRef<(() => void) | null>(null);
  const [resolution, setResolution] = useState(60);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<ChartTicket | null>(null);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 }); // ticket drag offset from its anchor
  const [qty, setQty] = useState(1);
  const [slInput, setSlInput] = useState("");
  const [tpInput, setTpInput] = useState("");
  const [placed, setPlaced] = useState<string | null>(null);
  const [levels, setLevels] = useState<LevelPos[]>([]);
  const [zones, setZones] = useState<ZonePos[]>([]);
  const [pendingConfirm, setPendingConfirmState] = useState<PendingConfirm | null>(null);
  const setPending = (pc: PendingConfirm | null) => {
    pendingConfirmRef.current = pc; // keep the rAF-readable ref in sync with state
    setPendingConfirmState(pc);
  };
  // Order labels dismissed from the chart (hidden ONLY — the orders stay active).
  // Seeded from localStorage so dismissals survive a page refresh.

  // Clear the bracket inputs whenever the ticket closes.
  useEffect(() => {
    if (!ticket) {
      setSlInput("");
      setTpInput("");
    }
  }, [ticket]);

  const placeOrder = useOrdersStore((s) => s.placeOrder);
  const modifyOrder = useOrdersStore((s) => s.modifyOrder);
  const cancelOrder = useOrdersStore((s) => s.cancelOrder);
  const closePosition = useOrdersStore((s) => s.closePosition);
  const setPositionBracket = useOrdersStore((s) => s.setPositionBracket);
  const allOrders = useOrdersStore((s) => s.orders);
  const allPositions = useOrdersStore((s) => s.positions);
  const bracketRequired = useAccountStore((s) => s.summary?.rule?.stopLossRequired ?? false);
  const theme = useThemeStore((s) => s.theme);

  // Resting (working) limit/stop orders for this symbol — drawn on the chart as
  // draggable lines. Market orders fill instantly so never appear here.
  const visibleOrders = allOrders.filter(
    (o) => o.symbol === symbol && (o.status === "open" || o.status === "partial") && o.price != null,
  );
  // The open position for this symbol — drawn as a NON-draggable average-entry line so
  // the trader still sees where they got in once a working order fills (the order itself
  // leaves the book). Its SL/TP exit legs remain draggable (they're separate orders).
  const position = allPositions.find((p) => p.symbol === symbol && p.quantity > 0) ?? null;
  const visibleKey =
    visibleOrders
      .map((o) => `${o.id}:${o.price}:${o.side}:${o.type}:${o.bracketRole ?? ""}:${o.slPrice ?? ""}:${o.tpPrice ?? ""}`)
      .join("|") +
    "#" +
    (position ? `${position.side}:${position.avgPrice}:${position.quantity}` : "");
  const inst = getInstrument(symbol);
  const precision = inst?.pricePrecision ?? 2;
  const tickSize = inst?.tickSize ?? 0.01;
  const multiplier = inst?.multiplier ?? 1; // USD per 1.00 of price move, per contract
  const round = (p: number) => Math.round(p * 10 ** precision) / 10 ** precision;

  // Build the chart once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const c = getChartColors();
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: c.text,
        fontFamily: "var(--font-geist-mono), monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: c.grid },
        horzLines: { color: c.grid },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false },
      autoSize: true,
    });

    const candle = chart.addSeries(CandlestickSeries, {
      upColor: c.up,
      downColor: c.down,
      borderVisible: false,
      wickUpColor: c.up,
      wickDownColor: c.down,
      priceFormat: { type: "price", precision, minMove: 1 / 10 ** precision },
      // Extend the auto-fit range to include any working-order levels (entry/SL/TP),
      // so fitting the price scale never leaves a placed bracket off-screen.
      autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
        const res = original();
        const levels = orderLevelsRef.current;
        if (!res || !res.priceRange || levels.length === 0) return res;
        let { minValue, maxValue } = res.priceRange;
        for (const lv of levels) {
          minValue = Math.min(minValue, lv);
          maxValue = Math.max(maxValue, lv);
        }
        return { ...res, priceRange: { minValue, maxValue } };
      },
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: c.volume,
      lastValueVisible: false, // hide the floating volume value on the price axis
      priceLineVisible: false,
    });
    volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    // Click-to-trade: open a ticket at the clicked price level.
    chart.subscribeClick((param) => {
      if (!param.point || !candleRef.current) return;
      const price = candleRef.current.coordinateToPrice(param.point.y);
      if (price == null) return;
      setDragDelta({ x: 0, y: 0 }); // re-anchor each new ticket at the click point
      setTicket({ x: param.point.x, y: param.point.y, price: price as number });
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volumeRef.current = volume;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      priceLineRef.current = null;
      slLineRef.current = null;
      tpLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recolor the chart when the theme changes (no rebuild / data reload).
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const c = getChartColors();
    chart.applyOptions({
      layout: { textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    });
    candleRef.current?.applyOptions({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down });
    volumeRef.current?.applyOptions({ color: c.volume });
  }, [theme]);

  // Frame the opening view on the most recent `DEFAULT_VISIBLE_BARS` bars (the deep
  // history stays scrollable to the left), then release price auto-fit so vertical
  // panning works. Shared by the initial load and the reset-zoom button.
  const showDefaultView = useCallback((len: number) => {
    const chart = chartRef.current;
    if (!chart) return;
    if (len > DEFAULT_VISIBLE_BARS) {
      chart.timeScale().setVisibleLogicalRange({ from: len - DEFAULT_VISIBLE_BARS, to: len });
    } else {
      chart.timeScale().fitContent();
    }
    chart.priceScale("right").applyOptions({ autoScale: true });
    window.setTimeout(() => chartRef.current?.priceScale("right").applyOptions({ autoScale: false }), 60);
  }, []);

  // Load history for the current symbol/resolution, re-polling a few times until
  // the backend's background cache warms (its Historical-data hop can be slow/
  // rate-limited from some hosts). So the FIRST response can be thin (live bars
  // only); each response still renders, so the chart is never blank and fills in
  // on its own. `showSpinner` is true for the initial / symbol-change load and
  // false for a silent refresh (e.g. backfilling after the tab regains focus).
  const loadHistory = useCallback(
    (showSpinner: boolean) => {
      loadCleanupRef.current?.(); // cancel any in-flight load first
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let attempt = 0;
      let bestCount = 0;
      let noGrowth = 0; // consecutive polls that added no bars (deep backfill has landed)
      let framed = false; // recent-window framing locked once the deep history is in
      const target = HISTORY_COUNT[resolution] ?? DEFAULT_HISTORY_COUNT;
      if (showSpinner) setLoading(true);
      setTicket(null);

      // Symbol/resolution change (spinner load): drop the PREVIOUS instrument's
      // bars at once. Otherwise its (wrong-price) candles and locked price scale
      // linger on-screen until the new history arrives over the slow Historical
      // hop — e.g. switching to NQ briefly shows ES's ~7560 range. A silent
      // refresh (tab refocus) must NOT clear — that would blank a good chart.
      if (showSpinner) {
        candleRef.current?.setData([]);
        volumeRef.current?.setData([]);
        lastCandleRef.current = null;
        lastVolumeRef.current = null;
        chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
      }

      const render = (raw: { time: number; open: number; high: number; low: number; close: number; volume: number }[]) => {
        if (!candleRef.current || !volumeRef.current) return;
        // Drop any whitespace/invalid bars (non-finite or non-positive OHLC). Gaps in the
        // data (feed interruptions, weekends) are left as-is — lightweight-charts shows the
        // empty stretch rather than fabricating flat bars across it.
        const candles = raw.filter(
          (c) => Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close) && c.low > 0,
        );
        const candleData: CandlestickData<UTCTimestamp>[] = candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        const volData: HistogramData<UTCTimestamp>[] = candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? "#16c78455" : "#ea394355",
        }));
        candleRef.current.setData(candleData);
        volumeRef.current.setData(volData);
        barCountRef.current = candleData.length;
        lastCandleRef.current = candleData[candleData.length - 1] ?? null;
        lastVolumeRef.current = volData[volData.length - 1] ?? null;
        if (showSpinner && !framed) {
          // Frame a readable recent window (deep history stays scrollable to the left)
          // and release the price auto-fit so traders can pan vertically. RE-APPLY on
          // each frame while the data is still deepening: a shallow→deep load adds bars
          // on the LEFT, shifting logical indices, so a one-time fit would leave the
          // view pinned to the wrong bars once the full history lands. Re-anchoring to
          // the last N bars keeps the same recent time window (no visible jump). A
          // silent refresh (showSpinner=false) never re-frames — it keeps the user's view.
          showDefaultView(candleData.length);
          if (candleData.length >= target * 0.9 || candleData.length >= target - 1) framed = true;
        }
      };

      // Best response so far, held back (not painted) until we're ready to reveal —
      // so the sparse "live bars only" first frames never show behind the spinner.
      let latest: Parameters<typeof render>[0] = [];
      const poll = async () => {
        attempt += 1;
        const candles = await getWsClient()
          .getHistory(symbol, resolution, target)
          .catch(() => [] as Awaited<ReturnType<ReturnType<typeof getWsClient>["getHistory"]>>);
        if (cancelled) return;
        // Keep the most complete response so far — avoids flicker if a retry briefly
        // returns fewer bars. Track no-growth polls so we can stop once the deep
        // Historical window (warmed in the background) has fully landed.
        if (candles.length && candles.length >= bestCount) {
          noGrowth = candles.length > bestCount ? 0 : noGrowth + 1;
          bestCount = candles.length;
          latest = candles;
        } else {
          noGrowth += 1;
        }
        // Reveal once a real backfill has landed, OR after a few attempts so a slow/
        // thin Historical hop still surfaces something instead of spinning forever.
        // During a spinner load we DON'T paint before reveal, so the chart area stays
        // blank (not a 1–2 bar sliver) behind the overlay. A silent refresh has no
        // spinner, so it paints each response immediately as before.
        const reveal = bestCount >= REVEAL_MIN_BARS || attempt >= 3;
        if (latest.length && (!showSpinner || reveal)) render(latest);
        if (reveal) setLoading(false);
        // Keep polling while the deep history is still warming in the background: the
        // backend serves the shallow cache first and deepens it asynchronously, so the
        // first responses are short. Stop once we're near the requested depth, growth
        // has stalled (deep data landed or none more exists), or we hit the cap (~35s).
        const enough = bestCount >= target * 0.9;
        if (!enough && noGrowth < 3 && attempt < 12) {
          timer = setTimeout(poll, attempt < 4 ? 2000 : 4000);
        }
      };

      loadCleanupRef.current = () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
      void poll();
    },
    [symbol, resolution, showDefaultView],
  );

  // Initial load + whenever symbol/resolution changes.
  useEffect(() => {
    loadHistory(true);
    return () => loadCleanupRef.current?.();
  }, [loadHistory]);

  // Backfill the gap when returning to a backgrounded tab. Browsers throttle (or
  // pause) the quote-poll timer while the tab is hidden, so no candles form for
  // those minutes and the chart shows empty spaces. On regaining visibility,
  // silently re-pull history so the series is continuous again; the live quote
  // poll also resumes (and the backend re-creates the user's live session).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadHistory(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadHistory]);

  // Heal gaps from a dropped quote feed. The chart builds live bars from the quote
  // stream, so if the WS drops (even with the tab in the foreground) no bars form
  // for that span — leaving an empty stretch like 11:57–12:08. On RECONNECT, silently
  // re-pull history (the backend keeps a continuous server-side live-bar buffer) so
  // the gap fills in. Only fires on a real reconnect, not the initial connect.
  const wsStatus = useMarketStore((s) => s.status);
  const prevStatusRef = useRef(wsStatus);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = wsStatus;
    if (wsStatus === "connected" && (prev === "reconnecting" || prev === "disconnected")) {
      loadHistory(false);
    }
  }, [wsStatus, loadHistory]);

  // Self-heal gaps over time. A gap can form when neither side recorded bars for a
  // span (e.g. a brief backend live-stream drop). The backend's Historical backfill
  // fills that window within the following minutes, so a low-frequency silent re-pull
  // picks up the healed data and closes the gap — no user action needed. Gated on tab
  // visibility (the visibilitychange handler covers the return-to-foreground case).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") loadHistory(false);
    }, 60_000);
    return () => clearInterval(id);
  }, [loadHistory]);

  // Update the forming candle from the live quote.
  const quote = useMarketStore((s) => s.quotes[symbol]);
  useEffect(() => {
    if (!quote || !candleRef.current || loading) return;
    const price = quote.price;
    // Ignore quotes with no real price (e.g. a stale/empty snapshot when the market is
    // closed). Building a bar from one yields a NaN/zero-price candle that renders as an
    // empty slot — that's what opened the weekend "gap" between Fri close and Sun open.
    if (!Number.isFinite(price) || price <= 0) return;
    const bucket = (Math.floor(quote.ts / 1000 / resolution) * resolution) as UTCTimestamp;
    const last = lastCandleRef.current;

    const size = quote.lastSize ?? 0;
    const upColor = "#16c78455";
    const downColor = "#ea394355";

    let next: CandlestickData<UTCTimestamp>;
    let nextVol: HistogramData<UTCTimestamp>;
    if (!last || bucket > (last.time as number)) {
      next = { time: bucket, open: price, high: price, low: price, close: price };
      nextVol = { time: bucket, value: size, color: upColor }; // new bar opens flat → up tone
    } else {
      next = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      };
      // Accumulate this minute's traded size into the forming volume bar.
      const prevVol = lastVolumeRef.current?.time === last.time ? (lastVolumeRef.current?.value ?? 0) : 0;
      nextVol = { time: last.time, value: prevVol + size, color: price >= next.open ? upColor : downColor };
    }
    lastCandleRef.current = next;
    lastVolumeRef.current = nextVol;
    candleRef.current.update(next);
    volumeRef.current?.update(nextVol);
  }, [quote, resolution, loading]);

  // Draw / clear the dashed order line while a ticket is open.
  useEffect(() => {
    const series = candleRef.current;
    if (!series) return;
    if (priceLineRef.current) {
      series.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }
    if (ticket) {
      priceLineRef.current = series.createPriceLine({
        price: round(ticket.price),
        color: "#7c9cff",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "order",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  // Draw SL (red) / TP (green) preview lines from the tick inputs, anchored to the
  // clicked entry. Shown in the long orientation (SL below / TP above) so the
  // trader sees both levels live as they type; they flip naturally on a sell.
  useEffect(() => {
    const series = candleRef.current;
    if (!series) return;
    if (slLineRef.current) {
      series.removePriceLine(slLineRef.current);
      slLineRef.current = null;
    }
    if (tpLineRef.current) {
      series.removePriceLine(tpLineRef.current);
      tpLineRef.current = null;
    }
    if (!ticket) return;
    const slT = parseFloat(slInput) || 0;
    const tpT = parseFloat(tpInput) || 0;
    if (slT > 0) {
      slLineRef.current = series.createPriceLine({
        price: round(ticket.price - slT * tickSize),
        color: "#ea3943",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `SL ${slT}t`,
      });
    }
    if (tpT > 0) {
      tpLineRef.current = series.createPriceLine({
        price: round(ticket.price + tpT * tickSize),
        color: "#16c784",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `TP ${tpT}t`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, slInput, tpInput, tickSize]);

  // Draw a dashed price line per working order (green buy / red sell), with the
  // price on the axis. Re-created when the order set or any price changes.
  useEffect(() => {
    const series = candleRef.current;
    if (!series) return;
    const lines = orderLinesRef.current;
    const seen = new Set<string>();
    for (const o of visibleOrders) {
      seen.add(o.id);
      const prev = lines.get(o.id);
      if (prev) series.removePriceLine(prev);
      lines.set(
        o.id,
        series.createPriceLine({
          price: o.price as number,
          // Neutral blue for the entry — distinct from the green TP and red SL (and the
          // green last-price marker). Buy/sell is conveyed by the pill's BUY/SELL label.
          color: "#7c9cff",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: false, // the draggable pill carries the price label
        }),
      );
      // A working bracket entry carries its SL/TP until it fills (only then do the
      // real exit legs exist). Draw them as labelled preview lines so the trader
      // sees the protective levels they attached — SL red below, TP green above.
      const brackets: [string, number | null | undefined, string][] = [
        [`${o.id}:SL`, o.slPrice, "#ea3943"],
        [`${o.id}:TP`, o.tpPrice, "#16c784"],
      ];
      for (const [key, px, color] of brackets) {
        const prevB = lines.get(key);
        if (prevB) series.removePriceLine(prevB);
        if (px != null && px > 0) {
          seen.add(key);
          lines.set(
            key,
            series.createPriceLine({ price: px, color, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false }),
          );
        }
      }
    }
    // The filled position's average-entry line — solid blue (vs dashed for a working
    // order) so it reads as "you're in", and non-draggable.
    const posKey = `pos:${symbol}`;
    const prevPos = lines.get(posKey);
    if (prevPos) series.removePriceLine(prevPos);
    if (position) {
      seen.add(posKey);
      lines.set(
        posKey,
        series.createPriceLine({ price: position.avgPrice, color: "#7c9cff", lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: false }),
      );
    }
    // Remove lines for orders/positions that closed (no line / no axis label).
    for (const [id, line] of lines) {
      if (!seen.has(id)) {
        series.removePriceLine(line);
        lines.delete(id);
      }
    }
    // Feed the working-order + position levels into the autoscale provider.
    orderLevelsRef.current = [
      ...visibleOrders.flatMap((o) => [o.price, o.slPrice, o.tpPrice]),
      position?.avgPrice,
    ].filter((v): v is number => v != null && v > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  // Position the draggable order pills at each level's price. A rAF loop keeps them
  // aligned as the chart scrolls / auto-scales (lightweight-charts has no price-scale
  // event). While a level is being dragged, its price comes from dragOverrideRef so
  // the pill follows the cursor instead of snapping to the order's stored price.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const series = candleRef.current;
      if (series) {
        // Sit the pill just left of the price axis (whose width varies by price).
        const right = Math.round(chartRef.current?.priceScale("right").width() ?? 56) + 4;
        const ov = dragOverrideRef.current;
        // Y of a price, clamped to the chart edge when it's dragged off-range (otherwise
        // priceToCoordinate returns null and the zone/level silently vanishes near the top/bottom).
        const chartH = containerRef.current?.clientHeight ?? 0;
        const yAt = (price: number, ref: number): number => {
          const c = series.priceToCoordinate(price);
          return c != null ? (c as number) : price >= ref ? 0 : chartH;
        };
        const out: LevelPos[] = [];
        const push = (lineKey: string, orderId: string, role: LevelPos["role"], isLeg: boolean, base: number, o: Order) => {
          // Release a drag override once the persisted price has caught up to the dragged
          // value — this is what avoids a snap-back to the old price on drop: we keep the
          // override through the async modify, then drop it seamlessly when data matches.
          const ovv = ov.get(lineKey);
          if (ovv != null && Math.abs(ovv - base) < tickSize / 2) ov.delete(lineKey);
          const price = ov.get(lineKey) ?? base;
          const coord = series.priceToCoordinate(price);
          if (coord == null) return;
          out.push({ lineKey, orderId, role, isLeg, kind: "order", draggable: true, y: coord as number, price, side: o.side, qty: o.quantity, type: o.type, right });
        };
        // Drop overrides whose order/leg is gone (filled/cancelled) so they can't linger.
        const liveKeys = new Set<string>();
        for (const o of visibleOrders) {
          liveKeys.add(o.id);
          if (!o.bracketRole) {
            liveKeys.add(`${o.id}:SL`);
            liveKeys.add(`${o.id}:TP`);
          }
        }
        for (const k of ov.keys()) if (!liveKeys.has(k)) ov.delete(k);
        for (const o of visibleOrders) {
          if (o.bracketRole) {
            // A live exit leg on a filled position — draggable via its own price.
            push(o.id, o.id, o.bracketRole, true, o.price as number, o);
          } else {
            // A pending entry, plus its attached bracket SL/TP (not yet separate orders).
            push(o.id, o.id, "entry", false, o.price as number, o);
            if (o.slPrice != null && o.slPrice > 0) push(`${o.id}:SL`, o.id, "SL", false, o.slPrice, o);
            if (o.tpPrice != null && o.tpPrice > 0) push(`${o.id}:TP`, o.id, "TP", false, o.tpPrice, o);
          }
        }
        // The open position's average-entry line — shown but NOT draggable.
        if (position) {
          const py = series.priceToCoordinate(position.avgPrice);
          if (py != null)
            out.push({
              lineKey: `pos:${symbol}`, orderId: symbol, role: "entry", isLeg: false, kind: "position", draggable: false,
              y: py as number, price: position.avgPrice, side: position.side, qty: position.quantity, type: "market", right,
            });
        }
        // Synthetic level for a pending "add" confirm — gives the new SL/TP a pill so it can
        // carry the ✓/✗ (the preview line + zone are kept separately until confirm/cancel).
        const pcAdd = pendingConfirmRef.current;
        if (pcAdd?.kind === "add") {
          out.push({
            lineKey: "add-confirm", orderId: pcAdd.orderId, role: pcAdd.which, isLeg: false, kind: "order", draggable: false,
            y: yAt(pcAdd.newPrice, pcAdd.entryPrice), price: pcAdd.newPrice, side: pcAdd.side, qty: pcAdd.qty, type: "market", right,
          });
        }
        // Shaded profit (entry↔TP) / risk (entry↔SL) zones for pending entries, with the
        // USD P&L if the level is reached. Drag-aware via the same overrides as the lines.
        const zonesOut: ZonePos[] = [];
        for (const o of visibleOrders) {
          if (o.bracketRole || o.price == null) continue;
          const entryP = ov.get(o.id) ?? o.price;
          const ey = series.priceToCoordinate(entryP);
          if (ey == null) continue;
          const dir = o.side === "buy" ? 1 : -1;
          const band = (lineKey: string, base: number | null | undefined) => {
            if (base == null || base <= 0) return;
            const p = ov.get(lineKey) ?? base;
            const ly = yAt(p, entryP);
            const pnl = (p - entryP) * dir * o.quantity * multiplier;
            zonesOut.push({ key: lineKey, top: Math.min(ey, ly), height: Math.abs(ly - ey), lineY: ly, pnl, right });
          };
          band(`${o.id}:TP`, o.tpPrice);
          band(`${o.id}:SL`, o.slPrice);
        }
        // In a trade: zones from the position's average entry to each SL/TP exit leg, so
        // the estimated profit/loss stays visible after the order fills. Drag-aware (the
        // leg price comes from its override while dragging).
        if (position) {
          const entryP = position.avgPrice;
          const ey = series.priceToCoordinate(entryP);
          if (ey != null) {
            const dir = position.side === "buy" ? 1 : -1;
            for (const leg of visibleOrders) {
              if (!leg.bracketRole || leg.price == null) continue;
              const lp = ov.get(leg.id) ?? leg.price;
              const ly = yAt(lp, entryP);
              const pnl = (lp - entryP) * dir * position.quantity * multiplier;
              zonesOut.push({ key: `poszone:${leg.id}`, top: Math.min(ey, ly), height: Math.abs(ly - ey), lineY: ly, pnl, right });
            }
          }
        }
        // Live preview zone while dragging +SL/+TP to add a level.
        const ad = addDragRef.current;
        if (ad) {
          const ey = yAt(ad.entryPrice, ad.price);
          const ly = yAt(ad.price, ad.entryPrice);
          const dir = ad.side === "buy" ? 1 : -1;
          const pnl = (ad.price - ad.entryPrice) * dir * ad.qty * multiplier;
          zonesOut.push({ key: "add-preview", top: Math.min(ey, ly), height: Math.abs(ly - ey), lineY: ly, pnl, right });
        }
        const key =
          out.map((t) => `${t.lineKey}:${Math.round(t.y)}:${t.price}`).join("|") +
          "#" +
          zonesOut.map((z) => `${z.key}:${Math.round(z.top)}:${Math.round(z.height)}:${Math.round(z.pnl)}`).join("|");
        if (key !== lastTagsRef.current) {
          lastTagsRef.current = key;
          setLevels(out);
          setZones(zonesOut);
        }
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  // Close the ticket on Escape.
  useEffect(() => {
    if (!ticket) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTicket(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ticket]);

  const market = quote?.price ?? lastCandleRef.current?.close ?? 0;
  const ticketPrice = ticket ? round(ticket.price) : 0;
  const isAbove = ticketPrice >= market;
  const sellType: OrderType = isAbove ? "limit" : "stop";
  const buyType: OrderType = isAbove ? "stop" : "limit";

  async function submit(side: Side, asMarket = false) {
    if (!ticket) return;
    const type: OrderType = asMarket ? "market" : side === "sell" ? sellType : buyType;
    // Market orders fill at the live quote, so they carry no price level.
    const price = asMarket ? null : ticketPrice;
    const at = asMarket ? "MKT" : `${type.toUpperCase()} @ ${formatPrice(ticketPrice, precision)}`;
    const label = `${side === "buy" ? "Buy" : "Sell"} ${qty} ${symbol} ${at}`;
    // SL/TP entered as a tick distance from the entry, oriented to the side
    // (stop adverse, target favourable) — consistent with the order panel.
    const entry = asMarket ? market : ticketPrice;
    const slTicksN = parseFloat(slInput) || 0;
    const tpTicksN = parseFloat(tpInput) || 0;
    const stopDir = side === "buy" ? -1 : 1; // a long's stop sits below the entry
    const stopLoss = slTicksN > 0 ? round(entry + stopDir * slTicksN * tickSize) : null;
    const takeProfit = tpTicksN > 0 ? round(entry - stopDir * tpTicksN * tickSize) : null;
    setTicket(null);
    const res = await placeOrder({ symbol, side, type, quantity: qty, price, stopLoss, takeProfit });
    setPlaced(res.ok ? `✓ ${label}` : `✗ ${res.error ?? "Order rejected"}`);
    setTimeout(() => setPlaced(null), 3000);
    // A bracket's SL/TP can land outside a tightly-zoomed vertical range. After the
    // order (and its lines) land, re-fit the price scale ONCE — the autoscale provider
    // now includes the order levels — then release it so vertical panning still works.
    if (res.ok && (stopLoss != null || takeProfit != null)) {
      window.setTimeout(() => {
        const ps = chartRef.current?.priceScale("right");
        ps?.applyOptions({ autoScale: true });
        window.setTimeout(() => ps?.applyOptions({ autoScale: false }), 80);
      }, 250);
    }
  }

  // Zoom by scaling the visible logical range around its center.
  // factor < 1 zooms in (fewer bars), factor > 1 zooms out (more bars).
  const zoom = (factor: number) => {
    const ts = chartRef.current?.timeScale();
    const range = ts?.getVisibleLogicalRange();
    if (!ts || !range) return;
    const center = (range.from + range.to) / 2;
    const half = ((range.to - range.from) / 2) * factor;
    ts.setVisibleLogicalRange({ from: center - half, to: center + half });
  };
  const resetZoom = () => {
    // Back to the default recent window (not all ~7 days), then release price auto-fit.
    showDefaultView(barCountRef.current);
  };

  // Flip the popup to the left when clicking near the right edge.
  const flip = ticket && containerRef.current ? ticket.x > containerRef.current.clientWidth * 0.62 : false;

  // Drag the ticket by its header so it can be moved off the price action.
  function startTicketDrag(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const base = dragDelta;
    const onMove = (ev: MouseEvent) => setDragDelta({ x: base.x + (ev.clientX - startX), y: base.y + (ev.clientY - startY) });
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Move a working order's lightweight-charts line live during a drag.
  const applyLine = (lineKey: string, price: number) => {
    orderLinesRef.current.get(lineKey)?.applyOptions({ price });
  };
  const snap = (p: number) => Math.round(p / tickSize) * tickSize;

  // Drag a level (entry / SL / TP) directly on the chart. No confirmation — the drop
  // persists via modifyOrder. Entry, SL and TP each drag INDEPENDENTLY (moving the entry
  // does not drag the bracket). Filled-position exit legs drag via their own price.
  // Mirrors the startTicketDrag closure pattern.
  function startLevelDrag(e: React.MouseEvent, lvl: LevelPos) {
    e.preventDefault();
    e.stopPropagation();
    if (pendingConfirmRef.current) cancelPending(); // discard any unconfirmed drag first
    const series = candleRef.current;
    const container = containerRef.current;
    const o = visibleOrders.find((x) => x.id === lvl.orderId);
    if (!series || !container || !o || o.price == null) return;
    const ov = dragOverrideRef.current;

    const onMove = (ev: MouseEvent) => {
      const raw = series.coordinateToPrice(ev.clientY - container.getBoundingClientRect().top);
      if (raw == null) return;
      const price = snap(raw as number);
      // Each level moves independently — dragging the entry does NOT drag SL/TP with
      // it (they stay at their absolute prices, as in TradingView).
      ov.set(lvl.lineKey, price);
      applyLine(lvl.lineKey, price);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      const moved = ov.get(lvl.lineKey);
      if (moved == null) return; // never actually dragged
      // Don't persist yet — keep the override (line stays at the dragged price) and ask
      // the trader to ✓/✗ confirm. Accept commits; cancel snaps it back (see confirm/cancel).
      setPending({ kind: "move", lineKey: lvl.lineKey, orderId: o.id, role: lvl.role, isLeg: lvl.isLeg, newPrice: moved });
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Attach a bracket leg to a pending order. `priceOverride` (from the drag-to-add
  // gesture) sets the level; without it we default to 20 ticks off the entry, oriented
  // to the side (stop adverse, target favourable).
  async function addBracket(orderId: string, which: "SL" | "TP", priceOverride?: number) {
    const o = visibleOrders.find((x) => x.id === orderId);
    if (!o || o.price == null) return;
    const dir = o.side === "buy" ? 1 : -1;
    const offset = 20 * tickSize;
    const price = priceOverride ?? (which === "SL" ? round(o.price - dir * offset) : round(o.price + dir * offset));
    const res = await modifyOrder(orderId, which === "SL" ? { stopLoss: price } : { takeProfit: price });
    if (!res.ok) flash(`✗ ${res.error ?? "Could not add " + which}`);
  }

  // Attach a bracket leg to the OPEN position. `priceOverride` from the drag gesture, else
  // 20 ticks off the average entry; the trader can drag the leg further to fine-tune.
  async function addPositionBracket(which: "SL" | "TP", priceOverride?: number) {
    if (!position) return;
    const dir = position.side === "buy" ? 1 : -1;
    const offset = 20 * tickSize;
    const px = priceOverride ?? (which === "SL" ? round(position.avgPrice - dir * offset) : round(position.avgPrice + dir * offset));
    const res = await setPositionBracket(symbol, which === "SL" ? { stopLoss: px } : { takeProfit: px });
    if (!res.ok) flash(`✗ ${res.error ?? "Could not add " + which}`);
  }

  // Drag-to-add: press +SL/+TP and drag to place the level in one motion (a live preview
  // line follows the cursor). Drop persists it; a plain click (no drag) uses the default.
  function startAddBracketDrag(e: React.MouseEvent, t: LevelPos, which: "SL" | "TP") {
    e.preventDefault();
    e.stopPropagation();
    if (pendingConfirmRef.current) cancelPending(); // discard any unconfirmed drag first
    const series = candleRef.current;
    const container = containerRef.current;
    const isPos = t.kind === "position";
    const entryPrice = isPos ? position?.avgPrice : visibleOrders.find((o) => o.id === t.orderId)?.price;
    const side = isPos ? position?.side : t.side;
    if (!series || !container || entryPrice == null || side == null) return;
    const dir = side === "buy" ? 1 : -1;
    const offset = 20 * tickSize;
    const defaultPx = which === "SL" ? round(entryPrice - dir * offset) : round(entryPrice + dir * offset);
    const qty = isPos ? position!.quantity : visibleOrders.find((o) => o.id === t.orderId)?.quantity ?? 1;
    const preview = series.createPriceLine({
      price: defaultPx,
      color: which === "SL" ? "#ea3943" : "#16c784",
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      axisLabelVisible: true,
      title: which,
    });
    addDragRef.current = { entryPrice, price: defaultPx, side, qty }; // seeds the preview zone
    let dragged: number | undefined;

    const onMove = (ev: MouseEvent) => {
      const raw = series.coordinateToPrice(ev.clientY - container.getBoundingClientRect().top);
      if (raw == null) return;
      dragged = snap(raw as number);
      preview.applyOptions({ price: dragged });
      if (addDragRef.current) addDragRef.current.price = dragged;
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Don't add yet — keep the preview line + zone and ask for ✓/✗ confirm. Accept
      // creates the bracket; cancel discards it (so cancelling a brand-new SL = no SL).
      const finalPx = dragged ?? defaultPx;
      if (addDragRef.current) addDragRef.current.price = finalPx;
      addPreviewRef.current = preview; // kept until confirm/cancel removes it
      setPending({ kind: "add", which, isPos, orderId: t.orderId, newPrice: finalPx, entryPrice, side, qty });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ✓ confirm: persist the pending drag (move → modify; add → create the bracket).
  async function confirmPending() {
    const pc = pendingConfirmRef.current;
    if (!pc) return;
    if (pc.kind === "move") {
      const changes: { price?: number; stopLoss?: number; takeProfit?: number } = pc.isLeg
        ? { price: pc.newPrice }
        : pc.role === "SL"
          ? { stopLoss: pc.newPrice }
          : pc.role === "TP"
            ? { takeProfit: pc.newPrice }
            : { price: pc.newPrice };
      setPending(null); // the override stays until the rAF settles it against the saved price
      const res = await modifyOrder(pc.orderId, changes);
      if (!res.ok) {
        flash(`✗ ${res.error ?? "Modify failed"}`);
        revertMoveLine(pc);
      }
    } else {
      if (addPreviewRef.current) candleRef.current?.removePriceLine(addPreviewRef.current);
      addPreviewRef.current = null;
      addDragRef.current = null;
      setPending(null);
      if (pc.isPos) await addPositionBracket(pc.which, pc.newPrice);
      else await addBracket(pc.orderId, pc.which, pc.newPrice);
    }
  }

  // ✗ cancel: discard the pending drag and snap the line back to where it was.
  function cancelPending() {
    const pc = pendingConfirmRef.current;
    if (!pc) return;
    if (pc.kind === "move") revertMoveLine(pc);
    else {
      if (addPreviewRef.current) candleRef.current?.removePriceLine(addPreviewRef.current);
      addPreviewRef.current = null;
      addDragRef.current = null; // drop the preview zone
    }
    setPending(null);
  }

  // Restore a moved line to its persisted price (cancel, or a rejected confirm).
  function revertMoveLine(pc: Extract<PendingConfirm, { kind: "move" }>) {
    dragOverrideRef.current.delete(pc.lineKey);
    const o = useOrdersStore.getState().orders.find((x) => x.id === pc.orderId);
    const stored = pc.isLeg || pc.role === "entry" ? o?.price : pc.role === "SL" ? o?.slPrice : o?.tpPrice;
    if (stored != null) applyLine(pc.lineKey, stored);
  }

  // Remove a level: a pending bracket clears that field; an exit leg cancels the order.
  async function removeLevel(lvl: LevelPos) {
    const res = lvl.isLeg
      ? await cancelOrder(lvl.orderId)
      : await modifyOrder(lvl.orderId, lvl.role === "SL" ? { stopLoss: null } : { takeProfit: null });
    if (!res.ok) flash(`✗ ${res.error ?? "Remove failed"}`);
  }

  const flash = (msg: string) => {
    setPlaced(msg);
    setTimeout(() => setPlaced(null), 3000);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {RESOLUTIONS.map((r) => (
          <button
            key={r.seconds}
            onClick={() => setResolution(r.seconds)}
            className={cn(
              "rounded px-2 py-1 text-xs font-medium transition-colors",
              resolution === r.seconds ? "bg-surface-3 text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-2 sm:block">Click the chart to trade</span>
          <div className="flex items-center gap-1">
            <ZoomBtn onClick={() => zoom(0.7)} label="Zoom in">+</ZoomBtn>
            <ZoomBtn onClick={() => zoom(1.4)} label="Zoom out">−</ZoomBtn>
            <ZoomBtn onClick={resetZoom} label="Reset zoom">⤢</ZoomBtn>
          </div>
        </div>
      </div>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-2/50 backdrop-blur-sm">
            <span
              className="h-6 w-6 animate-spin rounded-full border-2 border-muted-2/30 border-t-primary"
              aria-hidden
            />
            <span className="text-xs font-medium text-muted">Loading chart…</span>
          </div>
        )}

        {placed && (
          <div
            className={cn(
              "absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-md border px-3 py-1 text-xs shadow",
              placed.startsWith("✗") ? "border-short/40 bg-short/15 text-short" : "border-long/40 bg-long/15 text-long",
            )}
          >
            {placed}
          </div>
        )}

        <div ref={containerRef} className="h-full w-full" />

        {/* Profit (entry↔TP, green) / risk (entry↔SL, red) zones behind a pending order.
            The colored band is semi-transparent (candles show through); the USD P&L badge
            sits ON the TP/SL line (left side, clear of the role/price pill on the right). */}
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {zones.map((z) => (
            <div key={z.key}>
              <div
                style={{ top: z.top, height: z.height }}
                className={cn("absolute left-0 right-0", z.pnl >= 0 ? "bg-long/10" : "bg-short/10")}
              />
              <div
                style={{ top: z.lineY, left: 4 }}
                className={cn(
                  "nums absolute -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-semibold shadow",
                  z.pnl >= 0 ? "bg-long/85 text-black" : "bg-short/85 text-white",
                )}
              >
                {z.pnl >= 0 ? "+" : "−"}
                {Math.abs(z.pnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
            </div>
          ))}
        </div>

        {/* Draggable order levels: entry + bracket SL/TP. Drag a pill up/down to move
            the level — no confirmation, it persists on drop. lightweight-charts draws
            the lines; these pills are the handles + labels + add/remove controls. */}
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          {levels.map((t) => {
            const isPosition = t.kind === "position";
            const isEntry = t.role === "entry";
            const o = visibleOrders.find((x) => x.id === t.orderId);
            // For a pending entry, SL/TP live on the order; for a position they're exit legs.
            const hasSl = isPosition ? visibleOrders.some((x) => x.bracketRole === "SL") : o?.slPrice != null && o.slPrice > 0;
            const hasTp = isPosition ? visibleOrders.some((x) => x.bracketRole === "TP") : o?.tpPrice != null && o.tpPrice > 0;
            // Position entry + working entry = neutral blue (distinct from green TP / red SL
            // / green price marker); SL = red, TP = green.
            const tone = isEntry ? "bg-[#7c9cff] text-black" : t.role === "SL" ? "bg-short/90 text-white" : "bg-long/90 text-black";
            const label = isPosition
              ? `${t.qty} ${t.side === "buy" ? "LONG" : "SHORT"}`
              : isEntry
                ? `${t.qty} ${t.side === "buy" ? "BUY" : "SELL"} ${t.type.toUpperCase()}`
                : t.role;
            const stop = (e: React.MouseEvent) => e.stopPropagation();
            // While in a position, a protective SL/TP leg can be moved (drag) but not
            // removed when the account requires brackets — so hide its delete control.
            const isPositionLeg = !isPosition && !isEntry;
            const lockBracket = isPositionLeg && bracketRequired && allPositions.some((p) => p.symbol === symbol);
            const isPending =
              pendingConfirm != null &&
              ((pendingConfirm.kind === "move" && pendingConfirm.lineKey === t.lineKey) ||
                (pendingConfirm.kind === "add" && t.lineKey === "add-confirm"));
            const canDrag = t.draggable && !isPending;
            // Live unrealised P&L for an open position (updates every quote tick — the
            // component re-renders on the quote selector). The entry price moves to the title.
            const posPnl = isPosition ? (market - t.price) * (t.side === "buy" ? 1 : -1) * t.qty * multiplier : 0;
            return (
              <div
                key={t.lineKey}
                style={{ top: t.y, right: t.right }}
                onMouseDown={canDrag ? (e) => startLevelDrag(e, t) : undefined}
                title={canDrag ? "Drag to move" : isPosition ? `Entry ${formatPrice(t.price, precision)}` : undefined}
                className={cn(
                  "pointer-events-auto absolute z-20 flex -translate-y-1/2 select-none items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold shadow",
                  canDrag ? "cursor-ns-resize" : "cursor-default",
                  isPending && "ring-2 ring-white/70",
                  tone,
                )}
              >
                <span>{label}</span>
                {isPosition ? (
                  <span
                    className={cn(
                      "nums rounded px-1 font-semibold",
                      posPnl >= 0 ? "bg-long/90 text-black" : "bg-short/90 text-white",
                    )}
                  >
                    {posPnl >= 0 ? "+" : "−"}
                    {Math.abs(posPnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                ) : (
                  <span className="nums opacity-90">{formatPrice(t.price, precision)}</span>
                )}
                {isPending ? (
                  <>
                    <button type="button" title="Confirm" onMouseDown={stop} onClick={confirmPending} className="inline-block rounded bg-black/25 px-1 leading-none transition-transform duration-150 hover:scale-125 hover:bg-black/45">
                      ✓
                    </button>
                    <button type="button" title="Cancel" onMouseDown={stop} onClick={cancelPending} className="inline-block rounded bg-black/25 px-1 leading-none transition-transform duration-150 hover:scale-125 hover:bg-black/45">
                      ✕
                    </button>
                  </>
                ) : (
                  <>
                    {isEntry && !hasSl && (
                      <button type="button" title="Drag to add stop loss" onMouseDown={(e) => startAddBracketDrag(e, t, "SL")} className="cursor-ns-resize rounded bg-black/20 px-1 leading-none hover:bg-black/35">
                        +SL
                      </button>
                    )}
                    {isEntry && !hasTp && (
                      <button type="button" title="Drag to add take profit" onMouseDown={(e) => startAddBracketDrag(e, t, "TP")} className="cursor-ns-resize rounded bg-black/20 px-1 leading-none hover:bg-black/35">
                        +TP
                      </button>
                    )}
                    {lockBracket ? (
                      <span title="Required while in a position — drag to move, can't be removed" className="cursor-default text-[10px] leading-none opacity-70">
                        🔒
                      </span>
                    ) : (
                      <button
                        type="button"
                        title={isPosition ? "Close position" : isEntry ? "Cancel order" : t.isLeg ? "Cancel this leg" : `Remove ${t.role}`}
                        onMouseDown={stop}
                        onClick={() => (isPosition ? closePosition(symbol) : isEntry ? cancelOrder(t.orderId) : removeLevel(t))}
                        className="inline-block text-[11px] leading-none opacity-80 transition-transform duration-150 ease-out hover:scale-150 hover:rotate-90 hover:opacity-100 active:scale-95"
                      >
                        ✕
                      </button>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {ticket && (
          <div
            className="absolute z-20"
            style={{
              left: ticket.x,
              top: ticket.y,
              transform: `translate(calc(${flip ? "-100% - 14px" : "14px"} + ${dragDelta.x}px), calc(-50% + ${dragDelta.y}px))`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex w-52 flex-col gap-1 rounded-lg border border-border-strong bg-surface-2/95 p-1.5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between px-0.5">
                <div
                  className="flex flex-1 cursor-move select-none items-center gap-1"
                  onMouseDown={startTicketDrag}
                  title="Drag to move"
                >
                  <span className="text-[11px] leading-none text-muted-2">⠿</span>
                  <span className="nums text-[11px] text-muted">@ {formatPrice(ticketPrice, precision)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <QtyBtn onClick={() => setQty((q) => Math.max(1, q - 1))}>−</QtyBtn>
                  <span className="nums w-5 text-center text-xs font-medium">{qty}</span>
                  <QtyBtn onClick={() => setQty((q) => q + 1)}>+</QtyBtn>
                  <button
                    onClick={() => setTicket(null)}
                    className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-muted hover:bg-surface-3 hover:text-foreground"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Optional bracket: SL / TP placed on entry fill. */}
              <div className="grid grid-cols-2 gap-1">
                <input
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  placeholder="SL ticks"
                  className="nums w-full rounded border border-border bg-surface px-1.5 py-1 text-[11px] text-foreground placeholder:text-muted-2 focus:border-primary/60 focus:outline-none"
                />
                <input
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  placeholder="TP ticks"
                  className="nums w-full rounded border border-border bg-surface px-1.5 py-1 text-[11px] text-foreground placeholder:text-muted-2 focus:border-primary/60 focus:outline-none"
                />
              </div>

              <button
                onClick={() => submit("sell")}
                className="rounded-md bg-short px-2 py-1.5 text-center text-xs font-semibold text-white hover:brightness-110"
              >
                Sell {qty} {sellType.toUpperCase()} @ {formatPrice(ticketPrice, precision)}
              </button>
              <button
                onClick={() => submit("buy")}
                className="rounded-md bg-long px-2 py-1.5 text-center text-xs font-semibold text-black hover:brightness-110"
              >
                Buy {qty} {buyType.toUpperCase()} @ {formatPrice(ticketPrice, precision)}
              </button>

              {/* Market orders — ignore the clicked level, fill at the live quote. */}
              <div className="my-0.5 h-px bg-border-strong" />
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => submit("sell", true)}
                  className="rounded-md border border-short/50 px-2 py-1 text-xs font-semibold text-short hover:bg-short/15"
                >
                  Sell {qty} MKT
                </button>
                <button
                  onClick={() => submit("buy", true)}
                  className="rounded-md border border-long/50 px-2 py-1 text-xs font-semibold text-long hover:bg-long/15"
                >
                  Buy {qty} MKT
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ZoomBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-2 text-sm font-medium text-muted transition-colors hover:bg-surface-3 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-5 w-5 items-center justify-center rounded bg-surface-3 text-xs text-foreground hover:bg-border-strong"
    >
      {children}
    </button>
  );
}
