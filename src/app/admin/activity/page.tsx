"use client";

import { useState } from "react";
import { useAdminStore } from "@/store/admin-store";
import type { ActivitySeverity } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, cn } from "@/lib/utils";

const SEVERITY_TONE: Record<ActivitySeverity, "neutral" | "warning" | "short"> = {
  info: "neutral",
  warning: "warning",
  critical: "short",
};

const FILTERS: { key: ActivitySeverity | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "info", label: "Info" },
  { key: "warning", label: "Warning" },
  { key: "critical", label: "Critical" },
];

export default function ActivityPage() {
  const activity = useAdminStore((s) => s.activity);
  const [filter, setFilter] = useState<ActivitySeverity | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = activity.filter((e) => {
    if (filter !== "all" && e.severity !== filter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return `${e.actor} ${e.action} ${e.target} ${e.ip ?? ""}`.toLowerCase().includes(q);
    }
    return true;
  });

  const critical = activity.filter((e) => e.severity === "critical").length;
  const warnings = activity.filter((e) => e.severity === "warning").length;

  return (
    <div>
      <PageHeader title="Activity Log" subtitle="Platform-wide audit trail of trader and admin actions." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total events" value={activity.length} />
        <Stat label="Critical" value={critical} tone={critical > 0 ? "short" : "neutral"} />
        <Stat label="Warnings" value={warnings} tone={warnings > 0 ? "short" : "neutral"} />
        <Stat label="Window" value="24h" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1">
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
            placeholder="Search events…"
            className="h-9 w-full max-w-xs rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <ul className="divide-y divide-border">
          {filtered.map((e) => (
            <li key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2">
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  e.severity === "critical" ? "bg-short" : e.severity === "warning" ? "bg-warning" : "bg-muted-2",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 text-sm">
                  <span className="font-medium">{e.actor}</span>
                  <span className="text-muted">{e.action}</span>
                  <span className="font-medium text-foreground">{e.target}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-2">
                  <span className="nums">{formatDateTime(e.ts)}</span>
                  {e.ip && <span className="nums">IP {e.ip}</span>}
                  <span className="nums">{e.id}</span>
                </div>
              </div>
              <Badge tone={SEVERITY_TONE[e.severity]}>{e.severity}</Badge>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-muted">No matching events.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
