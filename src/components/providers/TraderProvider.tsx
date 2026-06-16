"use client";

import { useEffect } from "react";
import { useMarketStore } from "@/store/market-store";
import { useOrdersStore } from "@/store/orders-store";
import { useAccountStore } from "@/store/account-store";
import { useAuthStore } from "@/store/auth-store";
import { useMarketDataStore, isByoMode } from "@/store/market-data-store";
import { getWsClient } from "@/lib/ws-client";
import { USE_MOCK_FEED } from "@/lib/constants";

/**
 * Boots the market feed, seeds trader-side stores, and (when authenticated
 * against a real backend) subscribes to the private real-time channels —
 * `positions` and `account-updates` — applying their updates live.
 */
export function TraderProvider({ children }: { children: React.ReactNode }) {
  const initMarket = useMarketStore((s) => s.init);
  const token = useAuthStore((s) => s.token);

  const positions = useOrdersStore((s) => s.positions);
  const orders = useOrdersStore((s) => s.orders);

  // Re-run when the logged-in user (token) changes: clear any prior user's cached
  // book first so a new login never shows the previous account's positions/orders.
  // Load the market-data connection status FIRST so the feed inits in the right
  // mode (shared WS vs Model B per-user polling).
  useEffect(() => {
    let active = true;
    void (async () => {
      await useMarketDataStore.getState().refresh();
      if (!active) return;
      initMarket();
      useOrdersStore.getState().reset();
      useAccountStore.getState().reset();
      useOrdersStore.getState().seed();
      useAccountStore.getState().seed();
    })();
    return () => {
      active = false;
    };
  }, [initMarket, token]);

  // Keep quotes flowing for every held position so its P&L stays live, even
  // when it isn't the selected symbol. Skipped in Model B (no shared feed — a
  // position's live P&L there comes from the server's account/position pushes).
  useEffect(() => {
    if (isByoMode()) return;
    const ws = getWsClient();
    for (const p of positions) ws.subscribe("quotes", p.symbol);
  }, [positions]);

  // Likewise for working limit/stop orders: the backend triggers them off the
  // live mark, so their symbols need a quote feed or they'd never fill.
  useEffect(() => {
    if (isByoMode()) return;
    const ws = getWsClient();
    for (const o of orders) {
      if (o.status === "open" || o.status === "partial") ws.subscribe("quotes", o.symbol);
    }
  }, [orders]);

  // Private channels (positions / account-updates) — real backend only.
  useEffect(() => {
    if (USE_MOCK_FEED || !token) return;
    const ws = getWsClient();
    ws.authenticate(token);
    ws.subscribe("positions");
    ws.subscribe("account-updates");
    ws.subscribe("orders");

    const off = ws.onMessage((msg) => {
      if (msg.type === "position_update") {
        useOrdersStore.getState().applyPositionUpdate(msg.symbol, msg.markPrice, msg.unrealizedPnl);
      } else if (msg.type === "positions_snapshot") {
        useOrdersStore.getState().applyPositionsSnapshot(msg.positions);
      } else if (msg.type === "account_update") {
        useAccountStore.getState().applyAccountUpdate(msg);
      } else if (msg.type === "order_update") {
        // A resting limit/stop order filled or was rejected by the engine — re-pull
        // the orders book so the table reflects its new status live.
        void useOrdersStore.getState().refresh();
      }
    });

    return () => {
      off();
      ws.unsubscribe("positions");
      ws.unsubscribe("account-updates");
      ws.unsubscribe("orders");
    };
  }, [token]);

  return <>{children}</>;
}
