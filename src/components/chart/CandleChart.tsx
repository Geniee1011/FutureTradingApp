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
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from "lightweight-charts";
import { getWsClient } from "@/lib/ws-client";
import { useMarketStore } from "@/store/market-store";
import { useOrdersStore } from "@/store/orders-store";
import { useThemeStore } from "@/store/theme-store";
import { getChartColors } from "@/lib/chart-theme";
import { getInstrument } from "@/lib/constants";
import type { OrderType, Side } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";

const RESOLUTIONS = [
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "15m", seconds: 900 },
  { label: "1h", seconds: 3600 },
  { label: "1D", seconds: 86400 },
];

// Order labels the trader dismissed from the chart, persisted so they stay hidden
// across reloads (component state alone resets on refresh). Keyed by order id.
const HIDDEN_LABELS_KEY = "tp.hiddenOrderLabels";
function loadHiddenLabels(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(HIDDEN_LABELS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
function saveHiddenLabels(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIDDEN_LABELS_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage disabled / over quota — non-fatal */
  }
}

/** Pending click-to-trade ticket: chart pixel position + the price clicked. */
interface ChartTicket {
  x: number;
  y: number;
  price: number;
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
  const priceLineRef = useRef<IPriceLine | null>(null);
  const slLineRef = useRef<IPriceLine | null>(null);
  const tpLineRef = useRef<IPriceLine | null>(null);
  const orderLinesRef = useRef<Map<string, IPriceLine>>(new Map());
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
  const [orderTags, setOrderTags] = useState<{ id: string; y: number; side: Side; label: string; right: number }[]>([]);
  // Order labels dismissed from the chart (hidden ONLY — the orders stay active).
  // Seeded from localStorage so dismissals survive a page refresh.
  const [hiddenTagIds, setHiddenTagIds] = useState<Set<string>>(loadHiddenLabels);

  // Clear the bracket inputs whenever the ticket closes.
  useEffect(() => {
    if (!ticket) {
      setSlInput("");
      setTpInput("");
    }
  }, [ticket]);

  const placeOrder = useOrdersStore((s) => s.placeOrder);
  const allOrders = useOrdersStore((s) => s.orders);
  const theme = useThemeStore((s) => s.theme);

  // Resting (working) limit/stop orders for this symbol — drawn on the chart as
  // cancellable lines (DOM-style). Market orders fill instantly so never appear.
  const openOrders = allOrders.filter(
    (o) => o.symbol === symbol && (o.status === "open" || o.status === "partial") && o.price != null,
  );
  // Hidden orders are dropped entirely from the chart — no line, no axis label, no tag.
  const visibleOrders = openOrders.filter((o) => !hiddenTagIds.has(o.id));
  const visibleKey = visibleOrders
    .map((o) => `${o.id}:${o.price}:${o.side}:${o.type}:${o.bracketRole ?? ""}`)
    .join("|");
  const inst = getInstrument(symbol);
  const precision = inst?.pricePrecision ?? 2;
  const tickSize = inst?.tickSize ?? 0.01;
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
    });

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: c.volume,
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
      let fitted = !showSpinner; // only auto-fit on a spinner load — never yank the view on a silent refresh
      if (showSpinner) setLoading(true);
      setTicket(null);

      const render = (candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[]) => {
        if (!candleRef.current || !volumeRef.current) return;
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
        lastCandleRef.current = candleData[candleData.length - 1] ?? null;
        lastVolumeRef.current = volData[volData.length - 1] ?? null;
        if (!fitted) {
          chartRef.current?.timeScale().fitContent();
          fitted = true;
        }
      };

      const poll = async () => {
        attempt += 1;
        const candles = await getWsClient()
          .getHistory(symbol, resolution, 240)
          .catch(() => [] as Awaited<ReturnType<ReturnType<typeof getWsClient>["getHistory"]>>);
        if (cancelled) return;
        // Only replace the series when this response is at least as complete as the
        // best so far — avoids flicker if a retry briefly returns fewer bars.
        if (candles.length && candles.length >= bestCount) {
          bestCount = candles.length;
          render(candles);
          setLoading(false);
        } else if (!candles.length && attempt === 1) {
          setLoading(false); // nothing yet, but stop blocking the view
        }
        // Keep polling until we have a substantial backfill (or give up after ~40s).
        if (bestCount < 60 && attempt < 9) {
          timer = setTimeout(poll, attempt < 3 ? 2500 : 5000);
        }
      };

      loadCleanupRef.current = () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
      void poll();
    },
    [symbol, resolution],
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

  // Update the forming candle from the live quote.
  const quote = useMarketStore((s) => s.quotes[symbol]);
  useEffect(() => {
    if (!quote || !candleRef.current || loading) return;
    const bucket = (Math.floor(quote.ts / 1000 / resolution) * resolution) as UTCTimestamp;
    const last = lastCandleRef.current;
    const price = quote.price;

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
          color: o.side === "buy" ? "#16c784" : "#ea3943",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: "",
        }),
      );
    }
    // Remove lines for orders that closed OR were hidden (no line / no axis label).
    for (const [id, line] of lines) {
      if (!seen.has(id)) {
        series.removePriceLine(line);
        lines.delete(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  // Position the HTML cancel tags at each order's price. A rAF loop keeps them
  // aligned as the chart scrolls / auto-scales (lightweight-charts has no
  // price-scale event); setState only fires when a rounded Y actually changes.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const series = candleRef.current;
      if (series) {
        // Sit the tag just left of the price axis (whose width varies by price).
        const right = Math.round(chartRef.current?.priceScale("right").width() ?? 56) + 4;
        const tags = visibleOrders
          .map((o) => {
            const coord = series.priceToCoordinate(o.price as number);
            if (coord == null) return null;
            const abbr = o.type === "limit" ? "LMT" : o.type === "stop" ? "STP" : "MKT";
            const role = o.bracketRole ? ` ${o.bracketRole}` : "";
            const label = `${o.quantity} ${o.side === "buy" ? "BUY" : "SELL"} ${abbr}${role}`;
            return { id: o.id, y: coord as number, side: o.side, label, right };
          })
          .filter((t): t is { id: string; y: number; side: Side; label: string; right: number } => t !== null);
        const key = tags.map((t) => `${t.id}:${Math.round(t.y)}:${t.right}`).join("|");
        if (key !== lastTagsRef.current) {
          lastTagsRef.current = key;
          setOrderTags(tags);
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
  const resetZoom = () => chartRef.current?.timeScale().fitContent();

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
          <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-muted">
            Loading chart…
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

        {/* Working-order tags at each order's price line (right side, near the axis).
            The ✕ HIDES the label only — it does NOT cancel the order. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {orderTags.map((t) => (
              <div
                key={t.id}
                style={{ top: t.y, right: t.right }}
                className={cn(
                  "pointer-events-auto absolute z-20 flex -translate-y-1/2 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold shadow",
                  t.side === "buy" ? "bg-long/90 text-black" : "bg-short/90 text-white",
                )}
              >
                <button
                  type="button"
                  title="Hide this label"
                  onClick={() =>
                    setHiddenTagIds((prev) => {
                      const next = new Set(prev).add(t.id);
                      saveHiddenLabels(next);
                      return next;
                    })
                  }
                  className="text-[11px] leading-none opacity-80 hover:opacity-100"
                >
                  ✕
                </button>
                {t.label}
              </div>
            ))}
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
            <div className="flex w-44 flex-col gap-1 rounded-lg border border-border-strong bg-surface-2/95 p-1.5 shadow-2xl backdrop-blur">
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
                className="rounded-md bg-short px-2 py-1.5 text-left text-xs font-semibold text-white hover:brightness-110"
              >
                Sell {qty} {sellType.toUpperCase()} @ {formatPrice(ticketPrice, precision)}
              </button>
              <button
                onClick={() => submit("buy")}
                className="rounded-md bg-long px-2 py-1.5 text-left text-xs font-semibold text-black hover:brightness-110"
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
