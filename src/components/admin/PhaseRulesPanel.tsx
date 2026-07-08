"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { PhaseRule } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PhaseBadge } from "@/components/admin/PhaseBadge";
import { cn } from "@/lib/utils";

const VARIABLES = [
  "consecutive_losses", "consecutive_wins", "session_trade_count", "daily_loss_pct_consumed",
  "session_pnl", "session_win_rate", "time_in_session_minutes", "size_deviation_ratio",
  "current_drawdown_consumed_pct", "current_challenge_pnl_pct", "challenge_day", "reset_count",
  "lifetime_win_rate", "lifetime_trade_count",
];
const OPERATORS = [">=", "<=", ">", "<", "="];

const blankDraft = { variable: "consecutive_losses", operator: ">=", value: 0, assignsPhase: 2, priority: 100, notes: "" };

/** Editable phase ruleset — the rules engine reads these live (no deploy needed). */
export function PhaseRulesPanel({ onChanged }: { onChanged?: () => void }) {
  const getPhaseRules = useAdminStore((s) => s.getPhaseRules);
  const createPhaseRule = useAdminStore((s) => s.createPhaseRule);
  const updatePhaseRule = useAdminStore((s) => s.updatePhaseRule);
  const deletePhaseRule = useAdminStore((s) => s.deletePhaseRule);

  const [rules, setRules] = useState<PhaseRule[]>([]);
  const [draft, setDraft] = useState({ ...blankDraft });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setRules(await getPhaseRules()), [getPhaseRules]);
  useEffect(() => { void load(); }, [load]);

  const patch = async (ruleId: number, p: Partial<PhaseRule>) => {
    setError(null);
    const res = await updatePhaseRule(ruleId, p);
    if (!res.ok) return setError(res.error ?? "Update failed");
    await load();
    onChanged?.();
  };

  const add = async () => {
    setBusy(true);
    setError(null);
    const res = await createPhaseRule(draft);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Create failed");
    setDraft({ ...blankDraft });
    await load();
    onChanged?.();
  };

  const remove = async (ruleId: number) => {
    if (!confirm("Delete this rule?")) return;
    await deletePhaseRule(ruleId);
    await load();
    onChanged?.();
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-medium text-foreground">Phase rules</div>
        <div className="text-xs text-muted">
          Active rules, checked by priority (lower first). A trader is assigned the highest phase whose rule matches; none match → phase 1.
        </div>
      </div>
      {error && <div className="border-b border-short/40 bg-short/10 px-4 py-2 text-xs text-short">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Variable</th>
              <th className="px-3 py-2 font-medium">Op</th>
              <th className="px-3 py-2 font-medium">Value</th>
              <th className="px-3 py-2 font-medium">Assigns</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium">Active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.ruleId} className={cn("border-b border-border/60", !r.active && "opacity-50")}>
                <td className="px-3 py-2 font-mono text-xs text-foreground">{r.variable}</td>
                <td className="px-3 py-2">{r.operator}</td>
                <td className="px-3 py-2">
                  <NumCell value={r.value} onCommit={(v) => patch(r.ruleId, { value: v })} />
                </td>
                <td className="px-3 py-2"><PhaseBadge phase={r.assignsPhase} /></td>
                <td className="px-3 py-2">
                  <NumCell value={r.priority} onCommit={(v) => patch(r.ruleId, { priority: v })} width="w-14" />
                </td>
                <td className="max-w-[180px] truncate px-3 py-2 text-xs text-muted" title={r.notes ?? ""}>{r.notes ?? "—"}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => void patch(r.ruleId, { active: !r.active })}
                    className={cn("rounded px-2 py-0.5 text-xs font-medium", r.active ? "bg-long/15 text-long" : "bg-surface-3 text-muted")}
                  >
                    {r.active ? "on" : "off"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button variant="danger" size="sm" onClick={() => void remove(r.ruleId)}>Delete</Button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-xs text-muted">No rules — add one below.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-strong bg-surface-2">
              <td className="px-3 py-2">
                <select className={selectCls} value={draft.variable} onChange={(e) => setDraft({ ...draft, variable: e.target.value })}>
                  {VARIABLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <select className={selectCls} value={draft.operator} onChange={(e) => setDraft({ ...draft, operator: e.target.value })}>
                  {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <input type="number" className={cn(inputCls, "w-20")} value={draft.value} onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })} />
              </td>
              <td className="px-3 py-2">
                <select className={selectCls} value={draft.assignsPhase} onChange={(e) => setDraft({ ...draft, assignsPhase: Number(e.target.value) })}>
                  {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <input type="number" className={cn(inputCls, "w-14")} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
              </td>
              <td className="px-3 py-2">
                <input className={cn(inputCls, "w-full")} placeholder="note (optional)" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
              </td>
              <td className="px-3 py-2 text-xs text-muted-2">new</td>
              <td className="px-3 py-2 text-right">
                <Button size="sm" onClick={() => void add()} loading={busy}>Add</Button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}

const inputCls = "rounded border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-primary";
const selectCls = inputCls;

/** A number cell that commits on blur / Enter. */
function NumCell({ value, onCommit, width = "w-20" }: { value: number; onCommit: (v: number) => void; width?: string }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => { const num = Number(v); if (Number.isFinite(num) && num !== value) onCommit(num); };
  return (
    <input
      type="number"
      className={cn(inputCls, width)}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  );
}
