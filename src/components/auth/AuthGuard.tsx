"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

/**
 * Client-side route guard. Middleware enforces access on the edge; this layer
 * keeps the UI consistent with the auth store and handles role redirects.
 */
export function AuthGuard({ role, children }: { role?: Role; children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace("/login");
    } else if (role && user.role !== role) {
      router.replace(user.role === "admin" ? "/admin/traders" : "/dashboard");
    }
  }, [hydrated, user, role, router]);

  if (!hydrated || !user || (role && user.role !== role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
