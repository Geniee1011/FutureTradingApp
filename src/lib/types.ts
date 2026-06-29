/* ------------------------------------------------------------------ *
 * Shared domain types for the Trader Portal + Admin CRM.
 * These mirror the contracts the TradingBackend is expected to expose.
 * ------------------------------------------------------------------ */

export type Role = "trader" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
}

/* ----------------------------- Market ----------------------------- */

export type InstrumentCategory = "Equity Index" | "Energy" | "Metals";

export interface Instrument {
  symbol: string; // root code, e.g. "ES"
  name: string; // e.g. "E-mini S&P 500"
  category: InstrumentCategory;
  pricePrecision: number; // decimal places for price
  tickSize: number; // minimum price increment
  basePrice: number; // seed price used by the mock feed
  multiplier: number; // contract point value in USD (P&L per 1.00 point × qty), e.g. ES=$50
  marginPerContract: number; // USD margin required to hold one contract (intraday)
}

/** A live top-of-book quote / ticker snapshot. */
export interface Quote {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  change24h: number; // fractional, e.g. 0.0123
  high24h: number;
  low24h: number;
  volume24h: number;
  lastSize?: number; // size of the trade that produced this tick (0 on stats-only refresh)
  ts: number; // epoch ms
}

/** A single OHLC candle (epoch seconds, as TradingView expects). */
export interface Candle {
  time: number; // epoch seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  ts: number;
}

/* ----------------------------- Trading ---------------------------- */

export type Side = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop";
export type TimeInForce = "GTC" | "IOC" | "FOK" | "DAY";
export type OrderStatus =
  | "pending"
  | "open"
  | "partial"
  | "filled"
  | "cancelled"
  | "rejected";

export interface Order {
  id: string;
  symbol: string;
  side: Side;
  type: OrderType;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  price: number | null; // limit/stop price, null for market
  avgFillPrice: number | null;
  timeInForce: TimeInForce;
  createdAt: number;
  updatedAt: number;
  reason?: string; // populated on reject/cancel
  bracketRole?: "SL" | "TP"; // set when this order is a bracket exit leg (stop-loss / take-profit)
  slPrice?: number | null; // bracket stop-loss on a working entry, shown until it fills (then a real SL leg exists)
  tpPrice?: number | null; // bracket take-profit on a working entry, shown until it fills (then a real TP leg exists)
}

