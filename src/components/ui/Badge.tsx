import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "long" | "short" | "warning" | "info" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted border-border",
  long: "bg-long/15 text-long border-long/30",
  short: "bg-short/15 text-short border-short/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/15 text-info border-info/30",
  primary: "bg-primary/15 text-primary border-primary/30",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
