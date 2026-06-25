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
  stopLoss?: number | null;
  takeProfit?: number | null;
}

interface OrdersState {
  orders: Order[];
  positions: Position[];
  seeded: boolean;

  seed: () => void;
  /** Clear the book (on logout / user switch) so the next user loads fresh. */
  reset: () => void;
  placeOrder: (input: PlaceOrderInput) => Promise<{ ok: boolean; order?: Order; error?: string }>;
  closePosition: (symbol: string) => Promise<{ ok: boolean; error?: string }>;
  cancelOrder: (id: string) => Promise<{ ok: boolean; error?: string }>;
  /** Modify a working order's price and/or its bracket SL/TP (chart drag-to-edit). */
  modifyOrder: (
    id: string,
    changes: { price?: number | null; stopLoss?: number | null; takeProfit?: number | null },
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Attach / update / remove a protective bracket on an open position (chart +SL/+TP). */
  setPositionBracket: (
    symbol: string,
    changes: { stopLoss?: number | null; takeProfit?: number | null },
  ) => Promise<{ ok: boolean; error?: string }>;
  /** Re-fetch positions + orders from the backend. */
  refresh: () => Promise<void>;
  /** Internal: apply a fill to the net position book (mock mode). */
  applyFill: (order: Order) => void;
  /** Apply a server `position_update` (positions channel) to mark a position. */
  applyPositionUpdate: (symbol: string, markPrice: number, unrealizedPnl: number) => void;
  /** Replace the position book from a server `positions_snapshot` (engine lifecycle: open/resize/close). */
  applyPositionsSnapshot: (positions: Position[]) => void;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
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

  reset: () => set({ orders: [], positions: [], seeded: false }),

  placeOrder: async (input) => {
    const inst = getInstrument(input.symbol);
    if (!inst) return { ok: false, error: "Unknown instrument." };
    if (!input.quantity || input.quantity <= 0) return { ok: false, error: "Quantity must be positive." };
    if (input.type !== "market" && (input.price == null || input.price <= 0))
      return { ok: false, error: "A valid price is required for limit/stop orders." };

    // Real order API (Postgres-backed) when authenticated against the backend.
    const token = getAuthToken();
    if (!USE_MOCK_FEED && API_BASE && token) {
      try {
        const res = await fetch(`${API_BASE}/api/orders`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({
            symbol: input.symbol,
            side: input.side,
            type: input.type,
            quantity: input.quantity,
            price: input.price ?? null,
            stopLoss: input.stopLoss ?? null,
            takeProfit: input.takeProfit ?? null,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          await get().refresh();
          return { ok: true };
        }
        return { ok: false, error: data.error ?? "Order rejected." };
      } catch {
        return { ok: false, error: "Could not reach the server." };
      }
    }

    // --- Mock fallback (client-side simulation) ---
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

    // Mock bracket: show the opposing SL/TP legs as working orders.
    if (isMarket && (input.stopLoss != null || input.takeProfit != null)) {
      const exitSide: Side = input.side === "buy" ? "sell" : "buy";
      const leg = (t: OrderType, px: number, role: "SL" | "TP"): Order => ({
        id: `ORD-${(orderSeq++).toString()}`,
        symbol: input.symbol,
        side: exitSide,
        type: t,
        status: "open",
        quantity: input.quantity,
        filledQuantity: 0,
        price: round(px, inst.pricePrecision),
        avgFillPrice: null,
        timeInForce: "GTC",
        createdAt: now,
        updatedAt: now,
        bracketRole: role,
      });
      const legs: Order[] = [];
      if (input.stopLoss != null) legs.push(leg("stop", input.stopLoss, "SL"));
      if (input.takeProfit != null) legs.push(leg("limit", input.takeProfit, "TP"));
      set((s) => ({ orders: [...legs, ...s.orders] }));
    }
    return { ok: true, order };
  },

  closePosition: async (symbol) => {
    const token = getAuthToken();
    if (!USE_MOCK_FEED && API_BASE && token) {
      try {
        const res = await fetch(`${API_BASE}/api/positions/close`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ symbol }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          await get().refresh();
          return { ok: true };
        }
        return { ok: false, error: data.error ?? "Close failed." };
      } catch {
        return { ok: false, error: "Could not reach the server." };
      }
    }

    // Mock: flatten by placing an opposing market order.
    const pos = get().positions.find((p) => p.symbol === symbol);
    if (!pos) return { ok: false, error: "No open position." };
    const res = await get().placeOrder({
      symbol,
      side: pos.side === "buy" ? "sell" : "buy",
      type: "market",
      quantity: pos.quantity,
    });
    return { ok: res.ok, error: res.error };
  },

  refresh: async () => {
    const token = getAuthToken();
    if (USE_MOCK_FEED || !API_BASE || !token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [pRes, oRes] = await Promise.all([
        fetch(`${API_BASE}/api/positions`, { headers }),
        fetch(`${API_BASE}/api/orders`, { headers }),
      ]);
      if (pRes.ok && oRes.ok) {
        set({ positions: (await pRes.json()) as Position[], orders: (await oRes.json()) as Order[] });
      }
    } catch {
      /* keep current state */
    }
  },

  cancelOrder: async (id) => {
    // Real cancel against the backend (Postgres-backed) when authenticated.
    const token = getAuthToken();
    if (!USE_MOCK_FEED && API_BASE && token) {
      try {
        const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(id)}/cancel`, {
          method: "POST",
          headers: authHeaders(token),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          await get().refresh();
          return { ok: true };
        }
        return { ok: false, error: data.error ?? "Cancel failed." };
      } catch {
        return { ok: false, error: "Could not reach the server." };
      }
    }

    // Mock fallback: flip local state only.
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id && (o.status === "open" || o.status === "partial")
          ? { ...o, status: "cancelled", reason: "Cancelled by user", updatedAt: Date.now() }
          : o,
      ),
    }));
    return { ok: true };
  },

  modifyOrder: async (id, changes) => {
    const token = getAuthToken();
    if (!USE_MOCK_FEED && API_BASE && token) {
      try {
        const res = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(id)}/modify`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify(changes),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          await get().refresh();
          return { ok: true };
        }
        return { ok: false, error: data.error ?? "Modify failed." };
      } catch {
        return { ok: false, error: "Could not reach the server." };
      }
    }

    // Mock fallback: update local order fields in place.
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === id && (o.status === "open" || o.status === "partial")
          ? {
              ...o,
              price: changes.price ?? o.price,
              slPrice: changes.stopLoss === undefined ? o.slPrice : changes.stopLoss,
              tpPrice: changes.takeProfit === undefined ? o.tpPrice : changes.takeProfit,
              updatedAt: Date.now(),
            }
          : o,
      ),
    }));
    return { ok: true };
  },

  setPositionBracket: async (symbol, changes) => {
    const token = getAuthToken();
    if (!USE_MOCK_FEED && API_BASE && token) {
      try {
        const res = await fetch(`${API_BASE}/api/positions/bracket`, {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ symbol, ...changes }),
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (res.ok && data.ok) {
          await get().refresh();
          return { ok: true };
        }
        return { ok: false, error: data.error ?? "Could not attach bracket." };
      } catch {
        return { ok: false, error: "Could not reach the server." };
      }
    }
    return { ok: true }; // mock mode: brackets on positions aren't simulated
  },

  applyPositionUpdate: (symbol, markPrice, unrealizedPnl) => {
    set((s) => ({
      positions: s.positions.map((p) => (p.symbol === symbol ? { ...p, markPrice, unrealizedPnl } : p)),
    }));
  },

  // The full book from the engine — opens, resizes, flips, and closes (removals)
  // all arrive here, so replacing the list keeps the UI in lockstep with fills.
  applyPositionsSnapshot: (positions) => set({ positions }),

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
