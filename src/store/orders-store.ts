"use client";

import { create } from "zustand";
import type { Order, OrderType, Position, Side, TimeInForce } from "@/lib/types";
import { getInstrument, WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { getWsClient } from "@/lib/ws-client";
import { getAuthToken } from "@/store/auth-store";
import { seedOrders, seedPositions } from "@/lib/mock/data";

/** REST base of the TradingBackend (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

export interface PlaceOrderInput {
  symbol: string;
  side: Side;
  type: OrderType;
  quantity: number;
  price?: number | null;
  timeInForce?: TimeInForce;
}

interface OrdersState {
  orders: Order[];
  positions: Position[];
  seeded: boolean;

  seed: () => void;
  placeOrder: (input: PlaceOrderInput) => { ok: boolean; order?: Order; error?: string };
  cancelOrder: (id: string) => void;
  /** Internal: apply a fill to the net position book. */
  applyFill: (order: Order) => void;
  /** Apply a server `position_update` (positions channel) to mark a position. */
  applyPositionUpdate: (symbol: string, markPrice: number, unrealizedPnl: number) => void;
}

let orderSeq = 200000;

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  positions: [],
  seeded: false,

  seed: () => {
    if (get().seeded) return;
    set({ seeded: true });

    const loadMock = () => set({ orders: seedOrders(), positions: seedPositions() });
    const token = getAuthToken();

    // No backend or no session → demo data.
    if (USE_MOCK_FEED || !API_BASE || !token) {
      loadMock();
      return;
    }

    // Load positions + orders from the backend (Postgres-backed).
    void (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [pRes, oRes] = await Promise.all([
          fetch(`${API_BASE}/api/positions`, { headers }),
          fetch(`${API_BASE}/api/orders`, { headers }),
        ]);
        if (pRes.ok && oRes.ok) {
          set({ positions: (await pRes.json()) as Position[], orders: (await oRes.json()) as Order[] });
        } else {
          loadMock();
        }
      } catch {
        loadMock();
      }
    })();
  },

  placeOrder: (input) => {
    const inst = getInstrument(input.symbol);
    if (!inst) return { ok: false, error: "Unknown instrument." };
    if (!input.quantity || input.quantity <= 0) return { ok: false, error: "Quantity must be positive." };
    if (input.type !== "market" && (input.price == null || input.price <= 0))
      return { ok: false, error: "A valid price is required for limit/stop orders." };

    const now = Date.now();
    const ws = getWsClient();
    const mark = ws.getPrice(input.symbol) || inst.basePrice;
    const isMarket = input.type === "market";

    const order: Order = {
      id: `ORD-${(orderSeq++).toString()}`,
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      status: isMarket ? "filled" : "open",
      quantity: input.quantity,
      filledQuantity: isMarket ? input.quantity : 0,
      price: input.type === "market" ? null : input.price ?? null,
      avgFillPrice: isMarket ? round(mark, inst.pricePrecision) : null,
      timeInForce: input.timeInForce ?? "GTC",
      createdAt: now,
      updatedAt: now,
    };

    set((s) => ({ orders: [order, ...s.orders] }));
    if (isMarket) get().applyFill(order);
    return { ok: true, order };
  },

  cancelOrder: (id) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id && (o.status === "open" || o.status === "partial")
          ? { ...o, status: "cancelled", reason: "Cancelled by user", updatedAt: Date.now() }
          : o,
      ),
    }));
  },

  applyPositionUpdate: (symbol, markPrice, unrealizedPnl) => {
    set((s) => ({
      positions: s.positions.map((p) => (p.symbol === symbol ? { ...p, markPrice, unrealizedPnl } : p)),
    }));
  },

  applyFill: (order: Order) => {
    set((s) => {
      const dir = order.side === "buy" ? 1 : -1;
      const fillPrice = order.avgFillPrice ?? order.price ?? 0;
      const existing = s.positions.find((p) => p.symbol === order.symbol);

      if (!existing) {
        const pos: Position = {
          symbol: order.symbol,
          side: order.side,
          quantity: order.quantity,
          avgPrice: fillPrice,
          markPrice: fillPrice,
          unrealizedPnl: 0,
          realizedPnl: 0,
        };
        return { positions: [...s.positions, pos] };
      }

      const signedQty = (existing.side === "buy" ? 1 : -1) * existing.quantity + dir * order.quantity;
      const newSide: Side = signedQty >= 0 ? "buy" : "sell";
      const newQty = Math.abs(signedQty);

      // Weighted average when increasing the position in the same direction.
      const sameDir = (existing.side === "buy" ? 1 : -1) === dir;
      const avgPrice = sameDir
        ? (existing.avgPrice * existing.quantity + fillPrice * order.quantity) / (existing.quantity + order.quantity)
        : existing.avgPrice;

      const positions = s.positions
        .map((p) =>
          p.symbol === order.symbol
            ? { ...p, side: newSide, quantity: round(newQty, 6), avgPrice: round(avgPrice, 6) }
            : p,
        )
        .filter((p) => p.quantity > 1e-9);

      return { positions };
    });
  },
}));

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
