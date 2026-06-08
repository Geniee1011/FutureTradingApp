"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/theme-store";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Light/dark theme toggle for the header. */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const init = useThemeStore((s) => s.init);

  // Sync the store with the attribute the no-FOUC script set before paint.
  useEffect(() => {
    init();
  }, [init]);

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-muted transition-colors hover:bg-surface-3 hover:text-foreground",
        className,
      )}
    >
      <Icon name={isDark ? "sun" : "moon"} width={16} height={16} />
    </button>
  );
}
