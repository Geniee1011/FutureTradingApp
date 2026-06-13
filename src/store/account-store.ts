"use client";

import { create } from "zustand";
import type { AccountSummary, TraderViolation, Transaction } from "@/lib/types";
import { WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { getAuthToken } from "@/store/auth-store";
import { seedAccountSummary, seedTransactions } from "@/lib/mock/data";

/** REST base of the TradingBackend (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

interface AccountUpdate {
  status: AccountSummary["status"];
  balance: number;
  equity: number;
  unrealizedPnl: number;
  realizedPnlToday: number;
  dailyPnl: number;
  totalPnl: number;
  drawdown: number;
}

interface AccountState {
  summary: AccountSummary | null;
  transactions: Transaction[];
  violations: TraderViolation[];
  seeded: boolean;
  seed: () => void;
  /** Clear the account (on logout / user switch) so the next user loads fresh. */
  reset: () => void;
  /** Apply a server `account_update` (account-updates channel). */
  applyAccountUpdate: (u: AccountUpdate) => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  summary: null,
  transactions: [],
  violations: [],
  seeded: false,

  seed: () => {
    if (get().seeded) return;
    set({ seeded: true });

    const loadMock = () => set({ summary: seedAccountSummary(), transactions: seedTransactions(), violations: [] });
    const token = getAuthToken();

    if (USE_MOCK_FEED || !API_BASE || !token) {
      loadMock();
      return;
    }

    // Load the account + transactions + violations from Postgres (via the backend).
    void (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [aRes, tRes, vRes] = await Promise.all([
          fetch(`${API_BASE}/api/account`, { headers }),
          fetch(`${API_BASE}/api/transactions`, { headers }),
          fetch(`${API_BASE}/api/violations`, { headers }),
        ]);
        if (aRes.ok && tRes.ok) {
          set({
            summary: (await aRes.json()) as AccountSummary,
            transactions: (await tRes.json()) as Transaction[],
            violations: vRes.ok ? ((await vRes.json()) as TraderViolation[]) : [],
          });
        } else {
          loadMock();
        }
      } catch {
        loadMock();
      }
    })();
  },

  reset: () => set({ summary: null, transactions: [], violations: [], seeded: false }),

  applyAccountUpdate: (u) => {
    set((s) =>
      s.summary
        ? {
            summary: {
              ...s.summary,
              status: u.status,
              balance: u.balance,
              equity: u.equity,
              unrealizedPnl: u.unrealizedPnl,
              realizedPnlToday: u.realizedPnlToday,
              dailyPnl: u.dailyPnl,
              totalPnl: u.totalPnl,
              drawdown: u.drawdown,
            },
          }
        : s,
    );
  },
}));
