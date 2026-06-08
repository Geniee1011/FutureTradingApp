"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type AreaData,
  type UTCTimestamp,
} from "lightweight-charts";
import { useThemeStore } from "@/store/theme-store";
import { getChartColors } from "@/lib/chart-theme";

/** Compact area chart for the account equity curve. */
export function EquityChart({ data }: { data: { time: number; value: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const theme = useThemeStore((s) => s.theme);

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
      grid: { vertLines: { visible: false }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border, timeVisible: false },
      handleScroll: false,
      handleScale: false,
      autoSize: true,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: c.primary,
      topColor: `${c.primary}55`,
      bottomColor: `${c.primary}00`,
      lineWidth: 2,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    series.setData(
      data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })) as AreaData<UTCTimestamp>[],
    );
    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data]);

  // Recolor on theme change.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const c = getChartColors();
    chart.applyOptions({
      layout: { textColor: c.text },
      grid: { horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
    });
    seriesRef.current?.applyOptions({
      lineColor: c.primary,
      topColor: `${c.primary}55`,
      bottomColor: `${c.primary}00`,
    });
  }, [theme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
