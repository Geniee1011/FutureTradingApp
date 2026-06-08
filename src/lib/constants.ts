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
  { symbol: "ES", name: "E-mini S&P 500", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 7574 },
  { symbol: "MES", name: "Micro E-mini S&P 500", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 7574 },
  { symbol: "NQ", name: "E-mini Nasdaq-100", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 30264 },
  { symbol: "MNQ", name: "Micro E-mini Nasdaq-100", category: "Equity Index", pricePrecision: 2, tickSize: 0.25, basePrice: 30264 },
  { symbol: "YM", name: "E-mini Dow ($5)", category: "Equity Index", pricePrecision: 0, tickSize: 1, basePrice: 47000 },
  { symbol: "MYM", name: "Micro E-mini Dow ($0.50)", category: "Equity Index", pricePrecision: 0, tickSize: 1, basePrice: 47000 },
  { symbol: "CL", name: "Crude Oil (WTI)", category: "Energy", pricePrecision: 2, tickSize: 0.01, basePrice: 93 },
  { symbol: "MCL", name: "Micro Crude Oil", category: "Energy", pricePrecision: 2, tickSize: 0.01, basePrice: 93 },
  { symbol: "GC", name: "Gold", category: "Metals", pricePrecision: 1, tickSize: 0.1, basePrice: 4488 },
  { symbol: "MGC", name: "Micro Gold", category: "Metals", pricePrecision: 1, tickSize: 0.1, basePrice: 4488 },
];

export const DEFAULT_SYMBOL = "ES";

export function getInstrument(symbol: string): Instrument | undefined {
  return INSTRUMENTS.find((i) => i.symbol === symbol);
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
  { href: "/admin/rules", label: "Rules", icon: "rules" },
  { href: "/admin/activity", label: "Activity", icon: "activity" },
];
