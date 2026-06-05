"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 py-1 pl-1 pr-2 hover:bg-surface-3"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold text-white"
          style={{ background: user.avatarColor }}
        >
          {initials}
        </span>
        <span className="hidden text-sm font-medium sm:block">{user.name}</span>
        <Icon name="chevronDown" width={14} height={14} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
          <div className="border-b border-border px-3 py-2.5">
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs text-muted">{user.email}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-2">{user.role}</div>
          </div>
          <div className="p-1">
            {user.role === "admin" ? (
              <MenuLink href="/admin/traders" label="Admin CRM" icon="users" />
            ) : (
              <MenuLink href="/account" label="Account settings" icon="account" />
            )}
            {user.role === "admin" && <MenuLink href="/dashboard" label="Trader portal" icon="dashboard" />}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-short hover:bg-short/10"
            >
              <Icon name="logout" width={16} height={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, label, icon }: { href: string; label: string; icon: "users" | "account" | "dashboard" }) {
  return (
    <Link
      href={href}
      className={cn("flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-surface-3")}
    >
      <Icon name={icon} width={16} height={16} className="text-muted" />
      {label}
    </Link>
  );
}
