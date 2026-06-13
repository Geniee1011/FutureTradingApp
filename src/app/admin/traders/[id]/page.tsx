"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminStore, type AdminActionResult } from "@/store/admin-store";
import type { TraderDetail, TraderStatus } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { formatCurrency, formatPrice, formatDateTime, timeAgo, cn } from "@/lib/utils";

const NOW = Date.UTC(2026, 5, 11, 12, 0, 0);

const STATUS_TONE: Record<TraderStatus, "long" | "short" | "warning" | "neutral"> = {
  active: "long",
  suspended: "short",
  pending: "warning",
  closed: "neutral",
};
const SEVERITY_TONE = { info: "neutral", warning: "warning", critical: "short" } as const;
const ORDER_TONE: Record<string, "long" | "short" | "warning" | "info" | "neutral"> = {
  FILLED: "long",
  PARTIALLY_FILLED: "info",
  PENDING: "warning",
  CANCELLED: "neutral",
  REJECTED: "short",
};

/** Label/value row used in the Profile + Account cards. */
function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="nums font-medium text-foreground">{value}</span>
    </div>
  );
}

function pnlClass(v: number) {
  return v > 0 ? "text-long" : v < 0 ? "text-short" : "text-muted";
}

export default function TraderDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const getTraderDetail = useAdminStore((s) => s.getTraderDetail);
  const setTraderStatus = useAdminStore((s) => s.setTraderStatus);
  const resetAccount = useAdminStore((s) => s.resetAccount);
  const adjustBalance = useAdminStore((s) => s.adjustBalance);
  const closeAllPositions = useAdminStore((s) => s.closeAllPositions);
  const liquidateAccount = useAdminStore((s) => s.liquidateAccount);
  const cancelOrders = useAdminStore((s) => s.cancelOrders);
  const seeded = useAdminStore((s) => s.seeded);

  const [detail, setDetail] = useState<TraderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Make sure the admin datasets are loaded (mock mode assembles the detail from them).
  useEffect(() => {
    useAdminStore.getState().seed();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTraderDetail(id).then((d) => {
      if (!cancelled) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id, getTraderDetail, seeded]);

  async function toggleStatus() {
    if (!detail) return;
    setBusy(true);
    const next: TraderStatus = detail.trader.status === "active" ? "suspended" : "active";
    await setTraderStatus(detail.trader.id, next);
    const d = await getTraderDetail(id);
    setDetail(d);
    setBusy(false);
  }

  async function runAction(key: string, fn: () => Promise<AdminActionResult>, confirmMsg?: string) {
    if (!detail?.account) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setActionBusy(key);
    setActionMsg(null);
    const r = await fn();
    const d = await getTraderDetail(id);
    setDetail(d);
    setActionBusy(null);
    setActionMsg({ ok: r.ok, text: r.ok ? actionSuccess(key, r) : `✗ ${r.error ?? "Action failed"}` });
    setTimeout(() => setActionMsg(null), 4000);
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-muted">Loading trader…</div>;
  }
  if (!detail) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted">Trader not found.</p>
        <Link href="/admin/traders" className="mt-3 inline-block text-sm text-primary hover:underline">
          ← Back to traders
        </Link>
      </div>
    );
  }

  const { trader, account, rule, positions, orders, violations, activity } = detail;
  const profitPct = rule && account ? clampPct((account.totalPnl / rule.profitTarget) * 100) : 0;
  const ddPct = rule && account ? clampPct((account.drawdown / rule.maxDrawdown) * 100) : 0;
  const workingOrders = orders.filter((o) => o.status === "PENDING" || o.status === "PARTIALLY_FILLED").length;

  return (
    <div>
      <Link href="/admin/traders" className="mb-3 inline-block text-sm text-muted hover:text-foreground">
        ← Traders
      </Link>

      <PageHeader
        title={trader.name}
        subtitle={
          <span className="flex items-center gap-2">
            {trader.email}
            <Badge tone={STATUS_TONE[trader.status]}>{trader.status}</Badge>
            <Badge tone="neutral">{trader.tier}</Badge>
          </span>
        }
        actions={
          trader.status === "active" ? (
            <Button variant="danger" size="sm" loading={busy} onClick={toggleStatus}>
              Suspend trader
            </Button>
          ) : (
            <Button variant="secondary" size="sm" loading={busy} onClick={toggleStatus}>
              Activate trader
            </Button>
          )
        }
      />

      {/* Headline KPIs */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Equity" value={formatCurrency(trader.equity)} />
        <Stat
          label="Total P&L"
          value={formatCurrency(trader.pnl30d)}
          tone={trader.pnl30d >= 0 ? "long" : "short"}
        />
        <Stat label="Drawdown" value={formatCurrency(account?.drawdown ?? 0)} />
        <Stat
          label="Risk score"
          value={trader.riskScore}
          tone={trader.riskScore > 70 ? "short" : trader.riskScore > 40 ? "neutral" : "long"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="py-2">
            <KV label="Name" value={trader.name} />
            <KV label="Email" value={trader.email} />
            <KV label="Country" value={trader.country} />
            <KV label="Tier" value={<Badge tone="neutral">{trader.tier}</Badge>} />
            <KV label="KYC" value={<Badge tone={trader.kyc === "verified" ? "long" : "warning"}>{trader.kyc}</Badge>} />
            <KV label="Member since" value={formatDateTime(trader.createdAt)} />
            <KV label="Last active" value={timeAgo(trader.lastActive, NOW)} />
          </CardBody>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader
            title="Account"
            subtitle={account ? account.id : undefined}
            action={account ? <Badge tone={STATUS_TONE[mapAccountStatus(account.status)]}>{account.status}</Badge> : undefined}
          />
          <CardBody className="py-2">
            {account ? (
              <>
                <KV label="Currency" value={account.currency} />
                <KV label="Starting balance" value={formatCurrency(account.startingBalance)} />
                <KV label="Balance (cash)" value={formatCurrency(account.balance)} />
                <KV label="Equity" value={formatCurrency(account.equity)} />
                <KV
                  label="Daily P&L"
                  value={<span className={pnlClass(account.dailyPnl)}>{formatCurrency(account.dailyPnl)}</span>}
                />
                <KV
                  label="Total P&L"
                  value={<span className={pnlClass(account.totalPnl)}>{formatCurrency(account.totalPnl)}</span>}
                />
                <KV label="Drawdown" value={formatCurrency(account.drawdown)} />
                <KV label="Highest equity" value={formatCurrency(account.highestEquity)} />
              </>
            ) : (
              <p className="py-4 text-sm text-muted">No evaluation account.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Evaluation objectives */}
      {rule && account && (
        <Card className="mt-4">
          <CardHeader title="Evaluation objectives" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Progress label="Profit target" pct={profitPct} value={`${formatCurrency(account.totalPnl)} / ${formatCurrency(rule.profitTarget)}`} tone="long" />
            <Progress label="Max drawdown" pct={ddPct} value={`${formatCurrency(account.drawdown)} / ${formatCurrency(rule.maxDrawdown)}`} tone="short" />
            <KV label="Max daily loss" value={formatCurrency(rule.maxDailyLoss)} />
            <KV label="Max contracts" value={rule.maxContracts} />
          </CardBody>
        </Card>
      )}

      {/* Admin actions */}
      {account && (
        <Card className="mt-4">
          <CardHeader title="Admin actions" subtitle="Operate on this evaluation account" />
          <CardBody className="space-y-4">
            {actionMsg && (
              <div className={cn("rounded-md px-3 py-2 text-sm", actionMsg.ok ? "bg-long/10 text-long" : "bg-short/10 text-short")}>
                {actionMsg.text}
              </div>
            )}
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-44">
                <label className="mb-1 block text-xs text-muted">Adjust balance (± USD)</label>
                <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1000 or -500" />
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={actionBusy === "adjust"}
                disabled={!amount || !Number.isFinite(Number(amount)) || Number(amount) === 0}
                onClick={() => runAction("adjust", () => adjustBalance(account.id, Number(amount)).then((r) => { setAmount(""); return r; }))}
              >
                Apply
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" loading={actionBusy === "close"} disabled={positions.length === 0} onClick={() => runAction("close", () => closeAllPositions(account.id))}>
                Close all positions
              </Button>
              <Button variant="secondary" size="sm" loading={actionBusy === "cancel"} disabled={workingOrders === 0} onClick={() => runAction("cancel", () => cancelOrders(account.id))}>
                Cancel open orders
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={actionBusy === "liquidate"}
                disabled={positions.length === 0}
                onClick={() => runAction("liquidate", () => liquidateAccount(account.id), `Force-liquidate ${trader.name}? This flattens all positions at market and suspends the account.`)}
              >
                Force liquidate
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={actionBusy === "reset"}
                onClick={() => runAction("reset", () => resetAccount(account.id), `Reset ${trader.name}'s challenge? This wipes positions, orders and violations and restores the starting balance. This cannot be undone.`)}
              >
                Reset challenge
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Positions */}
      <Section title="Open positions" count={positions.length} className="mt-4">
        {positions.length ? (
          <Table head={["Symbol", "Side", "Qty", "Avg price", "Unrealized", "Realized"]}>
            {positions.map((p) => (
              <tr key={p.symbol} className="border-b border-border/60">
                <Td className="font-medium">{p.symbol}</Td>
                <Td><Badge tone={p.side === "LONG" ? "long" : "short"}>{p.side}</Badge></Td>
                <Td>{p.quantity}</Td>
                <Td>{formatPrice(p.averagePrice)}</Td>
                <Td className={pnlClass(p.unrealizedPnl)}>{formatCurrency(p.unrealizedPnl)}</Td>
                <Td className={pnlClass(p.realizedPnl)}>{formatCurrency(p.realizedPnl)}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No open positions.</Empty>
        )}
      </Section>

      {/* Orders */}
      <Section title="Recent orders" count={orders.length} className="mt-4">
        {orders.length ? (
          <Table head={["Time", "Symbol", "Side", "Type", "Qty", "Price", "Status"]}>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border/60">
                <Td className="text-muted">{formatDateTime(o.createdAt)}</Td>
                <Td className="font-medium">{o.symbol}</Td>
                <Td className={o.side === "BUY" ? "text-long" : "text-short"}>{o.side}</Td>
                <Td className="text-muted">{o.type}</Td>
                <Td>{o.filledQuantity > 0 && o.filledQuantity < o.quantity ? `${o.filledQuantity}/${o.quantity}` : o.quantity}</Td>
                <Td>{o.fillPrice != null ? formatPrice(o.fillPrice) : o.requestedPrice != null ? formatPrice(o.requestedPrice) : "MKT"}</Td>
                <Td><Badge tone={ORDER_TONE[o.status] ?? "neutral"}>{o.status.replace(/_/g, " ")}</Badge></Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No orders.</Empty>
        )}
      </Section>

      {/* Violations */}
      <Section title="Violations" count={violations.length} className="mt-4">
        {violations.length ? (
          <Table head={["Time", "Rule", "Action", "Detail"]}>
            {violations.map((v) => (
              <tr key={v.id} className="border-b border-border/60">
                <Td className="text-muted">{formatDateTime(v.ts)}</Td>
                <Td><Badge tone="short">{v.type.replace(/_/g, " ")}</Badge></Td>
                <Td className="text-muted">{v.action.replace(/_/g, " ")}</Td>
                <Td className="text-muted">{v.detail ?? "—"}</Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No violations — clean record.</Empty>
        )}
      </Section>

      {/* Activity log */}
      <Section title="Activity log" count={activity.length} className="mt-4">
        {activity.length ? (
          <Table head={["Time", "Action", "Detail", "Severity"]}>
            {activity.map((e) => (
              <tr key={e.id} className="border-b border-border/60">
                <Td className="text-muted">{formatDateTime(e.ts)}</Td>
                <Td>{e.action}</Td>
                <Td className="text-muted">{e.target}</Td>
                <Td><Badge tone={SEVERITY_TONE[e.severity]}>{e.severity}</Badge></Td>
              </tr>
            ))}
          </Table>
        ) : (
          <Empty>No activity recorded.</Empty>
        )}
      </Section>
    </div>
  );
}

/* ------------------------------ helpers ----------------------------- */

function clampPct(v: number) {
  return Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
}

function actionSuccess(key: string, r: AdminActionResult): string {
  switch (key) {
    case "adjust":
      return `✓ Balance adjusted by ${formatCurrency(r.amount ?? 0)}`;
    case "close":
      return `✓ Closed ${r.closed ?? 0} position(s)`;
    case "cancel":
      return `✓ Cancelled ${r.cancelled ?? 0} order(s)`;
    case "liquidate":
      return `✓ Liquidated ${r.closed ?? 0} position(s) — account suspended`;
    case "reset":
      return "✓ Challenge reset to starting state";
    default:
      return "✓ Done";
  }
}

function mapAccountStatus(s: string): TraderStatus {
  if (s === "SUSPENDED") return "suspended";
  if (s === "FAILED") return "closed";
  return "active";
}

function Section({ title, count, className, children }: { title: string; count: number; className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader title={<span className="flex items-center gap-2">{title}<span className="text-xs font-normal text-muted">({count})</span></span>} />
      {children}
    </Card>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cn("nums px-4 py-2.5", className)}>{children}</td>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-muted">{children}</p>;
}

function Progress({ label, pct, value, tone }: { label: string; pct: number; value: string; tone: "long" | "short" }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="nums text-foreground">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full", tone === "long" ? "bg-long" : "bg-short")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
