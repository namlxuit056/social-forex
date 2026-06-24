"use client";

import { useState, useCallback } from "react";

/** Empty key = behaves like regular useState (no persistence). */
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(() => {
    if (!key || typeof window === "undefined") return initial;
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (v: T) => {
      setState(v);
      if (!key) return;
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {
        // quota exceeded or private mode — silently ignore
      }
    },
    [key],
  );

  return [state, set];
}
