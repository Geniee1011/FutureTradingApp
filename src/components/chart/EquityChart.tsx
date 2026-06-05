"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  type IChartApi,
  type AreaData,
  type UTCTimestamp,
} from "lightweight-charts";

/** Compact area chart for the account equity curve. */
export function EquityChart({ data }: { data: { time: number; value: number }[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8a97ad",
        fontFamily: "var(--font-geist-mono), monospace",
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: "#1d2738" } },
      rightPriceScale: { borderColor: "#243049" },
      timeScale: { borderColor: "#243049", timeVisible: false },
      handleScroll: false,
      handleScale: false,
      autoSize: true,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#3b82f6",
      topColor: "#3b82f655",
      bottomColor: "#3b82f600",
      lineWidth: 2,
      priceFormat: { type: "price", precision: 0, minMove: 1 },
    });

    series.setData(
      data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })) as AreaData<UTCTimestamp>[],
    );
    chart.timeScale().fitContent();
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data]);

  return <div ref={containerRef} className="h-full w-full" />;
}
