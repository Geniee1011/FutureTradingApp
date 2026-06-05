# Trader Portal — Frontend (TradingApp)

Real-time trading portal and admin CRM. Frontend for the `TradingBackend` service.

Built with **Next.js 15** (App Router) · **TypeScript** · **TailwindCSS v4** ·
**Zustand** · **lightweight-charts** (+ TradingView Charting Library scaffold) ·
a reconnecting **WebSocket** client.

> Runs fully standalone: with no backend configured it drives a built-in
> simulated market feed, so every screen is live and interactive out of the box.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Open http://localhost:3000 and sign in with a demo account (click to autofill on
the login screen):

| Role   | Email            | Password |
| ------ | ---------------- | -------- |
| Trader | trader@demo.com  | `demo`   |
| Admin  | admin@demo.com   | `demo`   |

Other scripts: `npm run build` (production build), `npm start` (serve build),
`npm run lint`.

## Pages

**Trader Portal**

| Route        | Description                                                            |
| ------------ | --------------------------------------------------------------------- |
| `/login`     | Auth screen with demo accounts and `?next=` redirect support.         |
| `/dashboard` | Equity KPIs, equity curve, live watchlist, positions, recent orders.  |
| `/trade`     | Trade terminal: chart, order ticket, order book, positions/orders.    |
| `/orders`    | Full order blotter with status filters + open positions.              |
| `/account`   | Balances, margin usage, profile, transaction history.                 |

**Admin CRM** (admin role only)

| Route              | Description                                              |
| ------------------ | ------------------------------------------------------- |
| `/admin/traders`   | Trader directory: KYC, tier, risk, suspend/activate.    |
| `/admin/accounts`  | All accounts with freeze/unfreeze controls.             |
| `/admin/rules`     | Trading/risk rules with enable/disable toggles.         |
| `/admin/activity`  | Platform audit log with severity filters + search.      |

## Architecture

```
src/
  app/
    (trader)/              # trader route group — shared TopNav + auth guard
      dashboard | trade | orders | account
    admin/                 # admin route group — sidebar shell + admin guard
      traders | accounts | rules | activity
    login/                 # public auth page
    layout.tsx             # root layout + AuthHydrator
    page.tsx               # cookie-based landing redirect
  middleware.ts            # edge route protection (auth + role)
  components/
    ui/                    # Card, Button, Badge, Field, Stat, DataTable, …
    layout/                # TopNav, AdminSidebar, UserMenu, ConnectionStatus
    market/                # Watchlist, OrderBook, LivePrice
    trade/                 # OrderTicket, PositionsTable, OrdersTable
    chart/                 # CandleChart, EquityChart (lightweight-charts)
      tradingview/         # TradingView Charting Library scaffold (datafeed + loader)
    providers/             # Trader/Admin/Market data-init providers
    auth/                  # AuthGuard, AuthHydrator
  store/                   # Zustand: auth, market, orders, account, admin
  lib/
    ws-client.ts           # reconnecting WS client (falls back to mock feed)
    mock/                  # simulated feed + deterministic seed data
    types.ts constants.ts utils.ts
```

### State management (Zustand)

- `auth-store` — session, login/logout. Persists the user to localStorage and
  mirrors a `tp_session` cookie so middleware can guard routes on the edge.
  Uses `skipHydration` + `AuthHydrator` to keep SSR and client render in sync.
- `market-store` — live quotes, order book, selected symbol, connection status.
- `orders-store` — orders + net positions; `placeOrder` simulates fills.
- `account-store` — account summary + transactions.
- `admin-store` — traders, accounts, rules, activity (+ mutating actions).

### Auth & route protection

`middleware.ts` reads the `tp_session` cookie and:

- redirects unauthenticated users away from `/dashboard|/trade|/orders|/account`
  and `/admin/*` to `/login?next=…`;
- redirects non-admins away from `/admin/*`;
- redirects already-authenticated users off `/login`.

`AuthGuard` mirrors this on the client for consistent UI and role redirects.

## Connecting the TradingBackend

The companion **`TradingBackend`** service streams live futures (ES/NQ/CL/GC)
from Databento. Run it on `:8000`, then this app connects via env (already set in
`.env.local`):

```bash
# .env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

Two-terminal dev workflow (start the backend first):

```bash
cd TradingBackend && npm install && npm run dev   # :8000
cd TradingApp     && npm run dev                   # :3000
```

> `NEXT_PUBLIC_*` is inlined at build time, so set it before `npm run build` for
> production. Comment it out to use the frontend's own simulated feed.

Expected server → client messages (see `ServerMessage` in `src/lib/types.ts`):

```ts
{ type: "quote",     data: Quote }
{ type: "orderbook", data: OrderBook }
{ type: "order",     data: Order }
{ type: "account",   data: AccountSummary }
{ type: "activity",  data: ActivityEvent }
```

Client → server: `{ type: "subscribe" | "unsubscribe", channel, symbol? }`.

Historical candles are fetched via `GET {httpBase}/api/history?symbol=&resolution=&count=`.
When `NEXT_PUBLIC_WS_URL` is unset, all of the above is served by the in-browser
mock feed in `src/lib/mock/`.

## Charts

The trade terminal renders through `AdvancedChart`, which:

- by default uses **lightweight-charts** (TradingView's open-source library) —
  no license required, works immediately;
- when `NEXT_PUBLIC_TV_ADVANCED=1` **and** the licensed **TradingView Charting
  Library** is present in `public/charting_library/`, it loads that instead,
  driven by the datafeed adapter in `src/components/chart/tradingview/datafeed.ts`.

To enable the full Charting Library:

1. Request access at https://www.tradingview.com/charting-library/
2. Copy its build into `public/charting_library/`
3. Set `NEXT_PUBLIC_TV_ADVANCED=1`

The library is licensed and intentionally **not** bundled here.

## Notes

- Demo data is deterministic (seeded), so server and client renders match.
- This is the frontend only; business logic, persistence, auth and matching
  belong to `TradingBackend`. The mock layer marks every integration point.
