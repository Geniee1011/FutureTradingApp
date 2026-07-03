"use client";

import { useAccountStore } from "@/store/account-store";
import { Button } from "@/components/ui/Button";

/**
 * Congratulations notification shown to a trader the moment their account reaches its profit
 * target (server sets `pendingReview`). The account keeps trading; advancement to the next
 * phase / funded tier is decided by an admin. Dismissable; re-arms if the flag is later
 * cleared and hit again.
 */
export function ProfitTargetModal() {
  const pendingReview = useAccountStore((s) => s.pendingReview);
  const seen = useAccountStore((s) => s.pendingReviewSeen);
  const dismiss = useAccountStore((s) => s.dismissPendingReview);

  if (!pendingReview || seen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-long/15 text-2xl">🎉</div>
        <h2 className="text-lg font-semibold text-foreground">Profit target reached!</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Congratulations, you reached your profit target for this account. Our support team will reach out to you within
          the next 24h!
        </p>
        <p className="mt-3 text-xs text-muted-2">
          You can keep trading in the meantime — your account stays active while our team reviews it.
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={dismiss}>Got it</Button>
        </div>
      </div>
    </div>
  );
}
