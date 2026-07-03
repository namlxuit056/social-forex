import { Activity } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { PositionsClient } from "@/components/mt5/positions-client";
import type { LivePosition, Mt5AccountInfo } from "@/app/[locale]/journal/journal-live-panel";
import type { LivePendingOrder } from "@/app/api/mt5/account/route";

export const dynamic = "force-dynamic";

function parseMql5Time(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const iso = v.replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3").replace(" ", "T");
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return { title: "Positions · MT5", description: "Manage your live MT5 positions and pending orders." };
}

export default async function PositionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const connection = await prisma.mt5Connection.findFirst({
    where: { userId: session.user.id, revokedAt: null },
    orderBy: { lastSeenAt: "desc" },
    select: {
      balance: true,
      equity: true,
      margin: true,
      freeMargin: true,
      accountCurrency: true,
      openPositions: true,
      lastSeenAt: true,
      lastPositions: true,
      lastOrders: true,
    },
  });

  const account: Mt5AccountInfo | null = connection
    ? {
        balance: connection.balance,
        equity: connection.equity,
        margin: connection.margin,
        freeMargin: connection.freeMargin,
        currency: connection.accountCurrency,
        openPositions: connection.openPositions,
        lastSeenAt: connection.lastSeenAt?.toISOString() ?? null,
      }
    : null;

  function parsePositions(raw: unknown): LivePosition[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((p) => {
      const r = p as Record<string, unknown>;
      const ticket = r.ticket != null ? String(r.ticket) : null;
      const symbol = typeof r.symbol === "string" ? r.symbol : null;
      const type = typeof r.type === "string" ? r.type : null;
      if (!ticket || !symbol || !type) return [];
      const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
      return [{
        ticket, symbol, type,
        volume: num(r.volume), priceOpen: num(r.priceOpen), priceCurrent: num(r.priceCurrent),
        stopLoss: num(r.stopLoss), takeProfit: num(r.takeProfit), profit: num(r.profit),
        swap: num(r.swap), openedAt: parseMql5Time(r.openedAt),
      }];
    });
  }

  function parseOrders(raw: unknown): LivePendingOrder[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((o) => {
      const r = o as Record<string, unknown>;
      const ticket = r.ticket != null ? String(r.ticket) : null;
      const symbol = typeof r.symbol === "string" ? r.symbol : null;
      const type = typeof r.type === "string" ? r.type : null;
      if (!ticket || !symbol || !type) return [];
      const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
      return [{
        ticket, symbol, type,
        volume: num(r.volume), priceOpen: num(r.priceOpen),
        stopLoss: num(r.stopLoss), takeProfit: num(r.takeProfit),
        openedAt: typeof r.openedAt === "string" ? r.openedAt : null,
      }];
    });
  }

  const positions = parsePositions(connection?.lastPositions);
  const orders = parseOrders(connection?.lastOrders);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Activity className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Positions</h1>
          <p className="text-sm text-muted-foreground">Live MT5 positions &amp; pending orders</p>
        </div>
      </div>

      {!account ? (
        <div className="rounded-lg border border-dashed border-border/60 py-16 text-center">
          <p className="text-muted-foreground">No MT5 connection found.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up a bridge token in the{" "}
            <Link href="/mt5" className="underline underline-offset-2">MT5 Bridge</Link> page.
          </p>
        </div>
      ) : (
        <PositionsClient
          initialAccount={account}
          initialPositions={positions}
          initialOrders={orders}
        />
      )}
    </div>
  );
}
