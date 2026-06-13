"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminStore } from "@/store/admin-store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, cn } from "@/lib/utils";

/** Pretty label + tone per violation rule type. */
const TYPE_META: Record<string, { label: string; tone: "short" | "warning" }> = {
  DAILY_LOSS_EXCEEDED: { label: "Daily loss", tone: "short" },
  MAX_DRAWDOWN_BREACHED: { label: "Max drawdown", tone: "short" },
  CONTRACT_LIMIT_EXCEEDED: { label: "Contract limit", tone: "warning" },
  RESTRICTED_INSTRUMENT: { label: "Restricted instrument", tone: "warning" },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "DAILY_LOSS_EXCEEDED", label: "Daily loss" },
  { key: "MAX_DRAWDOWN_BREACHED", label: "Drawdown" },
  { key: "CONTRACT_LIMIT_EXCEEDED", label: "Contracts" },
  { key: "RESTRICTED_INSTRUMENT", label: "Instrument" },
];

function typeLabel(type: string) {
  return TYPE_META[type]?.label ?? type.replace(/_/g, " ").toLowerCase();
}

export default function ViolationsPage() {
  const violations = useAdminStore((s) => s.violations);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = violations.filter((v) => {
    if (filter !== "all" && v.type !== filter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return `${v.traderName} ${v.type} ${v.action} ${v.detail ?? ""}`.toLowerCase().includes(q);
    }
    return true;
  });

  const today = violations.filter((v) => Date.now() - v.ts < 24 * 3600_000).length;
  const liquidations = violations.filter((v) => v.action === "LIQUIDATE_POSITION" || v.action === "SUSPEND_ACCOUNT").length;
  const traders = new Set(violations.map((v) => v.traderId)).size;

  return (
    <div>
      <PageHeader title="Violations" subtitle="Rule breaches across all evaluation accounts." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total violations" value={violations.length} tone={violations.length > 0 ? "short" : "neutral"} />
        <Stat label="Last 24h" value={today} tone={today > 0 ? "short" : "neutral"} />
        <Stat label="Liquidations / suspensions" value={liquidations} />
        <Stat label="Traders affected" value={traders} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f.key ? "bg-surface-3 text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by trader, rule, detail…"
            className="h-9 w-full max-w-xs rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Trader</th>
                <th className="px-4 py-2.5 font-medium">Rule type</th>
                <th className="px-4 py-2.5 font-medium">Action taken</th>
                <th className="px-4 py-2.5 font-medium">Detail (expected vs actual)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-border/60 hover:bg-surface-2">
                  <td className="nums px-4 py-2.5 text-muted">{formatDateTime(v.ts)}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/traders/${v.traderId}`} className="font-medium text-foreground hover:underline">
                      {v.traderName}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={TYPE_META[v.type]?.tone ?? "warning"}>{typeLabel(v.type)}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{v.action.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="px-4 py-2.5 text-muted">{v.detail ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted">
                    {violations.length === 0 ? "No violations recorded — all accounts in good standing." : "No matching violations."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
