"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

/**
 * Triggers Zustand persist rehydration on the client after mount. With
 * skipHydration enabled in the store, this keeps the initial client render
 * identical to the server render, then loads the persisted session.
 */
export function AuthHydrator() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
  }, []);
  return null;
}
