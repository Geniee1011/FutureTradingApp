"use client";

import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { AccountRule } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";

type Editable = Pick<AccountRule, "maxDailyLoss" | "maxDrawdown" | "profitTarget" | "maxContracts">;
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
              <th className="px-4 py-2.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <RuleRow key={r.accountId} rule={r} onSave={(patch) => updateRule(r.accountId, patch)} />
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={FIELDS.length + 2} className="px-4 py-12 text-center text-sm text-muted">
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

function RuleRow({ rule, onSave }: { rule: AccountRule; onSave: (patch: Editable) => Promise<void> }) {
  const [vals, setVals] = useState<Editable>({
    maxDailyLoss: rule.maxDailyLoss,
    maxDrawdown: rule.maxDrawdown,
    profitTarget: rule.profitTarget,
    maxContracts: rule.maxContracts,
  });
  const [saving, setSaving] = useState(false);
  const dirty = FIELDS.some((f) => vals[f.key] !== rule[f.key]);

  async function save() {
    setSaving(true);
    await onSave(vals);
    setSaving(false);
  }

  return (
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
        <Button size="sm" variant="secondary" loading={saving} disabled={!dirty || saving} onClick={save}>
          Save
        </Button>
      </td>
    </tr>
  );
}
