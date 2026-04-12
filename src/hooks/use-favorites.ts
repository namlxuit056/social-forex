"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((d: { favorites?: string[] }) => {
        setFavorites(d.favorites ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const isFavorite = useCallback(
    (symbol: string) => favorites.includes(symbol),
    [favorites],
  );

  const toggle = useCallback(
    (symbol: string) => {
      const removing = favorites.includes(symbol);

      // optimistic
      setFavorites((prev) =>
        removing ? prev.filter((s) => s !== symbol) : [...prev, symbol],
      );

      startTransition(async () => {
        const res = await fetch("/api/favorites", {
          method: removing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol }),
        });

        if (!res.ok) {
          // rollback
          setFavorites((prev) =>
            removing ? [...prev, symbol] : prev.filter((s) => s !== symbol),
          );
        }
      });
    },
    [favorites],
  );

  return { favorites, loaded, isPending, isFavorite, toggle };
}
