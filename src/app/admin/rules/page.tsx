"use client";

import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { AccountRule } from "@/lib/types";
import { INSTRUMENTS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { formatCurrency, cn } from "@/lib/utils";

type Editable = Pick<AccountRule, "maxDailyLoss" | "maxDrawdown" | "profitTarget" | "maxContracts">;
type RulePatch = Editable & { allowedInstruments: string[] };
const ALL_SYMBOLS = INSTRUMENTS.map((i) => i.symbol);
const FIELDS: { key: keyof Editable; label: string; money: boolean }[] = [
  { key: "maxDailyLoss", label: "Max daily loss", money: true },
  { key: "maxDrawdown", label: "Max drawdown", money: true },
  { key: "profitTarget", label: "Profit target", money: true },
  { key: "maxContracts", label: "Max contracts", money: false },
];

export default function RulesPage() {
  const rules = useAdminStore((s) => s.rules);
  const updateRule = useAdminStore((s) => s.updateRule);

  const avgTarget = rules.length ? rules.reduce((a, r) => a + r.profitTarget, 0) / rules.length : 0;
  const avgDrawdown = rules.length ? rules.reduce((a, r) => a + r.maxDrawdown, 0) / rules.length : 0;

  return (
    <div>
      <PageHeader
        title="Evaluation Rules"
        subtitle="Per-account risk limits enforced live by the evaluation engine."
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Accounts" value={rules.length} />
        <Stat label="Avg profit target" value={formatCurrency(avgTarget)} tone="long" />
        <Stat label="Avg max drawdown" value={formatCurrency(avgDrawdown)} />
        <Stat label="Enforcement" value="Live" tone="long" />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2.5 font-medium">Account</th>
              {FIELDS.map((f) => (
                <th key={f.key} className="px-4 py-2.5 text-right font-medium">{f.label}</th>
              ))}
              <th className="px-4 py-2.5 text-right font-medium">Instruments</th>
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <RuleRow key={r.accountId} rule={r} onSave={(patch) => updateRule(r.accountId, patch)} />
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={FIELDS.length + 3} className="px-4 py-12 text-center text-sm text-muted">
                  No accounts to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function RuleRow({ rule, onSave }: { rule: AccountRule; onSave: (patch: RulePatch) => Promise<void> }) {
  const [vals, setVals] = useState<Editable>({
    maxDailyLoss: rule.maxDailyLoss,
    maxDrawdown: rule.maxDrawdown,
    profitTarget: rule.profitTarget,
    maxContracts: rule.maxContracts,
  });
  const [instruments, setInstruments] = useState<string[]>(rule.allowedInstruments ?? []);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  const numericDirty = FIELDS.some((f) => vals[f.key] !== rule[f.key]);
  const instrDirty = !sameSet(instruments, rule.allowedInstruments ?? []);
  const dirty = numericDirty || instrDirty;

  function toggle(sym: string) {
    setInstruments((cur) => (cur.includes(sym) ? cur.filter((s) => s !== sym) : [...cur, sym]));
  }

  async function save() {
    setSaving(true);
    await onSave({ ...vals, allowedInstruments: instruments });
    setSaving(false);
  }

  return (
    <>
      <tr className="border-b border-border/60 hover:bg-surface-2">
        <td className="px-4 py-2.5">
          <div className="nums font-medium text-foreground">{rule.accountId}</div>
          <div className="text-xs text-muted-2">{rule.traderName}</div>
        </td>
        {FIELDS.map((f) => (
          <td key={f.key} className="px-4 py-2.5 text-right">
            <div className="flex items-center justify-end gap-1">
              {f.money && <span className="text-muted-2">$</span>}
              <input
                type="number"
                min="0"
                value={vals[f.key]}
                onChange={(e) => setVals((v) => ({ ...v, [f.key]: Number(e.target.value) }))}
                className="nums w-24 rounded-md border border-border bg-surface-2 px-2 py-1 text-right text-sm text-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </td>
        ))}
        <td className="px-4 py-2.5 text-right">
          <button
            onClick={() => setExpanded((e) => !e)}
            className={cn("rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-surface-3", instrDirty && "border-primary/60 text-primary")}
          >
            {instruments.length === ALL_SYMBOLS.length ? "All" : `${instruments.length}/${ALL_SYMBOLS.length}`} ▾
          </button>
        </td>
        <td className="px-4 py-2.5 text-right">
          <Button size="sm" variant="secondary" loading={saving} disabled={!dirty || saving} onClick={save}>
            Save
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border/60 bg-surface-2/40">
          <td colSpan={FIELDS.length + 3} className="px-4 py-3">
            <div className="mb-2 flex items-center gap-3 text-xs text-muted">
              <span>Allowed instruments</span>
              <button className="text-primary hover:underline" onClick={() => setInstruments(ALL_SYMBOLS)}>Select all</button>
              <button className="text-primary hover:underline" onClick={() => setInstruments([])}>Clear</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SYMBOLS.map((sym) => {
                const on = instruments.includes(sym);
                return (
                  <button
                    key={sym}
                    onClick={() => toggle(sym)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      on ? "border-primary/40 bg-primary/15 text-primary" : "border-border text-muted hover:text-foreground",
                    )}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}
