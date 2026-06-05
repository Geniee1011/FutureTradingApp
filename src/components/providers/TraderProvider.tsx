"use client";

import { useEffect } from "react";
import { useMarketStore } from "@/store/market-store";
import { useOrdersStore } from "@/store/orders-store";
import { useAccountStore } from "@/store/account-store";
import { useAuthStore } from "@/store/auth-store";
import { getWsClient } from "@/lib/ws-client";
import { USE_MOCK_FEED } from "@/lib/constants";

/**
 * Boots the market feed, seeds trader-side stores, and (when authenticated
 * against a real backend) subscribes to the private real-time channels —
 * `positions` and `account-updates` — applying their updates live.
 */
export function TraderProvider({ children }: { children: React.ReactNode }) {
  const initMarket = useMarketStore((s) => s.init);
  const seedOrders = useOrdersStore((s) => s.seed);
  const seedAccount = useAccountStore((s) => s.seed);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    initMarket();
    seedOrders();
    seedAccount();
  }, [initMarket, seedOrders, seedAccount]);

  // Private channels (positions / account-updates) — real backend only.
  useEffect(() => {
    if (USE_MOCK_FEED || !token) return;
    const ws = getWsClient();
    ws.authenticate(token);
    ws.subscribe("positions");
    ws.subscribe("account-updates");

    const off = ws.onMessage((msg) => {
      if (msg.type === "position_update") {
        useOrdersStore.getState().applyPositionUpdate(msg.symbol, msg.markPrice, msg.unrealizedPnl);
      } else if (msg.type === "account_update") {
        useAccountStore.getState().applyAccountUpdate(msg);
      }
    });

    return () => {
      off();
      ws.unsubscribe("positions");
      ws.unsubscribe("account-updates");
    };
  }, [token]);

  return <>{children}</>;
}
