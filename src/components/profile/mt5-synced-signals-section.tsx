import { Mt5SyncedSignalsList } from "@/components/profile/mt5-synced-signals-list";
import { prisma } from "@/lib/prisma";

export async function Mt5SyncedSignalsSection({
  profileUserId,
  locale,
  t,
}: {
  profileUserId: string;
  locale: string;
  t: (key: string) => string;
}) {
  const rows = await prisma.mt5SignalLink.findMany({
    where: {
      signal: { authorId: profileUserId },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 8,
    select: {
      kind: true,
      mt5Ticket: true,
      lastProfit: true,
      lastSeenAt: true,
      createdAt: true,
      updatedAt: true,
      connection: { select: { name: true, accountCurrency: true } },
      signal: {
        select: {
          id: true,
          symbol: true,
          direction: true,
          entry: true,
          stopLoss: true,
          takeProfit: true,
          status: true,
          closedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (rows.length === 0) return null;

  const items = rows.map((row) => ({
    id: row.signal.id,
    symbol: row.signal.symbol,
    direction: row.signal.direction,
    entry: row.signal.entry,
    stopLoss: row.signal.stopLoss,
    takeProfit: row.signal.takeProfit,
    status: row.signal.status,
    kind: row.kind,
    mt5Ticket: row.mt5Ticket,
    connectionName: row.connection.name,
    accountCurrency: row.connection.accountCurrency,
    lastProfit: row.lastProfit,
    createdAt: row.signal.createdAt.toISOString(),
    updatedAt: row.signal.updatedAt.toISOString(),
    closedAt: row.signal.closedAt?.toISOString() ?? null,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
  }));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          {t("mt5SyncedTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("mt5SyncedHint")}
        </p>
      </div>

      <Mt5SyncedSignalsList items={items} locale={locale} />
    </section>
  );
}
