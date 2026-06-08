/* ------------------------------------------------------------------ *
 * Deterministic seed data for the demo. Generated with a seeded RNG so
 * server and client render identically (no hydration mismatch). Replace
 * these with TradingBackend REST calls when the API is available.
 * ------------------------------------------------------------------ */

import { seededRandom } from "../utils";
import { INSTRUMENTS } from "../constants";
import type {
  AccountSummary,
  ActivityEvent,
  AdminAccount,
  Order,
  OrderStatus,
  Position,
  Side,
  TradingRule,
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
    const unrealized = (markPrice - avgPrice) * qty * dir;
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

export function seedRules(): TradingRule[] {
  return [
    { id: "RULE-01", name: "Global max leverage", kind: "max-leverage", scope: "global", target: "all", value: "50x", enabled: true, updatedAt: NOW - 12 * DAY, updatedBy: "Alex Admin" },
    { id: "RULE-02", name: "Platinum max position", kind: "max-position-size", scope: "tier", target: "platinum", value: "$2,000,000", enabled: true, updatedAt: NOW - 3 * DAY, updatedBy: "Alex Admin" },
    { id: "RULE-03", name: "Gold max position", kind: "max-position-size", scope: "tier", target: "gold", value: "$750,000", enabled: true, updatedAt: NOW - 3 * DAY, updatedBy: "Alex Admin" },
    { id: "RULE-04", name: "Daily loss circuit breaker", kind: "max-daily-loss", scope: "global", target: "all", value: "15% of equity", enabled: true, updatedAt: NOW - 20 * DAY, updatedBy: "Risk Bot" },
    { id: "RULE-05", name: "Crypto-only weekend trading", kind: "instrument-whitelist", scope: "global", target: "all", value: "BTC-USD, ETH-USD, SOL-USD", enabled: false, updatedAt: NOW - 40 * DAY, updatedBy: "Alex Admin" },
    { id: "RULE-06", name: "Equities trading hours", kind: "trading-hours", scope: "global", target: "stocks", value: "13:30–20:00 UTC, Mon–Fri", enabled: true, updatedAt: NOW - 8 * DAY, updatedBy: "Alex Admin" },
    { id: "RULE-07", name: "Bronze max leverage", kind: "max-leverage", scope: "tier", target: "bronze", value: "10x", enabled: true, updatedAt: NOW - 2 * DAY, updatedBy: "Alex Admin" },
    { id: "RULE-08", name: "TR-20488 position freeze", kind: "max-position-size", scope: "trader", target: "TR-20488", value: "$0 (frozen)", enabled: true, updatedAt: NOW - 6 * HOUR, updatedBy: "Risk Bot" },
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

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
