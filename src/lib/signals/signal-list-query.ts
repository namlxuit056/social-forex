import {
  getCreatedAtRangeForPeriod,
  SIGNAL_LIST_DATE_TZ,
  type SignalDatePeriod,
} from "./signal-list-date-range";

export const SIGNAL_LIST_PAGE_SIZE = 20;

export type SignalListSort = "newest" | "symbol" | "tier";

/** `vn` = Asia/Ho_Chi_Minh, `utc` = UTC */
export type SignalListTz = "vn" | "utc";

const VALID_STATUS = [
  "PENDING",
  "ACTIVE",
  "CLOSED_WIN",
  "CLOSED_LOSS",
  "CANCELLED",
] as const;

export type SignalStatusFilter = "all" | (typeof VALID_STATUS)[number];

type SignalAndClause =
  | { symbol: { contains: string; mode: "insensitive" } }
  | { tier: "FREE" | "VIP" }
  | {
      author: {
        OR: Array<
          | { name: { contains: string; mode: "insensitive" } }
          | { email: { contains: string; mode: "insensitive" } }
        >;
      };
    }
  | { status: (typeof VALID_STATUS)[number] }
  | { createdAt: { gte: Date; lte: Date } };

export type SignalListWhereInput =
  | Record<string, never>
  | { AND: SignalAndClause[] };

export function signalListTzToIana(tz: SignalListTz): string {
  return tz === "utc" ? "UTC" : SIGNAL_LIST_DATE_TZ;
}

export function parseSignalListSearchParams(sp: {
  symbol?: string;
  author?: string;
  tier?: string;
  status?: string;
  period?: string;
  tz?: string;
  sort?: string;
  page?: string;
}): {
  symbol: string;
  author: string;
  tier: "all" | "FREE" | "VIP";
  status: SignalStatusFilter;
  period: SignalDatePeriod;
  tz: SignalListTz;
  sort: SignalListSort;
  page: number;
} {
  const rawSymbol = typeof sp.symbol === "string" ? sp.symbol : "";
  const rawAuthor = typeof sp.author === "string" ? sp.author : "";
  const rawTier = typeof sp.tier === "string" ? sp.tier.toUpperCase() : "";
  const tier: "all" | "FREE" | "VIP" =
    rawTier === "FREE" || rawTier === "VIP" ? rawTier : "all";

  const rawStatusRaw = typeof sp.status === "string" ? sp.status.trim() : "";
  const rawStatus = rawStatusRaw.toUpperCase();
  const status: SignalStatusFilter =
    rawStatusRaw !== "" &&
    (VALID_STATUS as readonly string[]).includes(rawStatus)
      ? (rawStatus as SignalStatusFilter)
      : "all";

  const rawPeriod =
    typeof sp.period === "string" ? sp.period.toLowerCase().trim() : "";
  let period: SignalDatePeriod;
  if (rawPeriod === "all") period = "all";
  else if (rawPeriod === "week") period = "week";
  else if (rawPeriod === "today") period = "today";
  else period = "today";

  const rawTz = typeof sp.tz === "string" ? sp.tz.toLowerCase().trim() : "";
  const tz: SignalListTz = rawTz === "utc" ? "utc" : "vn";

  const rawSort = typeof sp.sort === "string" ? sp.sort : "";
  const sort: SignalListSort =
    rawSort === "symbol" || rawSort === "tier" ? rawSort : "newest";
  const rawPage = typeof sp.page === "string" ? Number.parseInt(sp.page, 10) : 1;
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  return {
    symbol: rawSymbol.trim(),
    author: rawAuthor.trim(),
    tier,
    status,
    period,
    tz,
    sort,
    page,
  };
}

export function buildSignalWhere(
  symbol: string,
  tier: "all" | "FREE" | "VIP",
  author: string,
  statusFilter: SignalStatusFilter,
  period: SignalDatePeriod,
  tz: SignalListTz,
  now?: Date,
): SignalListWhereInput {
  const sym = symbol.trim();
  const au = author.trim();
  const and: SignalAndClause[] = [];

  if (sym) {
    and.push({ symbol: { contains: sym, mode: "insensitive" } });
  }
  if (tier !== "all") {
    and.push({ tier });
  }
  if (au) {
    and.push({
      author: {
        OR: [
          { name: { contains: au, mode: "insensitive" } },
          { email: { contains: au, mode: "insensitive" } },
        ],
      },
    });
  }
  if (statusFilter !== "all") {
    and.push({ status: statusFilter });
  }
  const range = getCreatedAtRangeForPeriod(
    period,
    now,
    signalListTzToIana(tz),
  );
  if (range) {
    and.push({ createdAt: { gte: range.gte, lte: range.lte } });
  }

  return and.length ? { AND: and } : {};
}

type OrderByEntry =
  | { createdAt: "asc" | "desc" }
  | { id: "asc" | "desc" }
  | { symbol: "asc" | "desc" }
  | { tier: "asc" | "desc" };

export function buildSignalOrderBy(
  sort: SignalListSort,
): OrderByEntry[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { id: "desc" }];
    case "symbol":
      return [{ symbol: "asc" }, { id: "asc" }];
    case "tier":
      /* VIP trước FREE (enum: FREE < VIP → desc đưa VIP lên) */
      return [{ tier: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

/** Client: build href for `/signals` with filters (pathname from `usePathname()`). */
export function buildSignalsListHref(opts: {
  pathname: string;
  symbol?: string;
  author?: string;
  tier?: "all" | "FREE" | "VIP";
  status?: SignalStatusFilter;
  period?: SignalDatePeriod;
  tz?: SignalListTz;
  sort?: SignalListSort;
  page?: number;
}): string {
  const p = new URLSearchParams();
  const sym = opts.symbol?.trim();
  const auth = opts.author?.trim();
  if (sym) p.set("symbol", sym);
  if (auth) p.set("author", auth);
  if (opts.tier && opts.tier !== "all") p.set("tier", opts.tier);
  if (opts.status && opts.status !== "all") p.set("status", opts.status);
  if (opts.period === "all") p.set("period", "all");
  if (opts.period === "week") p.set("period", "week");
  /* "today" is default — omit `period` for short URLs */
  if (opts.tz === "utc") p.set("tz", "utc");
  if (opts.sort && opts.sort !== "newest") p.set("sort", opts.sort);
  if (opts.page && opts.page > 1) p.set("page", String(opts.page));
  const qs = p.toString();
  return qs ? `${opts.pathname}?${qs}` : opts.pathname;
}

export type { SignalDatePeriod };
