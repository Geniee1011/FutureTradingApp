"use client";

import { useEffect, useRef, useState } from "react";
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
  const priceLineRef = useRef<IPriceLine | null>(null);
  const [resolution, setResolution] = useState(60);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<ChartTicket | null>(null);
  const [qty, setQty] = useState(1);
  const [placed, setPlaced] = useState<string | null>(null);

  const placeOrder = useOrdersStore((s) => s.placeOrder);
  const theme = useThemeStore((s) => s.theme);
  const inst = getInstrument(symbol);
  const precision = inst?.pricePrecision ?? 2;
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

  // Load history whenever symbol/resolution changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTicket(null);
    getWsClient()
      .getHistory(symbol, resolution, 240)
      .then((candles) => {
        if (cancelled || !candleRef.current || !volumeRef.current) return;
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
        chartRef.current?.timeScale().fitContent();
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbol, resolution]);

  // Update the forming candle from the live quote.
  const quote = useMarketStore((s) => s.quotes[symbol]);
  useEffect(() => {
    if (!quote || !candleRef.current || loading) return;
    const bucket = (Math.floor(quote.ts / 1000 / resolution) * resolution) as UTCTimestamp;
    const last = lastCandleRef.current;
    const price = quote.price;

    let next: CandlestickData<UTCTimestamp>;
    if (!last || bucket > (last.time as number)) {
      next = { time: bucket, open: price, high: price, low: price, close: price };
    } else {
      next = {
        time: last.time,
        open: last.open,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      };
    }
    lastCandleRef.current = next;
    candleRef.current.update(next);
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
    setTicket(null);
    const res = await placeOrder({ symbol, side, type, quantity: qty, price });
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

        {ticket && (
          <div
            className="absolute z-20"
            style={{
              left: ticket.x,
              top: ticket.y,
              transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, -50%)`,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex w-44 flex-col gap-1 rounded-lg border border-border-strong bg-surface-2/95 p-1.5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between px-0.5">
                <span className="nums text-[11px] text-muted">@ {formatPrice(ticketPrice, precision)}</span>
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