export interface Position {
  symbol: string;
  side: Side; // net direction
  quantity: number;
  avgPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

/* ----------------------------- Account ---------------------------- */

/** Evaluation objectives for an account (from the Rule table). */
export interface EvalRule {
  profitTarget: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  maxContracts: number;
  // Per-trade limits surfaced to the trade ticket (optional: admin views omit them).
  maxRiskPerTrade?: number;   // max implied SL risk per entry (0 = disabled)
  maxPositionUnits?: number;  // cross-instrument mini-equivalents (0 = disabled)
  stopLossRequired?: boolean; // SL + TP mandatory at entry
  minHoldTimeSecs?: number;   // trade open < this → profit voided
}

export interface AccountSummary {
  accountId: string;
  currency: string;
  status: "ACTIVE" | "PASSED" | "FAILED" | "SUSPENDED";
  statusReason?: string | null; // why a non-ACTIVE account is in that state (the breach detail)
  startingBalance: number;
  balance: number; // cash
  equity: number; // balance + unrealized pnl
  unrealizedPnl: number;
  realizedPnlToday: number; // realized P&L booked today
  dailyPnl: number; // equity-based day P&L (vs day-start equity) — drives the daily-loss limit
  totalPnl: number;
  drawdown: number;
  highestEquity: number;
  rule: EvalRule;
}

export interface Transaction {
  id: string;
  ts: number;
  type: "deposit" | "withdrawal" | "fee" | "trade" | "funding";
  amount: number;
  description: string;
}

/* --------------------------- Admin / CRM -------------------------- */

export type TraderStatus = "active" | "suspended" | "pending" | "closed";
export type KycStatus = "verified" | "pending" | "rejected" | "unsubmitted";

export interface TraderRecord {
  id: string;
  name: string;
  email: string;
  country: string;
  status: TraderStatus;
  kyc: KycStatus;
  tier: "bronze" | "silver" | "gold" | "platinum";
  accountsCount: number;
  equity: number;
  pnl30d: number;
  riskScore: number; // 0-100
  lastActive: number;
  createdAt: number;
  accountSize?: number | null; // assigned rule-tier size ($50K…$1M), null if unassigned
  accountPhase?: string | null; // 'Challenge Phase 1' | 'Challenge Phase 2' | 'Funded'
}

export interface AdminAccount {
  id: string;
  traderId: string;
  traderName: string;
  type: "live" | "demo";
  currency: string;
  balance: number;
  equity: number;
  leverage: number;
  status: TraderStatus;
  openPositions: number;
  createdAt: number;
}

export type RuleScope = "global" | "tier" | "trader";
export type RuleKind =
  | "max-leverage"
  | "max-position-size"
  | "max-daily-loss"
  | "instrument-whitelist"
  | "trading-hours";

export interface TradingRule {
  id: string;
  name: string;
  kind: RuleKind;
  scope: RuleScope;
  target: string; // "all", a tier name, or a trader id
  value: string; // human-readable rule value
  enabled: boolean;
  updatedAt: number;
  updatedBy: string;
}

/** Per-account evaluation limits (the real backend Rule the risk engine enforces). */
export interface AccountRule {
  accountId: string;
  traderName: string;
  email: string;
  maxDailyLoss: number;
  maxDrawdown: number;
  profitTarget: number;
  maxContracts: number;
  allowedInstruments: string[];
}

/** Global rule template for one account tier (e.g. "Challenge Phase 1 — $50,000").
 *  Editing a template cascades the values to every linked account's per-account Rule. */
export interface RuleTemplate {
  id: string;
  label: string;
  phase: string;        // 'Challenge Phase 1' | 'Challenge Phase 2' | 'Funded'
  accountSize: number;  // 50000 | 100000 | 250000 | 500000 | 1000000
  sortOrder: number;
  maxDailyLoss: number;
  maxDrawdown: number;
  profitTarget: number; // 0 = no target (funded accounts)
  maxContracts: number;
  minTradingDays: number;       // distinct calendar days before target qualifies for pass
  maxDailyProfitPct: number;    // % of profit target; day contribution cap
  maxRiskPerTrade: number;      // max implied SL risk per entry (0 = disabled)
  maxPositionUnits: number;     // cross-instrument mini-equivalents (0 = disabled)
  stopLossRequired: boolean;    // SL + TP mandatory on every entry
  minHoldTimeSecs: number;      // trade open < this → profit voided (loss still real)
  overnightHoldsProhibited: boolean;
  weekendHoldsProhibited: boolean;
  drawdownType: "INTRADAY" | "EOD"; // INTRADAY = real-time trailing; EOD = floor snapshots at session close
  allowedInstruments: string[]; // empty = all instruments allowed
  updatedAt: number;
}

/* Single-trader detail (admin/traders/:id). */
export interface TraderDetailAccount {
  id: string;
  startingBalance: number;
  balance: number;
  equity: number;
  dailyPnl: number;
  totalPnl: number;
  drawdown: number;
  highestEquity: number;
  status: string;
  currency: string;
  ruleTemplateId?: string | null;
  createdAt: number;
}
export interface TraderDetailPosition {
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  averagePrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}
export interface TraderDetailOrder {
  id: string;
  symbol: string;
  side: string;
  type: string;
  quantity: number;
  filledQuantity: number;
  requestedPrice: number | null;
  fillPrice: number | null;
  status: string;
  reason: string | null;
  createdAt: number;
}
export interface TraderViolation {
  id: string;
  ts: number;
  type: string;
  action: string;
  detail: string | null;
}
export interface TraderDetail {
  trader: TraderRecord;
  account: TraderDetailAccount | null;
  rule: EvalRule | null;
  positions: TraderDetailPosition[];
  orders: TraderDetailOrder[];
  violations: TraderViolation[];
  activity: ActivityEvent[];
}

/** A rule violation in the admin Violations list (joined with the trader). */
export interface AdminViolation {
  id: string;
  ts: number;
  traderId: string;
  traderName: string;
  accountId: string;
  type: string; // e.g. DAILY_LOSS_EXCEEDED
  action: string; // e.g. LIQUIDATE_POSITION
  detail: string | null;
}

/** An open position across any account (admin-wide Positions view). */
export interface AdminOpenPosition {
  id: string;
  traderId: string;
  traderName: string;
  accountId: string;
  symbol: string;
  side: string; // LONG | SHORT
  quantity: number;
  averagePrice: number;
  realizedPnl: number;
  unrealizedPnl: number;
  openedAt: number;
  stopLoss?: number | null; // protective bracket levels (open OCO exit legs), null if none set
  takeProfit?: number | null;
}

/** A closed/reduced position across any account (admin-wide Positions view). */
export interface AdminClosedPosition {
  id: string;
  traderId: string;
  traderName: string;
  accountId: string;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  openedAt: number;
  closedAt: number;
}

export type ActivitySeverity = "info" | "warning" | "critical";

export interface ActivityEvent {
  id: string;
  ts: number;
  actor: string; // who triggered it
  action: string; // short verb phrase
  target: string; // what it affected
  severity: ActivitySeverity;
  ip?: string;
  detail?: string;
}

/* ----------------------- WebSocket protocol ----------------------- */

export type ServerMessage =
  | { type: "quote"; data: Quote }
  | { type: "orderbook"; data: OrderBook }
  | { type: "candle"; data: { symbol: string; candle: Candle } }
  | { type: "order"; data: Order }
  | { type: "account"; data: AccountSummary }
  | { type: "activity"; data: ActivityEvent }
  // Channel gateway (flat) messages:
  | { type: "auth_ok"; userId: string; role: string }
  | { type: "auth_error"; message: string }
  | {
      type: "position_update";
      symbol: string;
      side: Side;
      quantity: number;
      avgPrice: number;
      markPrice: number;
      unrealizedPnl: number;
      pnl: number;
    }
  | {
      type: "account_update";
      status: "ACTIVE" | "PASSED" | "FAILED" | "SUSPENDED";
      balance: number;
      equity: number;
      unrealizedPnl: number;
      realizedPnlToday: number;
      dailyPnl: number;
      totalPnl: number;
      drawdown: number;
    }
  | { type: "order_update"; order: Order }
  | { type: "positions_snapshot"; positions: Position[] }
  | { type: "admin_update"; event: unknown };

export type ClientMessage =
  | { type: "auth"; token: string }
  | { type: "subscribe"; channel: string; symbol?: string }
  | { type: "unsubscribe"; channel: string; symbol?: string };

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";
