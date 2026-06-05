/* ------------------------------------------------------------------ *
 * WebSocket client for live market + account data.
 *
 * - If NEXT_PUBLIC_WS_URL is set, connects to the TradingBackend socket with
 *   exponential-backoff reconnection and heartbeat.
 * - Otherwise transparently drives the in-browser MockFeed, exposing the
 *   exact same API so nothing downstream changes.
 *
 * Consumers use: subscribe(), onMessage(), onStatus(), getHistory().
 * ------------------------------------------------------------------ */

import { USE_MOCK_FEED, WS_URL } from "./constants";
import { getMockFeed, MockFeed } from "./mock/feed";
import type {
  Candle,
  ClientMessage,
  ConnectionStatus,
  ServerMessage,
} from "./types";

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: ConnectionStatus) => void;

const MAX_BACKOFF_MS = 15_000;
const BASE_BACKOFF_MS = 500;

class WSClient {
  private socket: WebSocket | null = null;
  private mock: MockFeed | null = null;
  private status: ConnectionStatus = "idle";
  private messageHandlers = new Set<MessageHandler>();
  private statusHandlers = new Set<StatusHandler>();
  private subscriptions = new Set<string>(); // "channel:symbol"
  private retries = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private mockUnsub: (() => void) | null = null;
  private started = false;
  private authToken: string | null = null;

  /** Idempotent connect. Safe to call from multiple components. */
  connect() {
    if (this.started) return;
    this.started = true;

    if (USE_MOCK_FEED) {
      this.mock = getMockFeed();
      this.mockUnsub = this.mock.on((msg) => this.dispatch(msg));
      this.mock.start();
      this.setStatus("connected");
      // Replay any subscriptions made before connect.
      this.subscriptions.forEach((key) => {
        const [channel, symbol] = key.split(":");
        this.mock!.subscribe(channel, symbol || undefined);
      });
      return;
    }

    this.openSocket();
  }

  private openSocket() {
    this.setStatus(this.retries === 0 ? "connecting" : "reconnecting");
    try {
      this.socket = new WebSocket(WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.retries = 0;
      this.setStatus("connected");
      // Authenticate first (for private channels), then re-establish subscriptions.
      this.sendAuth();
      this.subscriptions.forEach((key) => {
        const [channel, symbol] = key.split(":");
        this.send({ type: "subscribe", channel, symbol: symbol || undefined });
      });
    };

    this.socket.onmessage = (ev) => {
      try {
        this.dispatch(JSON.parse(ev.data) as ServerMessage);
      } catch {
        /* ignore malformed frames */
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      if (this.started) this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private scheduleReconnect() {
    this.setStatus("reconnecting");
    const delay = Math.min(BASE_BACKOFF_MS * 2 ** this.retries, MAX_BACKOFF_MS);
    this.retries += 1;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.openSocket(), delay);
  }

  disconnect() {
    this.started = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.mockUnsub?.();
    this.mock?.stop();
    this.mock = null;
    this.socket?.close();
    this.socket = null;
    this.setStatus("disconnected");
  }

  /** Authenticate the connection (for private channels: positions/account/orders/admin). */
  authenticate(token: string | null) {
    this.authToken = token;
    this.sendAuth();
  }

  private sendAuth() {
    if (this.authToken && this.socket?.readyState === WebSocket.OPEN) {
      this.send({ type: "auth", token: this.authToken });
    }
  }

  subscribe(channel: string, symbol?: string) {
    const key = `${channel}:${symbol ?? ""}`;
    if (this.subscriptions.has(key)) return;
    this.subscriptions.add(key);
    if (this.mock) this.mock.subscribe(channel, symbol);
    else if (this.socket?.readyState === WebSocket.OPEN)
      this.send({ type: "subscribe", channel, symbol });
  }

  unsubscribe(channel: string, symbol?: string) {
    const key = `${channel}:${symbol ?? ""}`;
    if (!this.subscriptions.delete(key)) return;
    if (this.mock) this.mock.unsubscribe(channel, symbol);
    else if (this.socket?.readyState === WebSocket.OPEN)
      this.send({ type: "unsubscribe", channel, symbol });
  }

  /** Historical candles for the chart. Backed by the mock feed in demo mode. */
  async getHistory(symbol: string, resolutionSec: number, count: number): Promise<Candle[]> {
    if (USE_MOCK_FEED || this.mock) {
      return getMockFeed().getHistory(symbol, resolutionSec, count);
    }
    // Real backend: fetch via REST history endpoint.
    const base = WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "");
    const res = await fetch(
      `${base}/api/history?symbol=${encodeURIComponent(symbol)}&resolution=${resolutionSec}&count=${count}`,
    );
    if (!res.ok) throw new Error(`history ${res.status}`);
    return (await res.json()) as Candle[];
  }

  /** Current price (mock feed) — used to simulate fills locally. */
  getPrice(symbol: string): number {
    return getMockFeed().getPrice(symbol);
  }

  /** Fetch instrument metadata (incl. resolved contract codes) from the backend. */
  async getInstruments(): Promise<{ symbol: string; contractCode: string }[] | null> {
    if (USE_MOCK_FEED) return null; // caller computes codes locally
    const base = WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "");
    try {
      const res = await fetch(`${base}/api/instruments`);
      if (!res.ok) return null;
      return (await res.json()) as { symbol: string; contractCode: string }[];
    } catch {
      return null;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status); // emit current immediately
    return () => this.statusHandlers.delete(handler);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  isMock(): boolean {
    return USE_MOCK_FEED;
  }

  private send(msg: ClientMessage) {
    this.socket?.send(JSON.stringify(msg));
  }

  private dispatch(msg: ServerMessage) {
    this.messageHandlers.forEach((h) => h(msg));
  }

  private setStatus(status: ConnectionStatus) {
    if (this.status === status) return;
    this.status = status;
    this.statusHandlers.forEach((h) => h(status));
  }
}

/** App-wide singleton. */
let client: WSClient | null = null;
export function getWsClient(): WSClient {
  if (!client) client = new WSClient();
  return client;
}
