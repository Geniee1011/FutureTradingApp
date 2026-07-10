"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import { getWsClient } from "@/lib/ws-client";
import { USE_MOCK_FEED } from "@/lib/constants";
import type { AnalyticsBucket, OverallAnalytics, TraderAnalytics } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { PhaseBadge, phaseColor } from "@/components/admin/PhaseBadge";
import { PhaseRulesPanel } from "@/components/admin/PhaseRulesPanel";
import { BarChart, WinRateBars, DonutChart, LineChart } from "@/components/admin/charts";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

type Mode = "overall" | "trader";
const money = (v: number) => formatCurrency(v);

// The 4 behavioural dimensions — each rendered twice: once as Average P&L, once as Win rate.
const DIMENSIONS: { title: string; hint: string; data: (o: OverallAnalytics) => AnalyticsBucket[]; phaseColored?: boolean }[] = [
  { title: "phase", hint: "Grouped by the risk phase each trade was in when opened (reconstructed from history).", data: (o) => o.byPhase, phaseColored: true },
  { title: "consecutive losses", hint: "Grouped by the trader's losing streak going into the trade.", data: (o) => o.byConsecutiveLosses },
  { title: "daily-loss consumed", hint: "Grouped by how much of the daily loss limit was already used.", data: (o) => o.byDailyLoss },
  { title: "size deviation", hint: "Trade size vs the trader's trailing 7-day average (oversizing signal).", data: (o) => o.bySizeDeviation },
];

export default function AnalyticsPage() {
  const [mode, setMode] = useState<Mode>("overall");
  const traders = useAdminStore((s) => s.traders);
  const [traderId, setTraderId] = useState<string>("");

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Behavioural risk-phase analytics across traders and per trader." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          <ToggleBtn active={mode === "overall"} onClick={() => setMode("overall")}>Overall</ToggleBtn>
          <ToggleBtn active={mode === "trader"} onClick={() => setMode("trader")}>Per Trader</ToggleBtn>
        </div>
        {mode === "trader" && (
          <select
            value={traderId}
            onChange={(e) => setTraderId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">Select a trader…</option>
            {traders.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — Phase {t.riskPhase ?? 1}</option>
            ))}
          </select>
        )}
      </div>

      {mode === "overall" ? <OverallView /> : <TraderView traderId={traderId} />}
    </div>
  );
}

function OverallView() {
  const getAnalyticsOverall = useAdminStore((s) => s.getAnalyticsOverall);
  const [data, setData] = useState<OverallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setData(await getAnalyticsOverall());
    if (!silent) setLoading(false);
  }, [getAnalyticsOverall]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (USE_MOCK_FEED) return;
    return getWsClient().onMessage((m) => { if (m.type === "admin_update") void load({ silent: true }); });
  }, [load]);

  if (loading && !data) return <Empty>Loading analytics…</Empty>;
  if (!data) return <Empty>Analytics require the backend (not available in demo mode).</Empty>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Closed trades" value={data.totalClosedTrades} />
        <Stat label="Instruments traded" value={data.mostTradedInstruments.length} />
        <Stat label="Shadow P&L (final)" value={money(data.shadowPnlCurve.at(-1)?.value ?? 0)} tone={(data.shadowPnlCurve.at(-1)?.value ?? 0) >= 0 ? "long" : "short"} />
        <Stat label="Traders analysed" value={data.lifetimeWinRateHistogram.reduce((a, b) => a + b.n, 0)} />
      </div>

      {/* Average P&L — one chart per dimension */}
      <GroupHeading>Average P&L</GroupHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <Section key={`pnl-${d.title}`} title={`Average P&L by ${d.title}`} hint={d.hint}>
            <BarChart
              data={d.data(data).map((b, i) => ({ label: b.label, value: b.avgPnl, sub: `n=${b.n}`, color: d.phaseColored ? phaseColor(i + 1) : undefined }))}
              format={money}
            />
          </Section>
        ))}
      </div>

      {/* Win rate — one chart per dimension */}
      <GroupHeading>Win rate</GroupHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <Section key={`wr-${d.title}`} title={`Win rate by ${d.title}`} hint={d.hint}>
            <WinRateBars data={d.data(data)} />
          </Section>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Lifetime win-rate distribution" hint="How every trader's overall win rate (across all their trades) is distributed.">
          <BarChart data={data.lifetimeWinRateHistogram.map((d) => ({ label: d.label, value: d.n }))} format={(v) => String(v)} color="#7c9cff" />
        </Section>
        <Section title="Most traded instruments" hint="Closed-trade count by instrument across all traders.">
          {data.mostTradedInstruments.length ? (
            <DonutChart data={data.mostTradedInstruments.map((i) => ({ label: i.symbol, value: i.n }))} />
          ) : <Empty>No trades yet</Empty>}
        </Section>
        <Section title="Shadow P&L over time" hint="Cumulative P&L if we took the OPPOSITE side of every closed trade." className="lg:col-span-2">
          <LineChart data={data.shadowPnlCurve.map((d) => ({ label: d.day, value: d.value }))} format={money} color="#f0b90b" />
        </Section>
      </div>

      <PhaseRulesPanel onChanged={() => void load({ silent: true })} />
    </div>
  );
}

