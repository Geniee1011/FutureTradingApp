"use client";

import { useEffect, useState } from "react";
import { WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Global connectivity banner. Makes the app's data source unambiguous so a
 * deployed build never silently masquerades as "working" when its backend is
 * actually down:
 *
 *  - Backend configured (`NEXT_PUBLIC_WS_URL` set) but `/health` unreachable
 *    → red "Backend unavailable" banner (live data + trading are offline).
 *  - No backend configured (offline/demo build) → subtle "Demo mode" banner.
 *  - Backend reachable → nothing.
 */

/** REST base of the TradingBackend, derived from the WS URL (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

type Status = "checking" | "online" | "offline" | "mock";

async function pingHealth(): Promise<boolean> {
  if (!API_BASE) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export function BackendStatus() {
  const [status, setStatus] = useState<Status>(USE_MOCK_FEED ? "mock" : "checking");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (USE_MOCK_FEED) return; // intentional offline build — nothing to poll
    let active = true;
    const check = async () => {
      const ok = await pingHealth();
      if (active) setStatus(ok ? "online" : "offline");
    };
    void check();
    const id = setInterval(check, 20_000);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Healthy or still probing → no banner. (A failed probe resurfaces it.)
  if (status === "online" || status === "checking" || dismissed) return null;

  const isMock = status === "mock";
  return (
    <div
      role="status"
      className={cn(
        "sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium",
        isMock ? "bg-amber-500/15 text-amber-400" : "bg-short/15 text-short",
      )}
    >
      <span aria-hidden>{isMock ? "◷" : "⚠"}</span>
      <span>
        {isMock
          ? "Demo mode — simulated data, no backend connected."
          : "Backend unavailable — live data and trading are offline. Showing demo data."}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-2 rounded px-1.5 text-current/70 hover:text-current"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
