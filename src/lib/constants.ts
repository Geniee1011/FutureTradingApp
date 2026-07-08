import type { Instrument } from "./types";

/** WebSocket endpoint for the TradingBackend. Falls back to the built-in mock feed. */
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

/** Whether to use the built-in simulated market feed (no backend required). */
export const USE_MOCK_FEED = !WS_URL;

export const SESSION_COOKIE = "tp_session";

/**
 * Tradable futures (CME E-mini + Micro). `symbol` is the product root; the
 * backend maps it to the most-active dated contract via Databento continuous
 * symbology and resolves the display code (e.g. ES → ESM6). `basePrice`/`tickSize`
 * seed the mock feed and the click-to-trade ticket.
 */
export const INSTRUMENTS: Instrument[] = [
  { symbol: "ES", name: "E-mini S&P 500", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 7574, multiplier: 50, marginPerContract: 13200 },
  { symbol: "MES", name: "Micro E-mini S&P 500", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 7574, multiplier: 5, marginPerContract: 1320 },
  { symbol: "NQ", name: "E-mini Nasdaq-100", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 30264, multiplier: 20, marginPerContract: 16500 },
  { symbol: "MNQ", name: "Micro E-mini Nasdaq-100", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 30264, multiplier: 2, marginPerContract: 1650 },
  { symbol: "YM", name: "E-mini Dow ($5)", category: "Equity Index", pricePrecision: 0, tickSize: 1, basePrice: 47000, multiplier: 5, marginPerContract: 9900 },
  { symbol: "MYM", name: "Micro E-mini Dow ($0.50)", category: "Equity Index", pricePrecision: 0, tickSize: 1, basePrice: 47000, multiplier: 0.5, marginPerContract: 990 },
  { symbol: "CL", name: "Crude Oil (WTI)", category: "Energy", pricePrecision: 2, tickSize: 0.01, basePrice: 93, multiplier: 1000, marginPerContract: 6600 },
  { symbol: "MCL", name: "Micro Crude Oil", category: "Energy", pricePrecision: 2, tickSize: 0.01, basePrice: 93, multiplier: 100, marginPerContract: 660 },
  { symbol: "GC", name: "Gold", category: "Metals", pricePrecision: 1, tickSize: 0.1, basePrice: 4488, multiplier: 100, marginPerContract: 11000 },
  { symbol: "MGC", name: "Micro Gold", category: "Metals", pricePrecision: 1, tickSize: 0.1, basePrice: 4488, multiplier: 10, marginPerContract: 1100 },
];

export const DEFAULT_SYMBOL = "ES";

// CME month codes (F Jan … Z Dec) — used to strip a dated contract code to its product root.
const MONTH_CODES = "FGHJKMNQUVXZ";

/**
 * Resolve an instrument by base symbol ("GC") OR a dated contract code ("GCG6", "ESM6").
 * The chart/datafeed can be driven by either form, so falling back to the root keeps the
 * price precision / tick size / multiplier correct instead of defaulting to 2dp @ 0.01.
 */
export function getInstrument(symbol: string): Instrument | undefined {
  const direct = INSTRUMENTS.find((i) => i.symbol === symbol);
  if (direct) return direct;
  const root = symbol?.match(new RegExp(`^([A-Z]+?)[${MONTH_CODES}]\\d{1,2}$`))?.[1];
  return root ? INSTRUMENTS.find((i) => i.symbol === root) : undefined;
}

/** Contract point value in USD for a symbol (defaults to 1 for unknown symbols). */
export function getMultiplier(symbol: string): number {
  return getInstrument(symbol)?.multiplier ?? 1;
}

/** Intraday margin (USD) required to hold one contract of a symbol. */
export function getMargin(symbol: string): number {
  return getInstrument(symbol)?.marginPerContract ?? 0;
}

/* ------------------------------- Nav ------------------------------ */

export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide-style key resolved in components/icons
}

export const TRADER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/trade", label: "Trade", icon: "trade" },
  { href: "/orders", label: "Orders", icon: "orders" },
  { href: "/account", label: "Account", icon: "account" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/traders", label: "Traders", icon: "users" },
  { href: "/admin/accounts", label: "Accounts", icon: "account" },
  { href: "/admin/reviews", label: "Reviews", icon: "bell" },
  { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
  { href: "/admin/positions", label: "Positions", icon: "trade" },
  { href: "/admin/rules", label: "Rules", icon: "rules" },
  { href: "/admin/violations", label: "Violations", icon: "alert" },
  { href: "/admin/activity", label: "Activity", icon: "activity" },
];
