"use client";

import { useEffect } from "react";
import { useAdminStore } from "@/store/admin-store";
import { useAuthStore } from "@/store/auth-store";
import { getWsClient } from "@/lib/ws-client";
import { USE_MOCK_FEED } from "@/lib/constants";

/** Seeds the admin CRM datasets, then keeps them live via the admin-updates channel. */
export function AdminProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);

  // Reset + reseed when the logged-in user changes so one admin never sees
  // another session's cached datasets.
  useEffect(() => {
    useAdminStore.getState().reset();
    useAdminStore.getState().seed();
  }, [token]);

  // Live updates: the backend publishes `admin_update` on rule breaches, pass/fail,
  // and admin status changes. Re-pull the datasets when one arrives.
  useEffect(() => {
    if (USE_MOCK_FEED || !token) return;
    const ws = getWsClient();
    ws.connect();
    ws.authenticate(token);
    ws.subscribe("admin-updates");

    const off = ws.onMessage((msg) => {
      if (msg.type === "admin_update") void useAdminStore.getState().refresh().catch(() => {});
    });

    return () => {
      off();
      ws.unsubscribe("admin-updates");
    };
  }, [token]);

  return <>{children}</>;
}
