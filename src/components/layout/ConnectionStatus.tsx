"use client";

import { useMarketStore } from "@/store/market-store";
import { getWsClient } from "@/lib/ws-client";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  idle: "Idle",
  connecting: "Connecting",
  connected: "Live",
  reconnecting: "Reconnecting",
  disconnected: "Offline",
};

export function ConnectionStatus({ className }: { className?: string }) {
  const status = useMarketStore((s) => s.status);
  const isLive = status === "connected";
  const isMock = getWsClient().isMock();

  return (
    <div className={cn("inline-flex items-center gap-2 text-xs text-muted", className)}>
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-long/70" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            isLive ? "bg-long" : status === "reconnecting" || status === "connecting" ? "bg-warning" : "bg-short",
          )}
        />
      </span>
      <span>{LABELS[status] ?? status}</span>
      {isMock && <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted-2">SIM</span>}
    </div>
  );
}
