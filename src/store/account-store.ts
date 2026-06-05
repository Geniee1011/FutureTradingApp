"use client";

import { create } from "zustand";
import type { AccountSummary, Transaction } from "@/lib/types";
import { seedAccountSummary, seedTransactions } from "@/lib/mock/data";

interface AccountUpdate {
  balance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
}

interface AccountState {
  summary: AccountSummary | null;
  transactions: Transaction[];
  seeded: boolean;
  seed: () => void;
  /** Apply a server `account_update` (account-updates channel). */
  applyAccountUpdate: (u: AccountUpdate) => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  summary: null,
  transactions: [],
  seeded: false,
  seed: () => {
    if (get().seeded) return;
    set({ summary: seedAccountSummary(), transactions: seedTransactions(), seeded: true });
  },
  applyAccountUpdate: (u) => {
    set((s) =>
      s.summary
        ? {
            summary: {
              ...s.summary,
              balance: u.balance,
              equity: u.equity,
              unrealizedPnl: u.unrealizedPnl,
              realizedPnlToday: u.realizedPnlToday,
            },
          }
        : s,
    );
  },
}));
