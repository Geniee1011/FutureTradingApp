"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/store/admin-store";

/** Seeds the admin CRM datasets once on mount. */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const seed = useAdminStore((s) => s.seed);
  useEffect(() => {
    seed();
  }, [seed]);
  return <>{children}</>;
}
