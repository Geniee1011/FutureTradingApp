"use client";

import { create } from "zustand";
import type { AccountSummary, Transaction } from "@/lib/types";
import { WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { getAuthToken } from "@/store/auth-store";
import { seedAccountSummary, seedTransactions } from "@/lib/mock/data";

/** REST base of the TradingBackend (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

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
    set({ seeded: true });

    const loadMock = () => set({ summary: seedAccountSummary(), transactions: seedTransactions() });
    const token = getAuthToken();

    if (USE_MOCK_FEED || !API_BASE || !token) {
      loadMock();
      return;
    }

    // Load the account + transactions from Postgres (via the backend).
    void (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [aRes, tRes] = await Promise.all([
          fetch(`${API_BASE}/api/account`, { headers }),
          fetch(`${API_BASE}/api/transactions`, { headers }),
        ]);
        if (aRes.ok && tRes.ok) {
          set({ summary: (await aRes.json()) as AccountSummary, transactions: (await tRes.json()) as Transaction[] });
        } else {
          loadMock();
        }
      } catch {
        loadMock();
      }
    })();
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
