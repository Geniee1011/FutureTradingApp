"use client";

import { useAdminStore } from "@/store/admin-store";
import type { RuleKind, RuleScope } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime, cn } from "@/lib/utils";

const KIND_LABEL: Record<RuleKind, string> = {
  "max-leverage": "Max leverage",
  "max-position-size": "Max position size",
  "max-daily-loss": "Max daily loss",
  "instrument-whitelist": "Instrument whitelist",
  "trading-hours": "Trading hours",
};
const SCOPE_TONE: Record<RuleScope, "primary" | "info" | "warning"> = {
  global: "primary",
  tier: "info",
  trader: "warning",
};

export default function RulesPage() {
  const rules = useAdminStore((s) => s.rules);
  const toggleRule = useAdminStore((s) => s.toggleRule);

  const enabled = rules.filter((r) => r.enabled).length;

  return (
    <div>
      <PageHeader
        title="Trading Rules"
        subtitle="Risk limits and trading restrictions applied across the platform."
        actions={<Button>New rule</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total rules" value={rules.length} />
        <Stat label="Enabled" value={enabled} tone="long" />
        <Stat label="Disabled" value={rules.length - enabled} tone="neutral" />
        <Stat label="Trader-specific" value={rules.filter((r) => r.scope === "trader").length} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {rules.map((rule) => (
          <Card key={rule.id} className={cn("p-4", !rule.enabled && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold">{rule.name}</h3>
                  <Badge tone={SCOPE_TONE[rule.scope]}>{rule.scope}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted">
                  {KIND_LABEL[rule.kind]} · target <span className="nums text-foreground">{rule.target}</span>
                </div>
              </div>
              <button
                onClick={() => toggleRule(rule.id)}
                role="switch"
                aria-checked={rule.enabled}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  rule.enabled ? "bg-long" : "bg-surface-3",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    rule.enabled ? "translate-x-[22px]" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-2">Value</div>
              <div className="nums text-sm font-medium">{rule.value}</div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-2">
              <span>Updated {formatDateTime(rule.updatedAt)}</span>
              <span>by {rule.updatedBy}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