function TraderView({ traderId }: { traderId: string }) {
  const getAnalyticsTrader = useAdminStore((s) => s.getAnalyticsTrader);
  const [data, setData] = useState<TraderAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!traderId) { setData(null); return; }
    if (!silent) setLoading(true);
    setData(await getAnalyticsTrader(traderId));
    if (!silent) setLoading(false);
  }, [getAnalyticsTrader, traderId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (USE_MOCK_FEED || !traderId) return;
    return getWsClient().onMessage((m) => { if (m.type === "admin_update") void load({ silent: true }); });
  }, [load, traderId]);

  if (!traderId) return <Empty>Select a trader to see their live state, session curve and lifetime stats.</Empty>;
  if (loading && !data) return <Empty>Loading trader…</Empty>;
  if (!data || !data.state) return <Empty>No analytics for this trader yet.</Empty>;

  const s = data.state;
  const v = s.variables;

  return (
    <div className="space-y-4">
      {/* Live state */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <PhaseBadge phase={s.riskPhase} size="lg" />
          <div>
            <div className="text-sm font-medium text-foreground">Current risk phase</div>
            <div className="text-xs text-muted">Recomputed on every trade event</div>
          </div>
          <Button variant="secondary" size="sm" className="ml-auto" onClick={() => void load()}>Refresh</Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Session P&L" value={money(s.sessionPnl)} tone={s.sessionPnl >= 0 ? "long" : "short"} />
          <Metric label="Session trades" value={s.sessionTradeCount} />
          <Metric label="Daily loss used" value={`${v.daily_loss_pct_consumed.toFixed(0)}%`} tone={v.daily_loss_pct_consumed >= 70 ? "short" : v.daily_loss_pct_consumed >= 40 ? "warning" : "neutral"} />
          <Metric label="Session win rate" value={`${s.sessionWinRate.toFixed(0)}%`} />
          <Metric label="Consec. losses" value={v.consecutive_losses} tone={v.consecutive_losses >= 2 ? "short" : "neutral"} />
          <Metric label="Consec. wins" value={v.consecutive_wins} tone={v.consecutive_wins > 0 ? "long" : "neutral"} />
          <Metric label="Last trade" value={s.lastTradeResult ?? "—"} />
          <Metric label="Size deviation" value={`${v.size_deviation_ratio.toFixed(2)}x`} />
          <Metric label="Min since last trade" value={s.minutesSinceLastTrade ?? "—"} />
          <Metric label="Time in session" value={`${v.time_in_session_minutes}m`} />
          <Metric label="Drawdown used" value={`${v.current_drawdown_consumed_pct.toFixed(0)}%`} tone={v.current_drawdown_consumed_pct >= 70 ? "short" : "neutral"} />
          <Metric label="Challenge P&L" value={`${v.current_challenge_pnl_pct.toFixed(0)}%`} tone={v.current_challenge_pnl_pct >= 0 ? "long" : "short"} />
          <Metric label="Challenge day" value={v.challenge_day} />
          <Metric label="Reset count" value={v.reset_count} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Today's session P&L" hint="Cumulative realized P&L since the 9:30 ET session open.">
          <LineChart
            data={data.sessionCurve.map((p, i) => ({ label: i === 0 ? "open" : "", value: p.value }))}
            format={money}
            color={phaseColor(s.riskPhase)}
          />
        </Section>
        <Section title="Trades by phase" hint="How many of this trader's trades fell in each risk phase (reconstructed from history).">
          <BarChart data={data.tradesByPhase.map((d) => ({ label: `P${d.phase}`, value: d.n, color: phaseColor(d.phase) }))} format={(x) => String(x)} />
        </Section>
      </div>

      {/* Lifetime */}
      <Card className="p-4">
        <div className="mb-3 text-sm font-medium text-foreground">Lifetime stats</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Win rate (overall)" value={`${s.lifetimeWinRate.toFixed(1)}%`} />
          <Metric label="Win rate ES" value={`${s.lifetimeWinRateEs.toFixed(0)}%`} />
          <Metric label="Win rate NQ" value={`${s.lifetimeWinRateNq.toFixed(0)}%`} />
          <Metric label="Win rate GC" value={`${s.lifetimeWinRateGc.toFixed(0)}%`} />
          <Metric label="Win rate CL" value={`${s.lifetimeWinRateCl.toFixed(0)}%`} />
          <Metric label="Avg win" value={money(s.lifetimeAvgWin)} tone="long" />
          <Metric label="Avg loss" value={money(s.lifetimeAvgLoss)} tone="short" />
          <Metric label="Total trades" value={s.lifetimeTradeCount} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3 text-sm font-medium text-foreground">Trade history ({data.trades.length})</div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-3 py-2 font-medium">Closed</th>
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Side</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">Entry</th>
                <th className="px-3 py-2 text-right font-medium">Exit</th>
                <th className="px-3 py-2 text-right font-medium">P&L</th>
                <th className="px-3 py-2 text-center font-medium">Phase</th>
              </tr>
            </thead>
            <tbody>
              {data.trades.map((t) => (
                <tr key={t.id} className="border-b border-border/60 hover:bg-surface-2">
                  <td className="px-3 py-2 text-xs text-muted">{formatDateTime(t.closedAt)}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{t.symbol}</td>
                  <td className={cn("px-3 py-2 text-xs", t.side === "LONG" ? "text-long" : "text-short")}>{t.side}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.quantity}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{t.entryPrice}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{t.exitPrice}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums", t.realizedPnl >= 0 ? "text-long" : "text-short")}>{money(t.realizedPnl)}</td>
                  <td className="px-3 py-2 text-center">{t.phaseAtOpen ? <PhaseBadge phase={t.phaseAtOpen} /> : <span className="text-muted-2">—</span>}</td>
                </tr>
              ))}
              {data.trades.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">No closed trades.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --- small UI helpers ---

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", active ? "bg-primary text-white" : "text-muted hover:text-foreground")}
    >
      {children}
    </button>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">{children}</h3>;
}

function Section({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="mb-3">
        <div className="text-sm font-medium text-foreground">{title}</div>
        {hint && <div className="text-xs text-muted">{hint}</div>}
      </div>
      {children}
    </Card>
  );
}

const TONE: Record<string, string> = { long: "text-long", short: "text-short", warning: "text-warning", neutral: "text-foreground" };
function Metric({ label, value, tone = "neutral" }: { label: string; value: React.ReactNode; tone?: "long" | "short" | "warning" | "neutral" }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={cn("mt-0.5 text-base font-semibold tabular-nums", TONE[tone])}>{value}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center rounded-lg border border-border bg-surface py-16 text-sm text-muted">{children}</div>;
}
