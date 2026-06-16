"use client";

import { useEffect, useRef, useState } from "react";
import { createDatafeed } from "./datafeed";
import { CandleChart } from "../CandleChart";
import { useMarketDataStore } from "@/store/market-data-store";
import { ConnectDatabentoModal } from "@/components/layout/ConnectDatabentoModal";
import { Button } from "@/components/ui/Button";

/**
 * Renders the TradingView Charting Library widget when it is available in
 * /public/charting_library AND NEXT_PUBLIC_TV_ADVANCED=1. Otherwise it
 * transparently falls back to the open-source CandleChart so the UI always
 * works. Both are driven by the same datafeed/WS data.
 */
const ADVANCED_ENABLED = process.env.NEXT_PUBLIC_TV_ADVANCED === "1";
const LIBRARY_PATH = "/charting_library/";

export function AdvancedChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<TradingViewWidgetInstance | null>(null);
  const [useFallback, setUseFallback] = useState(!ADVANCED_ENABLED);

  // Model B: gate the chart until the user connects their own Databento account.
  const mode = useMarketDataStore((s) => s.mode);
  const connected = useMarketDataStore((s) => s.connected);
  const loaded = useMarketDataStore((s) => s.loaded);
  const [connectOpen, setConnectOpen] = useState(false);
  const needsKey = mode === "byo" && loaded && !connected;

  useEffect(() => {
    if (!ADVANCED_ENABLED || !containerRef.current) return;
    let cancelled = false;

    function init() {
      if (cancelled || !window.TradingView || !containerRef.current) return;
      try {
        widgetRef.current = new window.TradingView.widget({
          symbol,
          interval: "1",
          container: containerRef.current,
          datafeed: createDatafeed(),
          library_path: LIBRARY_PATH,
          locale: "en",
          theme: "dark",
          autosize: true,
          disabled_features: ["use_localstorage_for_settings"],
          overrides: {
            "paneProperties.background": "#0a0e17",
            "paneProperties.backgroundType": "solid",
          },
        });
      } catch {
        setUseFallback(true);
      }
    }

    // Load the library script if not already present.
    if (window.TradingView) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = `${LIBRARY_PATH}charting_library.js`;
      script.async = true;
      script.onload = init;
      script.onerror = () => setUseFallback(true); // library not installed
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
  }, [symbol]);

  if (needsKey) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-sm font-semibold text-foreground">Connect your Databento account</div>
        <p className="max-w-sm text-xs text-muted">
          This portal streams charts from your own Databento data. Connect your account to view {symbol} and trade.
        </p>
        <Button size="sm" onClick={() => setConnectOpen(true)}>
          Connect Databento
        </Button>
        {connectOpen && <ConnectDatabentoModal onClose={() => setConnectOpen(false)} />}
      </div>
    );
  }

  if (useFallback) return <CandleChart symbol={symbol} />;
  return <div ref={containerRef} className="h-full w-full" />;
}
