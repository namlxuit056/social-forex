"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUOTE_DEFINITIONS } from "@/lib/quotes/definitions";
import type { QuoteGroup } from "@/lib/quotes/types";
import { useFavorites } from "@/hooks/use-favorites";
import { Button } from "@/components/ui/button";

type Tab = "favorites" | "all";

const GROUP_ORDER: QuoteGroup[] = ["major", "minor", "metal", "energy", "crypto"];

interface Props {
  activeSymbol: string;
  onSelect: (symbol: string) => void;
}

export function ChartWatchlist({ activeSymbol, onSelect }: Props) {
  const { data: session } = useSession();
  const t = useTranslations("chart");
  const { favorites, isFavorite, toggle, loaded } = useFavorites();
  const [tab, setTab] = useState<Tab>("favorites");
  const [mobileOpen, setMobileOpen] = useState(false);

  const favDefs = useMemo(
    () =>
      QUOTE_DEFINITIONS.filter((d) => favorites.includes(d.symbol)).sort(
        (a, b) =>
          favorites.indexOf(a.symbol) - favorites.indexOf(b.symbol),
      ),
    [favorites],
  );

  const grouped = useMemo(() => {
    const map = new Map<QuoteGroup, typeof QUOTE_DEFINITIONS>();
    for (const g of GROUP_ORDER) map.set(g, []);
    for (const d of QUOTE_DEFINITIONS) {
      map.get(d.group)!.push(d);
    }
    return map;
  }, []);

  const activeDef = QUOTE_DEFINITIONS.find((d) => d.symbol === activeSymbol);

  function handleStar(symbol: string) {
    if (!session?.user) {
      alert(t("loginToSave"));
      return;
    }
    toggle(symbol);
  }

  function handleSelect(symbol: string) {
    onSelect(symbol);
    setMobileOpen(false);
  }

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tabs */}
      <div className="shrink-0 border-b border-border">
        <button
          onClick={() => setTab("favorites")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            tab === "favorites"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Star className="mr-1 inline-block size-3" />
          {t("favorites")}
          {loaded && favorites.length > 0 && (
            <span className="ml-1 text-[10px] text-muted-foreground">
              ({favorites.length})
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("all")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition-colors",
            tab === "all"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("allPairs")}
        </button>
      </div>

      {/* Content — min-h-0 required so flex child can shrink and scroll on mobile */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
        {tab === "favorites" ? (
          favDefs.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("noFavorites")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {favDefs.map((d) => (
                <PairRow
                  key={d.symbol}
                  symbol={d.symbol}
                  name={d.name}
                  active={d.symbol === activeSymbol}
                  starred
                  onSelect={handleSelect}
                  onStar={handleStar}
                />
              ))}
            </ul>
          )
        ) : (
          <div>
            {GROUP_ORDER.map((group) => {
              const items = grouped.get(group) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="sticky top-0 z-10 bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                    {t(group)}
                  </div>
                  <ul className="divide-y divide-border">
                    {items.map((d) => (
                      <PairRow
                        key={d.symbol}
                        symbol={d.symbol}
                        name={d.name}
                        active={d.symbol === activeSymbol}
                        starred={isFavorite(d.symbol)}
                        onSelect={handleSelect}
                        onStar={handleStar}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span>{activeDef?.symbol ?? activeSymbol}</span>
            <span className="text-xs text-muted-foreground">
              {activeDef?.name}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              mobileOpen && "rotate-180",
            )}
          />
        </Button>
        {mobileOpen && (
          <div className="mt-1 flex max-h-[50vh] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg">
            {list}
          </div>
        )}
      </div>

      {/* Desktop sidebar — min-h matches chart embed so list can scroll inside */}
      <div className="hidden min-h-[560px] w-64 shrink-0 overflow-hidden rounded-lg border border-border bg-background lg:flex lg:flex-col">
        {list}
      </div>
    </>
  );
}

function PairRow({
  symbol,
  name,
  active,
  starred,
  onSelect,
  onStar,
}: {
  symbol: string;
  name: string;
  active: boolean;
  starred: boolean;
  onSelect: (s: string) => void;
  onStar: (s: string) => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-1 px-1 transition-colors",
        active ? "bg-primary/10" : "hover:bg-muted/60",
      )}
    >
      <button
        onClick={() => onStar(symbol)}
        className="shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-yellow-500"
        aria-label={starred ? "Remove favorite" : "Add favorite"}
      >
        <Star
          className={cn(
            "size-3.5",
            starred && "fill-yellow-500 text-yellow-500",
          )}
        />
      </button>
      <button
        onClick={() => onSelect(symbol)}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
      >
        <span
          className={cn(
            "text-xs font-semibold",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {symbol}
        </span>
        <span className="truncate text-[11px] text-muted-foreground">
          {name}
        </span>
      </button>
    </li>
  );
}
