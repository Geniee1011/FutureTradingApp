"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/lib/constants";
import { Icon, type IconName } from "@/components/icons";
import { UserMenu } from "./UserMenu";
import { ThemeToggle } from "./ThemeToggle";
import { cn } from "@/lib/utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-long/15 text-long">
            <Icon name="logo" width={18} height={18} />
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">Admin CRM</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-2">Control center</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {ADMIN_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-surface-3 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon name={item.icon as IconName} width={18} height={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <Icon name="dashboard" width={18} height={18} />
            Trader portal
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background/90 px-4 backdrop-blur lg:px-6">
          {/* Mobile admin nav */}
          <nav className="flex items-center gap-1 overflow-x-auto lg:hidden">
            {ADMIN_NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium",
                    active ? "bg-surface-3 text-foreground" : "text-muted",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
