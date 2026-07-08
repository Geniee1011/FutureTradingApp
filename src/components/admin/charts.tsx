"use client";

/* Hand-rolled, dependency-free chart primitives for the admin Analytics page.
 * SVG + CSS only, theme-token colored, responsive. (lightweight-charts is
 * time-series only; these cover bars / histograms / donut / simple lines.) */

const PALETTE = ["#3b82f6", "#16c784", "#f0b90b", "#f97316", "#ea3943", "#7c9cff", "#a855f7", "#14b8a6", "#22d3ee", "#f472b6"];

export interface BarDatum {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}

/** Vertical bars. Supports signed values (bars diverge from a zero baseline). */
export function BarChart({ data, format = (v) => String(v), height = 170, color = "var(--color-primary)" }: {
  data: BarDatum[];
  format?: (v: number) => string;
  height?: number;
  color?: string;
}) {
  const max = Math.max(1e-9, ...data.map((d) => Math.abs(d.value)));
  const hasNeg = data.some((d) => d.value < 0);
  return (
    <div className="flex items-stretch gap-2" style={{ height }}>
      {data.map((d, i) => {
        const frac = Math.abs(d.value) / max;
        const bg = d.color ?? color;
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="mb-1 text-[10px] tabular-nums text-foreground/80">{format(d.value)}</div>
            <div className="relative w-full flex-1">
              {hasNeg && <div className="absolute inset-x-0 top-1/2 border-t border-border-strong" />}
              <div
                className="absolute left-[18%] right-[18%] rounded-[3px]"
                style={
                  hasNeg
                    ? d.value >= 0
                      ? { bottom: "50%", height: `${frac * 50}%`, background: bg }
                      : { top: "50%", height: `${frac * 50}%`, background: bg }
                    : { bottom: 0, height: `${Math.max(frac * 100, 1)}%`, background: bg }
                }
              />
            </div>
            <div className="mt-1.5 truncate text-center text-[10px] text-muted" title={d.label}>{d.label}</div>
            {d.sub && <div className="text-[9px] text-muted-2">{d.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Win-rate bars (0-100%), green→red by rate, with the sample size beneath. */
export function WinRateBars({ data, height = 170 }: { data: { label: string; winRate: number; n: number }[]; height?: number }) {
  return (
    <div className="flex items-stretch gap-2" style={{ height }}>
      {data.map((d, i) => {
        const color = d.winRate >= 55 ? "#16c784" : d.winRate >= 45 ? "#f0b90b" : "#ea3943";
        return (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="mb-1 text-[10px] tabular-nums text-foreground/80">{d.n > 0 ? `${d.winRate.toFixed(0)}%` : "—"}</div>
            <div className="relative w-full flex-1">
              <div className="absolute left-[18%] right-[18%] rounded-[3px]" style={{ bottom: 0, height: `${Math.max(d.winRate, d.n > 0 ? 1 : 0)}%`, background: color }} />
            </div>
            <div className="mt-1.5 truncate text-center text-[10px] text-muted" title={d.label}>{d.label}</div>
            <div className="text-[9px] text-muted-2">n={d.n}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Simple donut with legend. */
export function DonutChart({ data, size = 150 }: { data: { label: string; value: number }[]; size?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = 60;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = total > 0 ? data.map((d, i) => {
    const frac = d.value / total;
    const seg = { dash: frac * c, offset: offset * c, color: PALETTE[i % PALETTE.length]! };
    offset += frac;
    return seg;
  }) : [];
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 160 160" className="shrink-0">
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth="18" />
          {segments.map((s, i) => (
            <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={s.color} strokeWidth="18"
              strokeDasharray={`${s.dash} ${c - s.dash}`} strokeDashoffset={-s.offset} />
          ))}
        </g>
        <text x="80" y="84" textAnchor="middle" className="fill-foreground text-lg font-semibold">{total}</text>
      </svg>
      <div className="min-w-0 space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="truncate text-foreground">{d.label}</span>
            <span className="ml-auto tabular-nums text-muted">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Cumulative line chart (SVG). Handles negative values with a zero baseline. */
export function LineChart({ data, height = 200, format = (v) => String(v), color = "#3b82f6" }: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (v: number) => string;
  color?: string;
}) {
  if (data.length === 0) return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>No data yet</div>;
  const values = data.map((d) => d.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min || 1;
  const W = 100;
  const H = 100;
  const x = (i: number) => (data.length === 1 ? W / 2 : (i / (data.length - 1)) * W);
  const y = (v: number) => H - ((v - min) / span) * H;
  const line = data.map((d, i) => `${x(i).toFixed(2)},${y(d.value).toFixed(2)}`).join(" ");
  const area = `0,${y(0).toFixed(2)} ${line} ${W},${y(0).toFixed(2)}`;
  const zeroY = y(0);
  const last = data[data.length - 1]!;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-muted">{format(max)}</span>
        <span className={`tabular-nums font-medium ${last.value >= 0 ? "text-long" : "text-short"}`}>{format(last.value)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }} className="overflow-visible">
        <polygon points={area} fill={color} opacity={0.12} />
        {min < 0 && <line x1="0" y1={zeroY} x2={W} y2={zeroY} stroke="var(--color-border-strong)" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
        <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-2">
        <span>{data[0]!.label}</span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}
