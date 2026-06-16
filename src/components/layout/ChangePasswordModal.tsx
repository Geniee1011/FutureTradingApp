"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { cn } from "@/lib/utils";

/** Self-service "change password" dialog — used by both traders and admins. */
export function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const changePassword = useAuthStore((s) => s.changePassword);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Render into document.body so the overlay's `position: fixed` resolves against
  // the viewport, not the sticky/blurred top nav this menu lives in (a parent
  // backdrop-filter/transform would otherwise become the containing block).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Close on Escape for good measure.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setFeedback(null);

    if (next.length < 6) return setFeedback({ ok: false, msg: "New password must be at least 6 characters." });
    if (next !== confirm) return setFeedback({ ok: false, msg: "New passwords don't match." });
    if (next === current) return setFeedback({ ok: false, msg: "New password must differ from the current one." });

    setSubmitting(true);
    const res = await changePassword(current, next);
    setSubmitting(false);

    if (res.ok) {
      setFeedback({ ok: true, msg: "Password changed." });
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(onClose, 1200);
    } else {
      setFeedback({ ok: false, msg: res.error ?? "Could not change password." });
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Change password</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-1.5 text-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3 p-4">
          <div>
            <Label>Current password</Label>
            <PasswordInput
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>New password</Label>
            <PasswordInput
              autoComplete="new-password"
              placeholder="at least 6 characters"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Confirm new password</Label>
            <PasswordInput
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          {feedback && (
            <div
              className={cn(
                "rounded-lg border px-3 py-2 text-xs",
                feedback.ok ? "border-long/40 bg-long/10 text-long" : "border-short/40 bg-short/10 text-short",
              )}
            >
              {feedback.msg}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={submitting} disabled={!current || !next || !confirm}>
              Update password
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
