/* Ambient declaration for the (optional, licensed) TradingView Charting
   Library loaded from /public/charting_library at runtime. Kept minimal so the
   datafeed/loader compile without the proprietary type package. */

interface TradingViewWidgetOptions {
  symbol: string;
  interval: string;
  container: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  datafeed: any;
  library_path: string;
  locale: string;
  theme?: "light" | "dark";
  autosize?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  overrides?: Record<string, any>;
  disabled_features?: string[];
  enabled_features?: string[];
  custom_css_url?: string;
}

interface TradingViewWidgetInstance {
  onChartReady(cb: () => void): void;
  remove(): void;
}

interface TradingViewWidgetConstructor {
  new (options: TradingViewWidgetOptions): TradingViewWidgetInstance;
}

interface Window {
  TradingView?: { widget: TradingViewWidgetConstructor };
}
