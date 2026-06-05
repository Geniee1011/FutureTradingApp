"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/lib/types";
import { SESSION_COOKIE, WS_URL, USE_MOCK_FEED } from "@/lib/constants";
import { deleteCookie, setCookie } from "@/lib/utils";
import { DEMO_USERS } from "@/lib/mock/data";

/** REST base of the TradingBackend, derived from the WS URL (empty in mock mode). */
const API_BASE = WS_URL ? WS_URL.replace(/^ws/, "http").replace(/\/ws.*$/, "") : "";

interface BackendUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "TRADER";
  status: string;
}

/** Map a backend user (uppercase role) to the frontend User shape. */
function mapUser(b: BackendUser): User {
  const role: Role = b.role === "ADMIN" ? "admin" : "trader";
  return {
    id: b.id,
    name: b.name,
    email: b.email,
    role,
    avatarColor: role === "admin" ? "#16c784" : "#3b82f6",
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  logout: () => void;
  setHydrated: () => void;
}

/**
 * Auth store. When a backend is configured it authenticates against the
 * TradingBackend JWT endpoint (`/api/auth/login`) and keeps the access token;
 * otherwise it validates against the bundled demo users. A mirror cookie
 * (SESSION_COOKIE) lets Next.js middleware guard routes on the edge.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hydrated: false,

      login: async (email, password) => {
        // 1) Real backend (JWT) when configured.
        if (!USE_MOCK_FEED && API_BASE) {
          try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: email.trim(), password }),
            });
            if (res.ok) {
              const data = (await res.json()) as { token: string; user: BackendUser };
              const user = mapUser(data.user);
              setCookie(SESSION_COOKIE, `${user.id}:${user.role}`);
              set({ user, token: data.token });
              return { ok: true, role: user.role };
            }
            if (res.status === 401) return { ok: false, error: "Invalid email or password." };
            return { ok: false, error: "Login failed. Please try again." };
          } catch {
            // Backend unreachable — fall through to the demo users below.
          }
        }

        // 2) Demo fallback (no backend / offline).
        await new Promise((r) => setTimeout(r, 300));
        const match = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
        );
        if (!match) return { ok: false, error: "Invalid email or password." };
        const { password: _pw, ...user } = match;
        void _pw;
        setCookie(SESSION_COOKIE, `${user.id}:${user.role}`);
        set({ user, token: null });
        return { ok: true, role: user.role };
      },

      logout: () => {
        deleteCookie(SESSION_COOKIE);
        set({ user: null, token: null });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "tp-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
        if (state?.user) setCookie(SESSION_COOKIE, `${state.user.id}:${state.user.role}`);
      },
    },
  ),
);

/** Read the current access token (for authorized backend calls). */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
