import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "long" | "short" | "neutral";
  className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-border bg-surface p-4", className)}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div
        className={cn(
          "nums mt-1 text-xl font-semibold",
          tone === "long" && "text-long",
          tone === "short" && "text-short",
        )}
      >
        {value}
      </div>
      {hint != null && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

/** Colored P&L text helper. */
export function PnL({ value, children, className }: { value: number; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "nums",
        value > 0 ? "text-long" : value < 0 ? "text-short" : "text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
