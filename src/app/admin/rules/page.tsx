"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { RuleTemplate } from "@/lib/types";
import { INSTRUMENTS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const ALL_SYMBOLS = INSTRUMENTS.map((i) => i.symbol);

type TemplatePatch = Partial<RuleTemplate> & { allowedInstruments: string[] };

const PHASE_ORDER = ["Challenge Phase 1", "Challenge Phase 2", "Funded"];

function formatAccountSize(n: number): string {
  if (n >= 1_000_000) return `$${n / 1_000_000}M`;
  if (n >= 1_000)     return `$${n / 1_000}K`;
  return `$${n}`;
}

export default function RulesPage() {
  const getRuleTemplates   = useAdminStore((s) => s.getRuleTemplates);
  const updateRuleTemplate = useAdminStore((s) => s.updateRuleTemplate);

  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getRuleTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, [getRuleTemplates]);

  const grouped = PHASE_ORDER.map((phase) => ({
    phase,
    items: templates.filter((t) => t.phase === phase),
  }));

  const handleSave = async (id: string, patch: TemplatePatch) => {
    await updateRuleTemplate(id, patch);
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  return (
    <div>
      <PageHeader
        title="Evaluation Rules"
        subtitle="Global risk limits per account tier — changes apply to every trader in that tier."
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Account tiers" value={templates.length} />
        <Stat label="Challenge phases" value={2} />
        <Stat label="Funded tiers" value={templates.filter((t) => t.phase === "Funded").length} />
        <Stat label="Enforcement" value="Live" tone="long" />
      </div>

      {loading ? (
        <Card className="px-4 py-12 text-center text-sm text-muted">Loading templates…</Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ phase, items }) => (
            <section key={phase}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{phase}</h2>
              <Card className="overflow-hidden divide-y divide-border">
                {items.length === 0 && (
                  <p className="px-4 py-6 text-sm text-muted-2">No templates for this phase.</p>
                )}
                {items.map((tpl) => (
                  <TemplateRow key={tpl.id} template={tpl} onSave={(p) => handleSave(tpl.id, p)} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateRow({ template, onSave }: { template: RuleTemplate; onSave: (patch: TemplatePatch) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [vals, setVals] = useState({ ...template });
  const [instruments, setInstruments] = useState<string[]>(template.allowedInstruments);
  const [instrExpanded, setInstrExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const effectiveInstruments = instruments.length === 0 ? ALL_SYMBOLS : instruments;

  const dirty =
    vals.maxDailyLoss !== template.maxDailyLoss ||
    vals.maxDrawdown  !== template.maxDrawdown  ||
    vals.profitTarget !== template.profitTarget ||
    vals.maxContracts !== template.maxContracts ||
    vals.minTradingDays !== template.minTradingDays ||
    vals.maxDailyProfitPct !== template.maxDailyProfitPct ||
    vals.maxRiskPerTrade !== template.maxRiskPerTrade ||
    vals.maxPositionUnits !== template.maxPositionUnits ||
    vals.stopLossRequired !== template.stopLossRequired ||
    vals.minHoldTimeSecs !== template.minHoldTimeSecs ||
    vals.overnightHoldsProhibited !== template.overnightHoldsProhibited ||
    vals.weekendHoldsProhibited !== template.weekendHoldsProhibited ||
    vals.drawdownType !== template.drawdownType ||
    !sameSet(instruments, template.allowedInstruments);

  function toggle(sym: string) {
    setInstruments((cur) => {
      const active = cur.length === 0 ? ALL_SYMBOLS : cur;
      const next = active.includes(sym) ? active.filter((s) => s !== sym) : [...active, sym];
      return next.length === ALL_SYMBOLS.length ? [] : next;
    });
  }

  async function save() {
    setSaving(true);
    await onSave({ ...vals, allowedInstruments: instruments });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function numField(key: keyof typeof vals, label: string, money: boolean, hint?: string) {
    return (
      <div key={key}>
        <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
        <div className="flex items-center gap-1">
          {money && <span className="text-sm text-muted-2">$</span>}
          <input
            type="number"
            min="0"
            value={vals[key] as number}
            onChange={(e) => setVals((v) => ({ ...v, [key]: Number(e.target.value) }))}
            className="nums w-full rounded-md border border-border bg-surface px-2 py-1.5 text-right text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {hint && <p className="mt-0.5 text-xs text-muted-2">{hint}</p>}
      </div>
    );
  }

  function toggle2(key: keyof typeof vals, label: string, hint?: string) {
    const on = vals[key] as boolean;
    return (
      <div key={key} className="flex items-start gap-3">
        <button
          role="switch"
          aria-checked={on}
          onClick={() => setVals((v) => ({ ...v, [key]: !on }))}
          className={cn(
            "mt-0.5 h-5 w-9 shrink-0 rounded-full border-2 transition-colors",
            on ? "border-primary bg-primary" : "border-border bg-surface-2",
          )}
        >
          <span className={cn("block h-3.5 w-3.5 translate-x-0.5 rounded-full bg-white transition-transform", on ? "translate-x-[18px]" : "")} />
        </button>
        <div>
          <span className="text-xs font-medium text-foreground">{label}</span>
          {hint && <p className="text-xs text-muted-2">{hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Collapsed header row */}
      <button
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-2 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className={cn("text-xs transition-transform", expanded ? "rotate-90" : "")}>▶</span>
        <span className="font-semibold text-foreground">
          {formatAccountSize(template.accountSize)}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {saved && <span className="text-xs font-medium text-long">Saved ✓</span>}
          <span className="hidden text-xs text-muted-2 sm:inline">
            {expanded ? "Hide details" : "Edit rules"}
          </span>
        </span>
      </button>

      {/* Expanded edit panel */}
      {expanded && (
        <div className="border-t border-border/60 bg-surface-2/40 px-4 pb-4 pt-3">
          <p className="mb-4 text-xs text-muted">
            Changes here apply globally to every account on the <strong>{template.label}</strong> tier.
          </p>

          {/* ── Risk limits ── */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Risk limits</h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {numField("maxDailyLoss",    "Max daily loss",          true)}
            {numField("maxDrawdown",     "Drawdown limit",          true)}
            {numField("maxRiskPerTrade", "Max risk per trade",      true, "0 = disabled")}
            {numField("maxPositionUnits","Max position (mini-equiv)",false, "e.g. 3 = 3 minis / 30 micros")}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Drawdown type</label>
              <select
                value={vals.drawdownType}
                onChange={(e) => setVals((v) => ({ ...v, drawdownType: e.target.value as "INTRADAY" | "EOD" }))}
                className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="INTRADAY">Intraday trailing</option>
                <option value="EOD">End-of-day trailing</option>
              </select>
              <p className="mt-0.5 text-xs text-muted-2">
                {vals.drawdownType === "EOD"
                  ? "Floor updates once at session close, off the day's peak equity"
                  : "Floor ratchets up live on unrealized P&L"}
              </p>
            </div>
          </div>

          {/* ── Profit / advancement ── */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Profit &amp; advancement</h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {numField("profitTarget",      "Profit target",         true,  "0 = no target (funded accounts)")}
            {numField("minTradingDays",    "Min trading days",      false, "0 = disabled")}
            {numField("maxDailyProfitPct", "Max daily contribution",false, "% of target (30 = 30%)")}
            {numField("maxContracts",      "Max contracts (legacy)", false, "overridden by max units when > 0")}
          </div>

          {/* ── Hold-time & bracket ── */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Hold time &amp; bracket</h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {numField("minHoldTimeSecs", "Min hold time (seconds)", false, "profit voided if closed before")}
          </div>

          {/* ── Prohibitions (toggles) ── */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Prohibitions</h3>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {toggle2("stopLossRequired",          "SL + TP required",       "Both stop loss and take profit must be set at entry")}
            {toggle2("overnightHoldsProhibited",  "Overnight holds banned",  "Positions auto-close at market close")}
            {toggle2("weekendHoldsProhibited",    "Weekend holds banned",    "Positions auto-close Friday at market close")}
          </div>

          {/* ── Instruments ── */}
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Allowed instruments</h3>
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-3">
              <button
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium hover:bg-surface-3",
                  !sameSet(instruments, template.allowedInstruments) ? "border-primary/60 text-primary" : "border-border text-muted",
                )}
                onClick={() => setInstrExpanded((e) => !e)}
              >
                {instruments.length === 0 ? "All" : `${instruments.length}/${ALL_SYMBOLS.length}`} ▾
              </button>
              {instrExpanded && (
                <>
                  <button className="text-xs text-primary hover:underline" onClick={() => setInstruments([])}>All</button>
                  <button className="text-xs text-primary hover:underline" onClick={() => setInstruments(ALL_SYMBOLS)}>Restrict all</button>
                </>
              )}
            </div>
            {instrExpanded && (
              <div className="flex flex-wrap gap-1.5">
                {ALL_SYMBOLS.map((sym) => {
                  const on = effectiveInstruments.includes(sym);
                  return (
                    <button
                      key={sym}
                      onClick={() => toggle(sym)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border text-muted hover:text-foreground",
                      )}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" loading={saving} disabled={!dirty || saving} onClick={save}>
              Save changes
            </Button>
            {saved && <span className="text-xs font-medium text-long">Saved — all linked accounts updated ✓</span>}
            {dirty && !saved && <span className="text-xs text-muted">Unsaved changes</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}
