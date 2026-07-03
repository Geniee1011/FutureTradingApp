"use client";

import { useAccountStore } from "@/store/account-store";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const AUTO_RESET_HOURS = 12;

/** Whole hours remaining until the auto-reset fires (min 0). */
function hoursUntilReset(requestedAt: number): number {
  const elapsedH = (Date.now() - requestedAt) / 3_600_000;
  return Math.max(0, Math.ceil(AUTO_RESET_HOURS - elapsedH));
}

/**
 * Prominent banner shown whenever trading is off or interrupted — failed/passed/
 * suspended, OR a still-ACTIVE account that hit its daily-loss limit and is paused
 * for the day. It explains exactly WHAT happened (the specific rule breach, e.g.
 * "Drawdown $3,034 reached limit $3,000") instead of a bare "trading disabled",
 * so the trader understands why and what to do next.
 */
export function AccountStatusBanner() {
  const summary = useAccountStore((s) => s.summary);
  const requestReset = useAccountStore((s) => s.requestReset);
  if (!summary) return null;

  const { status, statusReason, tradingPaused, tradingPausedReason, resetRequestedAt } = summary;

  // Daily-loss limit: the account is still ACTIVE (not failed) but paused until tomorrow.
  if (status === "ACTIVE") {
    if (!tradingPaused) return null;
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-warning">
        <span className="mt-0.5 text-base leading-none">🛑</span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Daily loss limit reached — trading paused for today</div>
          <p className="mt-0.5 text-xs text-foreground/80">
            {tradingPausedReason || "You hit your daily loss limit. Your open positions were closed."}
          </p>
          <p className="mt-0.5 text-xs text-muted">Trading resumes automatically at the start of the next trading day.</p>
        </div>
      </div>
    );
  }

  const config = {
    FAILED: {
      tone: "border-short/50 bg-short/10 text-short",
      icon: "⚠",
      title: "Account failed evaluation — trading is disabled",
      fallback: "A risk limit was breached.",
      action: "Your open positions were closed. Contact your administrator to reset the account.",
    },
    SUSPENDED: {
      tone: "border-warning/50 bg-warning/10 text-warning",
      icon: "⏸",
      title: "Account suspended — trading is disabled",
      fallback: "Your account has been suspended.",
      action: "Contact your administrator to re-enable trading.",
    },
    PASSED: {
      tone: "border-long/50 bg-long/10 text-long",
      icon: "✓",
      title: "Account passed the evaluation 🎉",
      fallback: "You reached the profit target.",
      action: "The evaluation is complete — contact your administrator about the next step.",
    },
  }[status];

  if (!config) return null;

  const isFailed = status === "FAILED";
  const resetRequested = resetRequestedAt != null;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", config.tone)}>
      <span className="mt-0.5 text-base leading-none">{config.icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold">{config.title}</div>
        <p className="mt-0.5 text-xs text-foreground/80">{statusReason || config.fallback}</p>

        {isFailed ? (
          resetRequested ? (
            <p className="mt-0.5 text-xs text-muted">
              Your open positions were closed. Reset requested — your account will reset automatically in about{" "}
              {hoursUntilReset(resetRequestedAt!)}h.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-xs text-muted">
                Your open positions were closed. Request a reset to start over — it applies automatically after {AUTO_RESET_HOURS}h.
              </p>
              <Button size="sm" onClick={() => void requestReset()}>
                Request reset
              </Button>
            </div>
          )
        ) : (
          <p className="mt-0.5 text-xs text-muted">{config.action}</p>
        )}
      </div>
    </div>
  );
}
