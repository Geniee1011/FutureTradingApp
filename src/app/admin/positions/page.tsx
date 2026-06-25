"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAdminStore } from "@/store/admin-store";
import { getWsClient } from "@/lib/ws-client";
import { USE_MOCK_FEED } from "@/lib/constants";
import type { AdminClosedPosition, AdminOpenPosition } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatPrice, formatDateTime, cn } from "@/lib/utils";

type Tab = "open" | "closed";

function pnlClass(n: number) {
  return n > 0 ? "text-long" : n < 0 ? "text-short" : "text-muted";
}

function SideBadge({ side }: { side: string }) {
  return <Badge tone={side === "LONG" ? "long" : "short"}>{side}</Badge>;
}

export default function AdminPositionsPage() {
  const getAllPositions = useAdminStore((s) => s.getAllPositions);

  const [open, setOpen] = useState<AdminOpenPosition[]>([]);
  const [closed, setClosed] = useState<AdminClosedPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("open");
  const [query, setQuery] = useState("");

  // `silent` skips the spinner so a background poll never flickers the table or the
  // Refresh button — it just swaps in the fresh rows (incl. live TP/SL, P&L, new positions).
  const load = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!silent) setLoading(true);
      const data = await getAllPositions();
      setOpen(data.open);
      setClosed(data.closed);
      if (!silent) setLoading(false);
    },
    [getAllPositions],
  );

  // Initial load (with spinner).
  useEffect(() => {
    void load();
  }, [load]);

  // Coalesce a burst of pushes into one reload — e.g. a bracket replace emits several
  // order updates (cancel old legs + add new) in quick succession.
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current) return;
    reloadTimer.current = setTimeout(() => {
      reloadTimer.current = null;
      void load({ silent: true });
    }, 150);
  }, [load]);

  // INSTANT updates: the backend pushes an `admin_update` on every trader order/bracket/
  // fill/cancel (and admin/risk events), so a TP/SL add or change reflects here immediately
  // — no manual refresh, no poll latency. AdminProvider already authenticates + subscribes
  // the admin-updates channel; we just react to it with a (debounced) silent reload.
  useEffect(() => {
    if (USE_MOCK_FEED) return;
    const off = getWsClient().onMessage((msg) => {
      if (msg.type === "admin_update") scheduleReload();
    });
    return off;
  }, [scheduleReload]);

  // Safety net: a slow silent poll while the tab is visible covers any missed push and
  // keeps unrealized P&L fresh (P&L drifts each tick and isn't pushed structurally).
  // Also refreshes immediately on tab refocus.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load({ silent: true });
    };
    const id = setInterval(tick, 10000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const q = query.trim().toLowerCase();
  const matches = (s: { traderName: string; symbol: string; side: string }) =>
    !q || `${s.traderName} ${s.symbol} ${s.side}`.toLowerCase().includes(q);

  const openRows = open.filter(matches);
  const closedRows = closed.filter(matches);

  const openUnrealized = open.reduce((s, p) => s + p.unrealizedPnl, 0);
  const closedRealized = closed.reduce((s, p) => s + p.realizedPnl, 0);
  const tradersWithOpen = new Set(open.map((p) => p.traderId)).size;

  return (
    <div>
      <PageHeader title="Positions" subtitle="Every active and closed position across all traders." />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open positions" value={open.length} />
        <Stat label="Open unrealized P&L" value={formatCurrency(openUnrealized)} tone={openUnrealized >= 0 ? "long" : "short"} />
        <Stat label="Closed positions" value={closed.length} />
        <Stat label="Closed realized P&L" value={formatCurrency(closedRealized)} tone={closedRealized >= 0 ? "long" : "short"} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1">
            <TabButton active={tab === "open"} onClick={() => setTab("open")}>
              Active ({open.length})
            </TabButton>
            <TabButton active={tab === "closed"} onClick={() => setTab("closed")}>
              Closed ({closed.length})
            </TabButton>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by trader, symbol…"
              className="h-9 w-full max-w-xs rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-muted-2 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button variant="secondary" size="sm" onClick={() => void load()} loading={loading}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {tab === "open" ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <Th>Trader</Th>
                  <Th>Symbol</Th>
                  <Th>Side</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Avg price</Th>
                  <Th className="text-right">Take profit</Th>
                  <Th className="text-right">Stop loss</Th>
                  <Th className="text-right">Unrealized P&L</Th>
                  <Th className="text-right">Realized (booked)</Th>
                  <Th>Opened</Th>
                </tr>
              </thead>
              <tbody>
                {openRows.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 hover:bg-surface-2">
                    <Td>
                      <Link href={`/admin/traders/${p.traderId}`} className="font-medium text-foreground hover:underline">
                        {p.traderName}
                      </Link>
                    </Td>
                    <Td className="font-medium">{p.symbol}</Td>
                    <Td><SideBadge side={p.side} /></Td>
                    <Td className="nums text-right">{p.quantity}</Td>
                    <Td className="nums text-right">{formatPrice(p.averagePrice)}</Td>
                    <Td className="nums text-right">
                      {p.takeProfit != null ? <span className="text-long">{formatPrice(p.takeProfit)}</span> : <span className="text-muted-2">—</span>}
                    </Td>
                    <Td className="nums text-right">
                      {p.stopLoss != null ? <span className="text-short">{formatPrice(p.stopLoss)}</span> : <span className="text-muted-2">—</span>}
                    </Td>
                    <Td className={cn("nums text-right", pnlClass(p.unrealizedPnl))}>{formatCurrency(p.unrealizedPnl)}</Td>
                    <Td className={cn("nums text-right", pnlClass(p.realizedPnl))}>{formatCurrency(p.realizedPnl)}</Td>
                    <Td className="nums text-muted">{formatDateTime(p.openedAt)}</Td>
                  </tr>
                ))}
                {openRows.length === 0 && (
                  <EmptyRow span={10}>
                    {loading ? "Loading…" : open.length === 0 ? "No open positions across any account." : "No matching positions."}
                  </EmptyRow>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <Th>Trader</Th>
                  <Th>Symbol</Th>
                  <Th>Side</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Entry</Th>
                  <Th className="text-right">Exit</Th>
                  <Th className="text-right">Realized P&L</Th>
                  <Th>Opened</Th>
                  <Th>Closed</Th>
                </tr>
              </thead>
              <tbody>
                {closedRows.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 hover:bg-surface-2">
                    <Td>
                      <Link href={`/admin/traders/${p.traderId}`} className="font-medium text-foreground hover:underline">
                        {p.traderName}
                      </Link>
                    </Td>
                    <Td className="font-medium">{p.symbol}</Td>
                    <Td><SideBadge side={p.side} /></Td>
                    <Td className="nums text-right">{p.quantity}</Td>
                    <Td className="nums text-right">{formatPrice(p.entryPrice)}</Td>
                    <Td className="nums text-right">{formatPrice(p.exitPrice)}</Td>
                    <Td className={cn("nums text-right", pnlClass(p.realizedPnl))}>{formatCurrency(p.realizedPnl)}</Td>
                    <Td className="nums text-muted">{formatDateTime(p.openedAt)}</Td>
                    <Td className="nums text-muted">{formatDateTime(p.closedAt)}</Td>
                  </tr>
                ))}
                {closedRows.length === 0 && (
                  <EmptyRow span={9}>
                    {loading ? "Loading…" : closed.length === 0 ? "No closed positions yet." : "No matching positions."}
                  </EmptyRow>
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <p className="mt-3 text-xs text-muted-2">
        {tradersWithOpen} trader(s) currently holding positions. Open P&L is the last persisted mark; closed P&L is final.
      </p>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "bg-surface-3 text-foreground" : "text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2.5 font-medium", className)}>{children}</th>;
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-2.5", className)}>{children}</td>;
}

function EmptyRow({ span, children }: { span: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={span} className="px-4 py-12 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}
