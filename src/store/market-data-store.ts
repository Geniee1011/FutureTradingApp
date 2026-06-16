"use client";

import { create } from "zustand";
import { WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { getAuthToken } from "@/store/auth-store";

/** REST base of the TradingBackend (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

/**
 * Market-data connection state (Model B / byo). Tracks which model the backend
 * runs and, in byo mode, whether THIS user has connected their own Databento key.
 * Charts read `mode`/`connected` to decide between the shared feed and the
 * per-user REST feed (and to show the "Connect Databento" gate).
 */
interface MarketDataState {
  mode: "shared" | "byo";
  configured: boolean; // server has an encryption secret set (can store keys)
  connected: boolean; // this user has a Databento key connected
  loaded: boolean;
  refresh: () => Promise<void>;
  connect: (apiKey: string) => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => Promise<{ ok: boolean; error?: string }>;
}

export const useMarketDataStore = create<MarketDataState>((set) => ({
  mode: "shared",
  configured: false,
  connected: false,
  loaded: false,

  refresh: async () => {
    if (USE_MOCK_FEED || !API_BASE) {
      set({ mode: "shared", loaded: true });
      return;
    }
    const token = getAuthToken();
    try {
      const res = await fetch(`${API_BASE}/api/market-data/connection`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const d = (await res.json()) as { mode?: string; configured?: boolean; connected?: boolean };
        set({
          mode: d.mode === "byo" ? "byo" : "shared",
          configured: !!d.configured,
          connected: !!d.connected,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  connect: async (apiKey) => {
    const token = getAuthToken();
    if (!API_BASE || !token) return { ok: false, error: "You must be signed in." };
    try {
      const res = await fetch(`${API_BASE}/api/market-data/connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ apiKey }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && d.ok) {
        set({ connected: true });
        return { ok: true };
      }
      return { ok: false, error: d.error ?? "Could not connect that key." };
    } catch {
      return { ok: false, error: "Could not reach the server." };
    }
  },

  disconnect: async () => {
    const token = getAuthToken();
    if (!API_BASE || !token) return { ok: false, error: "You must be signed in." };
    try {
      const res = await fetch(`${API_BASE}/api/market-data/connection`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        set({ connected: false });
        return { ok: true };
      }
      return { ok: false, error: "Could not disconnect." };
    } catch {
      return { ok: false, error: "Could not reach the server." };
    }
  },
}));

/** True when the backend is running Model B (per-user keys). */
export function isByoMode(): boolean {
  return useMarketDataStore.getState().mode === "byo";
}
