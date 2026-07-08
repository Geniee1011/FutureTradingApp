import { cn } from "@/lib/utils";

/* Color-coded behavioural risk phase (1-4): 1 green, 2 yellow, 3 orange, 4 red.
 * Used in the traders list and across the analytics page. */

export const PHASE_COLORS: Record<number, string> = {
  1: "#16c784", // green — calm
  2: "#f0b90b", // yellow — caution
  3: "#f97316", // orange — elevated
  4: "#ea3943", // red — danger
};

export function phaseColor(phase: number): string {
  return PHASE_COLORS[phase] ?? "#8a97ad";
}

export function PhaseBadge({ phase, size = "sm", className }: { phase: number; size?: "sm" | "lg"; className?: string }) {
  const color = phaseColor(phase);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold tabular-nums",
        size === "lg" ? "h-10 min-w-10 px-3 text-lg" : "h-6 min-w-6 px-2 text-xs",
        className,
      )}
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
      title={`Risk phase ${phase}`}
    >
      {phase}
    </span>
  );
}
