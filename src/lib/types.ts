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
}

export interface AccountSummary {
  accountId: string;
  currency: string;
  status: "ACTIVE" | "PASSED" | "FAILED" | "SUSPENDED";
  startingBalance: number;
  balance: number; // cash
  equity: number; // balance + unrealized pnl
  unrealizedPnl: number;
  realizedPnlToday: number; // dailyPnl
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
      balance: number;
      equity: number;
      unrealizedPnl: number;
      realizedPnlToday: number;
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
