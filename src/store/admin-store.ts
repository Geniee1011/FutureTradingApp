"use client";

import { create } from "zustand";
import type {
  ActivityEvent,
  AdminAccount,
  TradingRule,
  TraderRecord,
  TraderStatus,
} from "@/lib/types";
import {
  seedActivity,
  seedAdminAccounts,
  seedRules,
  seedTraders,
} from "@/lib/mock/data";

interface AdminState {
  traders: TraderRecord[];
  accounts: AdminAccount[];
  rules: TradingRule[];
  activity: ActivityEvent[];
  seeded: boolean;

  seed: () => void;
  setTraderStatus: (id: string, status: TraderStatus) => void;
  toggleRule: (id: string) => void;
  setAccountStatus: (id: string, status: TraderStatus) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  traders: [],
  accounts: [],
  rules: [],
  activity: [],
  seeded: false,

  seed: () => {
    if (get().seeded) return;
    const traders = seedTraders();
    set({
      traders,
      accounts: seedAdminAccounts(traders),
      rules: seedRules(),
      activity: seedActivity(),
      seeded: true,
    });
  },

  setTraderStatus: (id, status) =>
    set((s) => ({
      traders: s.traders.map((t) => (t.id === id ? { ...t, status } : t)),
      accounts: s.accounts.map((a) => (a.traderId === id ? { ...a, status } : a)),
    })),

  setAccountStatus: (id, status) =>
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, status } : a)) })),

  toggleRule: (id) =>
    set((s) => ({
      rules: s.rules.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now(), updatedBy: "You" } : r,
      ),
    })),
}));
