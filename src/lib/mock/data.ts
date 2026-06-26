/* ------------------------------------------------------------------ *
 * Deterministic seed data for the demo. Generated with a seeded RNG so
 * server and client render identically (no hydration mismatch). Replace
 * these with TradingBackend REST calls when the API is available.
 * ------------------------------------------------------------------ */

import { seededRandom } from "../utils";
import { INSTRUMENTS } from "../constants";
import type {
  AccountRule,
  AccountSummary,
  ActivityEvent,
  AdminAccount,
  AdminViolation,
  Order,
  OrderStatus,
  Position,
  RuleTemplate,
  Side,
  TraderRecord,
  Transaction,
  User,
} from "../types";

/** A fixed reference "now" so seeded relative timestamps are stable across renders. */
const NOW = Date.UTC(2026, 5, 4, 12, 0, 0); // 2026-06-04T12:00:00Z
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Tiny seeded RNG: call rng() to get the next pseudo-random in [0,1). */
function makeRng(seed: number) {
  let s = seed;
  return () => seededRandom((s += 1.123));
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/* ----------------------------- Auth ------------------------------- */

export const DEMO_USERS: (User & { password: string })[] = [
  {
    id: "u_trader",
    name: "Marvin Weiss",
    email: "trader@demo.com",
    role: "trader",
    avatarColor: "#3b82f6",
    password: "demo",
  },
  {
    id: "u_admin",
    name: "Alex Admin",
    email: "admin@demo.com",
    role: "admin",
    avatarColor: "#16c784",
    password: "demo",
  },
];

/* -------------------------- Trader views -------------------------- */

export function seedAccountSummary(): AccountSummary {
  return {
    accountId: "ACC-100482",
    currency: "USD",
    status: "ACTIVE",
    startingBalance: 50_000,
    balance: 51_204.18,
    equity: 51_354.75,
    unrealizedPnl: 150.57,
    realizedPnlToday: 1_204.18,
    dailyPnl: 1_354.75,
    totalPnl: 1_204.18,
    drawdown: 320.4,
    highestEquity: 51_524.58,
    rule: { profitTarget: 6_000, maxDailyLoss: 2_500, maxDrawdown: 3_000, maxContracts: 5 },
  };
}

export function seedPositions(): Position[] {
  const rng = makeRng(7);
  const symbols = ["ES", "NQ", "CL", "GC"];
  return symbols.map((symbol) => {
    const inst = INSTRUMENTS.find((i) => i.symbol === symbol)!;
    const side: Side = rng() > 0.4 ? "buy" : "sell";
    const qty = Math.floor(rng() * 8) + 1; // whole contracts
    const avgPrice = inst.basePrice * (1 + (rng() - 0.5) * 0.05);
    const markPrice = inst.basePrice * (1 + (rng() - 0.5) * 0.04);
    const dir = side === "buy" ? 1 : -1;
    const unrealized = (markPrice - avgPrice) * qty * dir * inst.multiplier;
    return {
      symbol,
      side,
      quantity: qty,
      avgPrice: round(avgPrice, inst.pricePrecision),
      markPrice: round(markPrice, inst.pricePrecision),
      unrealizedPnl: round(unrealized, 2),
      realizedPnl: round((rng() - 0.3) * 2000, 2),
    };
  });
}

export function seedOrders(): Order[] {
  const rng = makeRng(21);
  const statuses: OrderStatus[] = [
    "filled",
    "filled",
    "open",
    "partial",
    "cancelled",
    "rejected",
    "filled",
    "open",
  ];
  const orders: Order[] = [];
  for (let i = 0; i < 24; i++) {
    const inst = pick(rng, INSTRUMENTS);
    const side: Side = rng() > 0.5 ? "buy" : "sell";
    const type = pick(rng, ["market", "limit", "stop"] as const);
    const status = statuses[i % statuses.length];
    const qty = Math.floor(rng() * 10) + 1; // whole contracts
    const filled =
      status === "filled"
        ? qty
        : status === "partial"
          ? Math.max(1, Math.floor(qty * (0.2 + rng() * 0.5)))
          : 0;
    const price = type === "market" ? null : round(inst.basePrice * (1 + (rng() - 0.5) * 0.03), inst.pricePrecision);
    const created = NOW - Math.floor(rng() * 6 * HOUR) - i * 11 * MIN;
    orders.push({
      id: `ORD-${(100000 + i).toString()}`,
      symbol: inst.symbol,
      side,
      type,
      status,
      quantity: qty,
      filledQuantity: filled,
      price,
      avgFillPrice: filled > 0 ? round((price ?? inst.basePrice) * (1 + (rng() - 0.5) * 0.002), inst.pricePrecision) : null,
      timeInForce: pick(rng, ["GTC", "IOC", "FOK", "DAY"] as const),
      createdAt: created,
      updatedAt: created + Math.floor(rng() * 20 * MIN),
      reason: status === "rejected" ? "Insufficient margin" : status === "cancelled" ? "Cancelled by user" : undefined,
    });
  }
  return orders.sort((a, b) => b.createdAt - a.createdAt);
}

export function seedTransactions(): Transaction[] {
  const rng = makeRng(33);
  const types = ["deposit", "withdrawal", "fee", "trade", "funding"] as const;
  const out: Transaction[] = [];
  for (let i = 0; i < 18; i++) {
    const type = pick(rng, types);
    const amount =
      type === "deposit"
        ? round(rng() * 20000 + 1000, 2)
        : type === "withdrawal"
          ? -round(rng() * 8000 + 500, 2)
          : type === "fee"
            ? -round(rng() * 40 + 1, 2)
            : round((rng() - 0.5) * 3000, 2);
    out.push({
      id: `TX-${90000 + i}`,
      ts: NOW - i * 7 * HOUR - Math.floor(rng() * HOUR),
      type,
      amount,
      description:
        type === "trade"
          ? `Realized P&L · ${pick(rng, INSTRUMENTS).symbol}`
          : type === "funding"
            ? "Overnight funding"
            : type === "fee"
              ? "Trading commission"
              : type[0].toUpperCase() + type.slice(1),
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

/** Equity curve points for the dashboard chart. */
export function seedEquityCurve(points = 60): { time: number; value: number }[] {
  const rng = makeRng(51);
  const out: { time: number; value: number }[] = [];
  let value = 118_000;
  for (let i = points - 1; i >= 0; i--) {
    value += (rng() - 0.42) * 1800;
    out.push({ time: Math.floor((NOW - i * DAY) / 1000), value: round(value, 2) });
  }
  return out;
}

/* --------------------------- Admin / CRM -------------------------- */

const FIRST = ["James", "Mia", "Liam", "Sofia", "Noah", "Emma", "Lucas", "Ava", "Ethan", "Olivia", "Daniel", "Isabella", "Yuki", "Chen", "Aarav", "Fatima", "Diego", "Lena", "Omar", "Nina"];
const LAST = ["Carter", "Nguyen", "Müller", "Rossi", "Kowalski", "Andersson", "Tanaka", "Silva", "Khan", "Okafor", "Petrov", "Garcia", "Schmidt", "Dubois", "Haddad", "Novak", "Costa", "Ivanov", "Park", "Reyes"];
const COUNTRIES = ["United States", "Germany", "United Kingdom", "Singapore", "Japan", "Brazil", "UAE", "Poland", "Canada", "Australia"];

export function seedTraders(count = 28): TraderRecord[] {
  const rng = makeRng(101);
  const statuses = ["active", "active", "active", "suspended", "pending", "closed"] as const;
  const kyc = ["verified", "verified", "pending", "rejected", "unsubmitted"] as const;
  const tiers = ["bronze", "silver", "gold", "platinum"] as const;
  const out: TraderRecord[] = [];
  for (let i = 0; i < count; i++) {
    const name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    out.push({
      id: `TR-${(20480 + i).toString()}`,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@mail.com`,
      country: pick(rng, COUNTRIES),
      status: pick(rng, statuses),
      kyc: pick(rng, kyc),
      tier: pick(rng, tiers),
      accountsCount: Math.floor(rng() * 3) + 1,
      equity: round(rng() * 480_000 + 2_000, 2),
      pnl30d: round((rng() - 0.4) * 60_000, 2),
      riskScore: Math.floor(rng() * 100),
      lastActive: NOW - Math.floor(rng() * 8 * DAY),
      createdAt: NOW - Math.floor(rng() * 400 * DAY) - 5 * DAY,
    });
  }
  return out;
}

export function seedAdminAccounts(traders: TraderRecord[]): AdminAccount[] {
  const rng = makeRng(202);
  const out: AdminAccount[] = [];
  let n = 0;
  for (const t of traders) {
    for (let k = 0; k < t.accountsCount; k++) {
      const balance = round(rng() * 300_000 + 1_000, 2);
      out.push({
        id: `ACC-${(100000 + n).toString()}`,
        traderId: t.id,
        traderName: t.name,
        type: rng() > 0.25 ? "live" : "demo",
        currency: pick(rng, ["USD", "EUR", "GBP"] as const),
        balance,
        equity: round(balance * (1 + (rng() - 0.5) * 0.1), 2),
        leverage: pick(rng, [2, 5, 10, 20, 50] as const),
        status: t.status,
        openPositions: Math.floor(rng() * 8),
        createdAt: t.createdAt + Math.floor(rng() * 30 * DAY),
      });
      n++;
    }
  }
  return out;
}

export function seedRules(): AccountRule[] {
  const rng = makeRng(202);
  return Array.from({ length: 6 }, (_, i) => {
    const name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    return {
      accountId: `ACC-${(100000 + i).toString()}`,
      traderName: name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@mail.com`,
      maxDailyLoss: pick(rng, [2000, 2500, 3000] as const),
      maxDrawdown: pick(rng, [2500, 3000, 4000] as const),
      profitTarget: pick(rng, [5000, 6000, 9000] as const),
      maxContracts: pick(rng, [3, 5, 10] as const),
      // Most accounts trade everything; some are restricted to equity-index futures.
      allowedInstruments: rng() > 0.35 ? INSTRUMENTS.map((x) => x.symbol) : ["ES", "MES", "NQ", "MNQ"],
    };
  });
}

export function seedRuleTemplates(): RuleTemplate[] {
  const ts = NOW;
  const tpl = (
    id: string, label: string, phase: string, accountSize: number, sortOrder: number,
    maxDailyLoss: number, maxDrawdown: number, profitTarget: number, maxContracts: number,
    minTradingDays: number, maxDailyProfitPct: number, maxRiskPerTrade: number,
    maxPositionUnits: number, stopLossRequired: boolean, minHoldTimeSecs: number,
    overnightHoldsProhibited: boolean, weekendHoldsProhibited: boolean,
  ): RuleTemplate => ({
    id, label, phase, accountSize, sortOrder,
    maxDailyLoss, maxDrawdown, profitTarget, maxContracts,
    minTradingDays, maxDailyProfitPct, maxRiskPerTrade,
    maxPositionUnits, stopLossRequired, minHoldTimeSecs,
    overnightHoldsProhibited, weekendHoldsProhibited,
    allowedInstruments: [], updatedAt: ts,
  });
  //                   id          label                               phase              size      ord  dly    dd     tgt   ctrs days  pct   risk  units  sl     secs ovnt  wknd
  return [
    tpl("c1_50k",  "Challenge Phase 1 — $50,000",  "Challenge Phase 1", 50000,    1, 1000,  2000,  1500, 3, 5, 30,  500,  3.0, true,  15, true,  true),
    tpl("c1_100k", "Challenge Phase 1 — $100,000", "Challenge Phase 1", 100000,   2, 2000,  4000,  3000, 3, 5, 30,  1000, 3.0, true,  15, true,  true),
    tpl("c2_50k",  "Challenge Phase 2 — $50,000",  "Challenge Phase 2", 50000,    3, 1000,  1500,  3000, 3, 5, 30,  500,  3.0, true,  15, true,  true),
    tpl("c2_100k", "Challenge Phase 2 — $100,000", "Challenge Phase 2", 100000,   4, 2000,  3000,  6000, 3, 5, 30,  1000, 3.0, true,  15, true,  true),
    tpl("f_50k",   "Funded — $50,000",             "Funded",            50000,    5, 1000,  2000,  0,    3, 0, 0,   0,    3.0, true,  15, true,  true),
    tpl("f_100k",  "Funded — $100,000",            "Funded",            100000,   6, 2000,  4000,  0,    3, 0, 0,   0,    3.0, true,  15, true,  true),
    tpl("f_250k",  "Funded — $250,000",            "Funded",            250000,   7, 5000,  10000, 0,   10, 0, 0,   0,   10.0, true,  15, true,  true),
    tpl("f_500k",  "Funded — $500,000",            "Funded",            500000,   8, 10000, 20000, 0,   20, 0, 0,   0,   20.0, true,  15, true,  true),
    tpl("f_1m",    "Funded — $1,000,000",          "Funded",            1000000,  9, 20000, 40000, 0,   40, 0, 0,   0,   40.0, true,  15, true,  true),
  ];
}

export function seedActivity(count = 40): ActivityEvent[] {
  const rng = makeRng(303);
  const actions = [
    { action: "logged in", target: "portal", severity: "info" as const },
    { action: "placed order", target: "BTC-USD · BUY 0.5", severity: "info" as const },
    { action: "cancelled order", target: "ETH-USD · ORD-100231", severity: "info" as const },
    { action: "hit daily loss limit", target: "circuit breaker", severity: "critical" as const },
    { action: "leverage changed", target: "5x → 20x", severity: "warning" as const },
    { action: "withdrawal requested", target: "$12,500", severity: "warning" as const },
    { action: "KYC approved", target: "verification", severity: "info" as const },
    { action: "account suspended", target: "risk review", severity: "critical" as const },
    { action: "rule updated", target: "RULE-04", severity: "warning" as const },
    { action: "password changed", target: "security", severity: "info" as const },
  ];
  const actors = ["Marvin Weiss", "Alex Admin", "Risk Bot", "Mia Carter", "Liam Müller", "System"];
  const out: ActivityEvent[] = [];
  for (let i = 0; i < count; i++) {
    const a = pick(rng, actions);
    out.push({
      id: `EVT-${70000 + i}`,
      ts: NOW - i * 23 * MIN - Math.floor(rng() * 10 * MIN),
      actor: pick(rng, actors),
      action: a.action,
      target: a.target,
      severity: a.severity,
      ip: `${10 + Math.floor(rng() * 240)}.${Math.floor(rng() * 255)}.${Math.floor(rng() * 255)}.${Math.floor(rng() * 255)}`,
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

const VIOLATION_DETAIL: Record<string, string> = {
  DAILY_LOSS_EXCEEDED: "Daily loss -$2,740 exceeded limit -$2,500",
  MAX_DRAWDOWN_BREACHED: "Drawdown $3,180 breached max $3,000",
  CONTRACT_LIMIT_EXCEEDED: "Order size 8 exceeds max 5 contracts",
  RESTRICTED_INSTRUMENT: "Attempted CL — not in allowed instruments",
};

export function seedViolations(traders: TraderRecord[], count = 14): AdminViolation[] {
  if (traders.length === 0) return [];
  const rng = makeRng(404);
  const types = ["DAILY_LOSS_EXCEEDED", "MAX_DRAWDOWN_BREACHED", "CONTRACT_LIMIT_EXCEEDED", "RESTRICTED_INSTRUMENT"] as const;
  const liqActions = ["LIQUIDATE_POSITION", "SUSPEND_ACCOUNT"] as const;
  const out: AdminViolation[] = [];
  for (let i = 0; i < count; i++) {
    const tr = pick(rng, traders);
    const type = pick(rng, types);
    const action = type === "CONTRACT_LIMIT_EXCEEDED" || type === "RESTRICTED_INSTRUMENT" ? "REJECT_ORDER" : pick(rng, liqActions);
    out.push({
      id: `VIO-${90000 + i}`,
      ts: NOW - i * 2 * HOUR - Math.floor(rng() * HOUR),
      traderId: tr.id,
      traderName: tr.name,
      accountId: `ACC-${100000 + (i % 6)}`,
      type,
      action,
      detail: VIOLATION_DETAIL[type],
    });
  }
  return out.sort((a, b) => b.ts - a.ts);
}

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
