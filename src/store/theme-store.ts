"use client";

import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tp-theme";

function persist(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  document.documentElement.setAttribute("data-theme", theme);
}

interface ThemeState {
  theme: Theme;
  /** Sync store state with the attribute the no-FOUC script already applied. */
  init: () => void;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",

  init: () => {
    const attr = document.documentElement.getAttribute("data-theme") as Theme | null;
    const stored = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY) as Theme | null;
      } catch {
        return null;
      }
    })();
    const theme: Theme = attr ?? stored ?? "dark";
    if (get().theme !== theme) set({ theme });
    document.documentElement.setAttribute("data-theme", theme);
  },

  setTheme: (theme) => {
    set({ theme });
    persist(theme);
  },

  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    persist(next);
  },
}));
