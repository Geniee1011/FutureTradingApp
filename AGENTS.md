# TradingApp — agent notes

Frontend for the Trader Portal + Admin CRM. See `README.md` for the full map.

Stack: Next.js 15 (App Router, `src/`), TypeScript, TailwindCSS v4, Zustand 5,
lightweight-charts 5. Import alias `@/*` → `src/*`.

Key conventions:
- State lives in `src/store/*` (Zustand). Stores are client-only (`"use client"`).
- All live data flows through `src/lib/ws-client.ts`, which falls back to the
  simulated feed in `src/lib/mock/` when `NEXT_PUBLIC_WS_URL` is unset.
- Route protection is in `src/middleware.ts` (cookie `tp_session`) and mirrored
  by `src/components/auth/AuthGuard.tsx`.
- Keep demo/seed data deterministic (seeded RNG in `src/lib/mock/data.ts`) to
  avoid SSR hydration mismatches.
- Verify with `npm run build` and `npm run lint` before finishing.
