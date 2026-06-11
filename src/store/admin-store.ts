"use client";

import { create } from "zustand";
import type {
  AccountRule,
  ActivityEvent,
  AdminAccount,
  TraderRecord,
  TraderStatus,
} from "@/lib/types";
import { WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { getAuthToken } from "@/store/auth-store";
import {
  seedActivity,
  seedAdminAccounts,
  seedRules,
  seedTraders,
} from "@/lib/mock/data";

/** REST base of the TradingBackend (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

type RulePatch = Partial<Pick<AccountRule, "maxDailyLoss" | "maxDrawdown" | "profitTarget" | "maxContracts">>;

interface AdminState {
  traders: TraderRecord[];
  accounts: AdminAccount[];
  rules: AccountRule[];
  activity: ActivityEvent[];
  seeded: boolean;

  seed: () => void;
  /** Re-fetch all admin datasets from the backend. */
  refresh: () => Promise<void>;
  setTraderStatus: (id: string, status: TraderStatus) => Promise<void>;
  setAccountStatus: (id: string, status: TraderStatus) => Promise<void>;
  updateRule: (accountId: string, patch: RulePatch) => Promise<void>;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

/** True when we can talk to the real admin API. */
function live(): string | null {
  const token = getAuthToken();
  return !USE_MOCK_FEED && API_BASE && token ? token : null;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  traders: [],
  accounts: [],
  rules: [],
  activity: [],
  seeded: false,

  seed: () => {
    if (get().seeded) return;
    set({ seeded: true });

    const loadMock = () => {
      const traders = seedTraders();
      set({ traders, accounts: seedAdminAccounts(traders), rules: seedRules(), activity: seedActivity() });
    };

    if (!live()) {
      loadMock();
      return;
    }
    void get().refresh().catch(loadMock); // real data, fall back to demo data on any failure
  },

  refresh: async () => {
    const token = live();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [tr, ac, ru, av] = await Promise.all([
      fetch(`${API_BASE}/api/admin/traders`, { headers }),
      fetch(`${API_BASE}/api/admin/accounts`, { headers }),
      fetch(`${API_BASE}/api/admin/rules`, { headers }),
      fetch(`${API_BASE}/api/admin/activity`, { headers }),
    ]);
    if (!(tr.ok && ac.ok && ru.ok && av.ok)) throw new Error("admin fetch failed");
    set({
      traders: (await tr.json()) as TraderRecord[],
      accounts: (await ac.json()) as AdminAccount[],
      rules: (await ru.json()) as AccountRule[],
      activity: (await av.json()) as ActivityEvent[],
    });
  },

  setTraderStatus: async (id, status) => {
    const action = status === "suspended" ? "suspended" : "active";
    const token = live();
    if (token) {
      await fetch(`${API_BASE}/api/admin/traders/${id}/status`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ status: action }),
      }).catch(() => {});
      await get().refresh().catch(() => {});
      return;
    }
    // Mock: local flip (and mirror to the trader's accounts).
    set((s) => ({
      traders: s.traders.map((t) => (t.id === id ? { ...t, status } : t)),
      accounts: s.accounts.map((a) => (a.traderId === id ? { ...a, status } : a)),
    }));
  },

  setAccountStatus: async (id, status) => {
    const action = status === "suspended" ? "suspended" : "active";
    const token = live();
    if (token) {
      await fetch(`${API_BASE}/api/admin/accounts/${id}/status`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ status: action }),
      }).catch(() => {});
      await get().refresh().catch(() => {});
      return;
    }
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, status } : a)) }));
  },

  updateRule: async (accountId, patch) => {
    const token = live();
    if (token) {
      await fetch(`${API_BASE}/api/admin/rules/${accountId}`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(patch),
      }).catch(() => {});
      await get().refresh().catch(() => {});
      return;
    }
    set((s) => ({ rules: s.rules.map((r) => (r.accountId === accountId ? { ...r, ...patch } : r)) }));
  },
}));
