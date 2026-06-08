/** Reads the current theme's chart colors from the CSS tokens so the charts
    stay in sync with light/dark mode. Call on the client only. */
export interface ChartColors {
  text: string;
  grid: string;
  border: string;
  up: string;
  down: string;
  volume: string;
  primary: string;
}

export function getChartColors(): ChartColors {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    text: v("--color-muted", "#8a97ad"),
    grid: v("--color-surface-3", "#1d2738"),
    border: v("--color-border", "#243049"),
    up: v("--color-long", "#16c784"),
    down: v("--color-short", "#ea3943"),
    volume: v("--color-border-strong", "#33415e"),
    primary: v("--color-primary", "#3b82f6"),
  };
}
