"use client";

import { useEffect } from "react";
import { useMarketStore } from "@/store/market-store";

/** Initializes the market data feed once on the client. Mount high in the tree. */
export function MarketProvider({ children }: { children: React.ReactNode }) {
  const init = useMarketStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return <>{children}</>;
}
