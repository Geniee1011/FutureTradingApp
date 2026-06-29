"use client";

import { create } from "zustand";
import type {
  AccountRule,
  ActivityEvent,
  AdminAccount,
  AdminClosedPosition,
  AdminOpenPosition,
  AdminViolation,
  EvalRule,
  RuleTemplate,
  TraderDetail,
  TraderRecord,
  TraderStatus,
} from "@/lib/types";
import { WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { getAuthToken } from "@/store/auth-store";
import {
  seedActivity,
  seedAdminAccounts,
  seedRules,
  seedRuleTemplates,
  seedTraders,
  seedViolations,
} from "@/lib/mock/data";

/** REST base of the TradingBackend (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

type RulePatch = Partial<Pick<AccountRule, "maxDailyLoss" | "maxDrawdown" | "profitTarget" | "maxContracts" | "allowedInstruments">>;
type TemplatePatch = Partial<Omit<RuleTemplate, "id" | "label" | "phase" | "accountSize" | "sortOrder" | "updatedAt">>;

interface AdminState {
  traders: TraderRecord[];
  accounts: AdminAccount[];
  rules: AccountRule[];
  ruleTemplates: RuleTemplate[];
  activity: ActivityEvent[];
  violations: AdminViolation[];
  seeded: boolean;

  seed: () => void;
  /** Clear all admin datasets (on logout / user switch). */
  reset: () => void;
  /** Re-fetch all admin datasets from the backend. */
  refresh: () => Promise<void>;
  setTraderStatus: (id: string, status: TraderStatus) => Promise<void>;
  setAccountStatus: (id: string, status: TraderStatus) => Promise<void>;
  updateRule: (accountId: string, patch: RulePatch) => Promise<void>;
  /** Fetch all 9 global rule templates (cached in state after first load). */
  getRuleTemplates: () => Promise<RuleTemplate[]>;
  /** Update a global template + cascade to all linked accounts. */
  updateRuleTemplate: (id: string, patch: TemplatePatch) => Promise<void>;
  /** Full single-trader detail bundle (live fetch, or assembled from seed in mock mode). */
  getTraderDetail: (id: string) => Promise<TraderDetail | null>;
  // --- account actions (operate on an account id) ---
  resetAccount: (accountId: string) => Promise<AdminActionResult>;
  /** Assign an account size/tier (rule template) to an account; applies the ruleset + resets to that size. */
  assignTier: (accountId: string, templateId: string) => Promise<AdminActionResult>;
  adjustBalance: (accountId: string, amount: number) => Promise<AdminActionResult>;
  closeAllPositions: (accountId: string) => Promise<AdminActionResult>;
  liquidateAccount: (accountId: string) => Promise<AdminActionResult>;
  cancelOrders: (accountId: string) => Promise<AdminActionResult>;
  /** Set a new password for a trader (operates on a user/trader id). */
  resetPassword: (userId: string, newPassword: string) => Promise<AdminActionResult>;
  /** All open + closed positions across every account (admin-wide Positions view). */
  getAllPositions: () => Promise<{ open: AdminOpenPosition[]; closed: AdminClosedPosition[] }>;
}

