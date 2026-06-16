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
  register: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
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
    (set, get) => ({
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
            // A backend IS configured but is unreachable. Do NOT silently fall
            // through to demo users — that would masquerade as a working login
            // while the real backend is down. Fail loudly instead. (To run the
            // offline demo, unset NEXT_PUBLIC_WS_URL so USE_MOCK_FEED is true.)
            return {
              ok: false,
              error: "Can't reach the server. Check that the backend is running and try again.",
            };
          }
        }

        // 2) Demo fallback — only when no backend is configured (offline build).
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

      // Create an account in Postgres. Does NOT log in — the flow returns to /login.
      register: async (name, email, password) => {
        if (USE_MOCK_FEED || !API_BASE) {
          // Demo mode has no backend DB to persist to.
          await new Promise((r) => setTimeout(r, 300));
          return { ok: false, error: "Registration requires the backend (no database configured)." };
        }
        try {
          const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
          });
          if (res.ok) return { ok: true };
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          return { ok: false, error: data.error ?? "Registration failed. Please try again." };
        } catch {
          return { ok: false, error: "Could not reach the server. Please try again." };
        }
      },

      // Self-service password change for the signed-in user (trader or admin).
      changePassword: async (currentPassword, newPassword) => {
        if (USE_MOCK_FEED || !API_BASE) {
          return { ok: false, error: "Changing your password requires the backend (demo mode is read-only)." };
        }
        const token = get().token;
        if (!token) return { ok: false, error: "You must be signed in." };
        try {
          const res = await fetch(`${API_BASE}/api/auth/change-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ currentPassword, newPassword }),
          });
          const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
          if (res.ok && data.ok) return { ok: true };
          return { ok: false, error: data.error ?? "Could not change password." };
        } catch {
          return { ok: false, error: "Could not reach the server. Please try again." };
        }
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
