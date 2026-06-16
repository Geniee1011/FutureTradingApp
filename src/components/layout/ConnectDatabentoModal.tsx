"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMarketDataStore } from "@/store/market-data-store";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

/** Connect / disconnect a user's own Databento account (Model B). */
export function ConnectDatabentoModal({ onClose }: { onClose: () => void }) {
  const connected = useMarketDataStore((s) => s.connected);
  const connect = useMarketDataStore((s) => s.connect);
  const disconnect = useMarketDataStore((s) => s.disconnect);

  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !apiKey.trim()) return;
    setBusy(true);
    setFeedback(null);
    const res = await connect(apiKey.trim());
    setBusy(false);
    if (res.ok) {
      setApiKey("");
      setFeedback({ ok: true, msg: "Connected — your charts now stream from your Databento account." });
      setTimeout(onClose, 1200);
    } else {
      setFeedback({ ok: false, msg: res.error ?? "Could not connect that key." });
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    setFeedback(null);
    const res = await disconnect();
    setBusy(false);
    setFeedback(res.ok ? { ok: true, msg: "Disconnected." } : { ok: false, msg: res.error ?? "Could not disconnect." });
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Databento connection</h2>
          <button type="button" onClick={onClose} className="rounded px-1.5 text-muted hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-xs text-muted">
            This portal streams your charts from <span className="text-foreground">your own Databento account</span>, so
            you only ever see data your own license covers. Paste your API key from{" "}
            <a
              href="https://databento.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Databento → Portal → API keys
            </a>
            . Stored encrypted, and only used to fetch your own charts.
          </p>

          {connected ? (
            <div className="rounded-lg border border-long/40 bg-long/10 px-3 py-2 text-sm text-long">
              ✓ A Databento account is connected.
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>{connected ? "Replace API key" : "Databento API key"}</Label>
              <Input
                type="password"
                autoComplete="off"
                placeholder="db-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {feedback && (
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs",
                  feedback.ok ? "border-long/40 bg-long/10 text-long" : "border-short/40 bg-short/10 text-short",
                )}
              >
                {feedback.msg}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              {connected ? (
                <Button type="button" variant="danger" size="sm" loading={busy} onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={busy} disabled={!apiKey.trim()}>
                  {connected ? "Update key" : "Connect"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