export interface AdminActionResult {
  ok: boolean;
  closed?: number;
  cancelled?: number;
  amount?: number;
  error?: string;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

/** POST an admin account action and parse the JSON result. */
async function postAction(token: string, accountId: string, action: string, body?: unknown): Promise<AdminActionResult> {
  const res = await fetch(`${API_BASE}/api/admin/accounts/${accountId}/${action}`, {
    method: "POST",
    headers: authHeaders(token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).catch(() => null);
  if (!res) return { ok: false, error: "network error" };
  const data = (await res.json().catch(() => ({}))) as AdminActionResult;
  return res.ok ? { ...data, ok: true } : { ok: false, error: data.error ?? "action failed" };
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
  ruleTemplates: [],
  activity: [],
  violations: [],
  seeded: false,

  seed: () => {
    if (get().seeded) return;
    set({ seeded: true });

    const loadMock = () => {
      const traders = seedTraders();
      set({ traders, accounts: seedAdminAccounts(traders), rules: seedRules(), ruleTemplates: seedRuleTemplates(), activity: seedActivity(), violations: seedViolations(traders) });
    };

    if (!live()) {
      loadMock();
      return;
    }
    void get().refresh().catch(loadMock); // real data, fall back to demo data on any failure
  },

  reset: () => set({ traders: [], accounts: [], rules: [], ruleTemplates: [], activity: [], violations: [], seeded: false }),

  refresh: async () => {
    const token = live();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [tr, ac, ru, rt, av, vi] = await Promise.all([
      fetch(`${API_BASE}/api/admin/traders`, { headers }),
      fetch(`${API_BASE}/api/admin/accounts`, { headers }),
      fetch(`${API_BASE}/api/admin/rules`, { headers }),
      fetch(`${API_BASE}/api/admin/rule-templates`, { headers }),
      fetch(`${API_BASE}/api/admin/activity`, { headers }),
      fetch(`${API_BASE}/api/admin/violations`, { headers }),
    ]);
    if (!(tr.ok && ac.ok && ru.ok && av.ok && vi.ok)) throw new Error("admin fetch failed");
    set({
      traders: (await tr.json()) as TraderRecord[],
      accounts: (await ac.json()) as AdminAccount[],
      rules: (await ru.json()) as AccountRule[],
      ruleTemplates: rt.ok ? ((await rt.json()) as RuleTemplate[]) : seedRuleTemplates(),
      activity: (await av.json()) as ActivityEvent[],
      violations: (await vi.json()) as AdminViolation[],
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

  getRuleTemplates: async () => {
    const cached = get().ruleTemplates;
    if (cached.length) return cached;
    const token = live();
    if (token) {
      const res = await fetch(`${API_BASE}/api/admin/rule-templates`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (res?.ok) {
        const data = (await res.json()) as RuleTemplate[];
        set({ ruleTemplates: data });
        return data;
      }
    }
    const mock = seedRuleTemplates();
    set({ ruleTemplates: mock });
    return mock;
  },

  updateRuleTemplate: async (id, patch) => {
    const token = live();
    if (token) {
      await fetch(`${API_BASE}/api/admin/rule-templates/${id}`, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify(patch),
      }).catch(() => {});
      await get().refresh().catch(() => {});
      return;
    }
    set((s) => ({ ruleTemplates: s.ruleTemplates.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)) }));
  },

  getTraderDetail: async (id) => {
    const token = live();
    if (token) {
      const res = await fetch(`${API_BASE}/api/admin/traders/${id}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
      if (!res || !res.ok) return null;
      const data = (await res.json()) as TraderDetail | null;
      return data && data.trader ? data : null;
    }
    // Mock: assemble from the already-seeded admin datasets (no per-trader
    // positions/orders/violations in demo mode).
    const s = get();
    const trader = s.traders.find((t) => t.id === id);
    if (!trader) return null;
    const account = s.accounts.find((a) => a.traderId === id) ?? null;
    const ruleRow = account ? s.rules.find((r) => r.accountId === account.id) : undefined;
    const rule: EvalRule | null = ruleRow
      ? { profitTarget: ruleRow.profitTarget, maxDailyLoss: ruleRow.maxDailyLoss, maxDrawdown: ruleRow.maxDrawdown, maxContracts: ruleRow.maxContracts }
      : null;
    return {
      trader,
      account: account
        ? {
            id: account.id,
            startingBalance: account.balance,
            balance: account.balance,
            equity: account.equity,
            dailyPnl: 0,
            totalPnl: trader.pnl30d,
            drawdown: 0,
            highestEquity: account.equity,
            status: account.status,
            currency: account.currency,
            createdAt: account.createdAt,
          }
        : null,
      rule,
      positions: [],
      orders: [],
      violations: [],
      activity: s.activity.filter((e) => e.actor === trader.name).slice(0, 50),
    };
  },

  resetAccount: async (accountId) => {
    const token = live();
    if (token) {
      const r = await postAction(token, accountId, "reset");
      await get().refresh().catch(() => {});
      return r;
    }
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, status: "active", openPositions: 0 } : a)) }));
    return { ok: true };
  },

  assignTier: async (accountId, templateId) => {
    const token = live();
    if (token) {
      const r = await postAction(token, accountId, "assign-tier", { templateId });
      await get().refresh().catch(() => {});
      return r;
    }
    // Mock: reflect the new tier's size on the account locally.
    const tpl = get().ruleTemplates.find((t) => t.id === templateId);
    if (tpl) {
      set((s) => ({
        accounts: s.accounts.map((a) =>
          a.id === accountId
            ? { ...a, status: "active", openPositions: 0, balance: tpl.accountSize, equity: tpl.accountSize }
            : a,
        ),
      }));
    }
    return { ok: true };
  },

  adjustBalance: async (accountId, amount) => {
    const token = live();
    if (token) {
      const r = await postAction(token, accountId, "adjust-balance", { amount });
      await get().refresh().catch(() => {});
      return r;
    }
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, balance: a.balance + amount, equity: a.equity + amount } : a)) }));
    return { ok: true, amount };
  },

  closeAllPositions: async (accountId) => {
    const token = live();
    if (token) {
      const r = await postAction(token, accountId, "close-all");
      await get().refresh().catch(() => {});
      return r;
    }
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, openPositions: 0 } : a)) }));
    return { ok: true, closed: 0 };
  },

  liquidateAccount: async (accountId) => {
    const token = live();
    if (token) {
      const r = await postAction(token, accountId, "liquidate");
      await get().refresh().catch(() => {});
      return r;
    }
    set((s) => ({ accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, openPositions: 0, status: "suspended" } : a)) }));
    return { ok: true, closed: 0 };
  },

  cancelOrders: async (accountId) => {
    const token = live();
    if (token) {
      const r = await postAction(token, accountId, "cancel-orders");
      await get().refresh().catch(() => {});
      return r;
    }
    return { ok: true, cancelled: 0 };
  },

  resetPassword: async (userId, newPassword) => {
    const token = live();
    if (!token) return { ok: false, error: "Admin actions require the backend (not available in demo mode)." };
    const res = await fetch(`${API_BASE}/api/admin/traders/${userId}/password`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ newPassword }),
    }).catch(() => null);
    if (!res) return { ok: false, error: "network error" };
    const data = (await res.json().catch(() => ({}))) as AdminActionResult;
    return res.ok ? { ...data, ok: true } : { ok: false, error: data.error ?? "Could not reset password." };
  },

  getAllPositions: async () => {
    const token = live();
    if (!token) return { open: [], closed: [] };
    const res = await fetch(`${API_BASE}/api/admin/positions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    if (!res || !res.ok) return { open: [], closed: [] };
    return (await res.json().catch(() => ({ open: [], closed: [] }))) as {
      open: AdminOpenPosition[];
      closed: AdminClosedPosition[];
    };
  },
}));
