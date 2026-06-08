"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TRADER_NAV } from "@/lib/constants";
import { Icon, type IconName } from "@/components/icons";
import { ConnectionStatus } from "./ConnectionStatus";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-6 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon name="logo" width={18} height={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Trader Portal</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {TRADER_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-surface-3 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon name={item.icon as IconName} width={16} height={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ConnectionStatus className="hidden sm:flex" />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-2 py-1.5 md:hidden">
        {TRADER_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium",
                active ? "bg-surface-3 text-foreground" : "text-muted",
              )}
            >
              <Icon name={item.icon as IconName} width={14} height={14} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
