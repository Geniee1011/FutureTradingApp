"use client";

import { useState } from "react";
import { useOrdersStore } from "@/store/orders-store";
import type { OrderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { OrdersTable } from "@/components/trade/OrdersTable";
import { PositionsTable } from "@/components/trade/PositionsTable";
import { cn } from "@/lib/utils";

type Filter = "all" | "open" | "filled" | "cancelled" | "rejected";

const FILTERS: { key: Filter; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "Working", match: (s) => s === "open" || s === "partial" || s === "pending" },
  { key: "filled", label: "Filled", match: (s) => s === "filled" },
  { key: "cancelled", label: "Cancelled", match: (s) => s === "cancelled" },
  { key: "rejected", label: "Rejected", match: (s) => s === "rejected" },
];

export default function OrdersPage() {
  const orders = useOrdersStore((s) => s.orders);
  const [filter, setFilter] = useState<Filter>("all");

  const active = FILTERS.find((f) => f.key === filter)!;
  const filtered = orders.filter((o) => active.match(o.status));

  return (
    <div>
      <PageHeader title="Orders & Positions" subtitle="Manage your working orders and open exposure." />

      <Card className="mb-4 overflow-hidden">
        <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Open positions
        </div>
        <PositionsTable />
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
          {FILTERS.map((f) => {
            const count = orders.filter((o) => f.match(o.status)).length;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f.key ? "bg-surface-3 text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {f.label}
                <span className="ml-1.5 text-muted-2">{count}</span>
              </button>
            );
          })}
        </div>
        <OrdersTable orders={filtered} />
      </Card>
    </div>
  );
}
