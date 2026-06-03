import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

function statusClass(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-500/40 bg-amber-500/15 text-amber-200";
    case "ACTIVE":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    case "CLOSED_WIN":
      return "border-sky-500/40 bg-sky-500/15 text-sky-200";
    case "CLOSED_LOSS":
      return "border-destructive/40 bg-destructive/15 text-red-300";
    default:
      return "border-muted-foreground/35 bg-muted/40 text-muted-foreground";
  }
}

function statusLabel(status: string, t: (key: string) => string) {
  switch (status) {
    case "PENDING":
      return t("mt5StatusPending");
    case "ACTIVE":
      return t("mt5StatusActive");
    case "CLOSED_WIN":
      return t("mt5StatusWin");
    case "CLOSED_LOSS":
      return t("mt5StatusLoss");
    case "CANCELLED":
      return t("mt5StatusCancelled");
    default:
      return status;
  }
}

export async function Mt5SyncedSignalsSection({
  profileUserId,
  t,
}: {
  profileUserId: string;
  t: (key: string) => string;
}) {
  const rows = await prisma.signal.findMany({
    where: {
      authorId: profileUserId,
      mt5Link: { isNot: null },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      symbol: true,
      direction: true,
      entry: true,
      stopLoss: true,
      takeProfit: true,
      status: true,
      updatedAt: true,
      mt5Link: {
        select: {
          kind: true,
          mt5Ticket: true,
          connection: { select: { name: true } },
        },
      },
    },
  });

  if (rows.length === 0) return null;

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
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((signal) => (
          <Link
            key={signal.id}
            href={`/signals/${signal.id}`}
            className="rounded-xl border border-border/70 bg-card/55 p-4 ring-1 ring-foreground/5 transition hover:border-primary/35 hover:bg-card"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-base font-semibold text-foreground">
                {signal.symbol} {signal.direction}
              </span>
              <Badge variant="outline" className={cn(statusClass(signal.status))}>
                {statusLabel(signal.status, t)}
              </Badge>
              <Badge variant="outline">
                {signal.mt5Link?.kind === "PENDING_ORDER"
                  ? t("mt5KindPending")
                  : t("mt5KindPosition")}
              </Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-muted/25 px-2 py-1.5">
                <p className="text-muted-foreground">{t("mt5Entry")}</p>
                <p className="font-mono text-foreground">{signal.entry}</p>
              </div>
              <div className="rounded-lg bg-muted/25 px-2 py-1.5">
                <p className="text-muted-foreground">{t("mt5Sl")}</p>
                <p className="font-mono text-foreground">{signal.stopLoss ?? "—"}</p>
              </div>
              <div className="rounded-lg bg-muted/25 px-2 py-1.5">
                <p className="text-muted-foreground">{t("mt5Tp")}</p>
                <p className="font-mono text-foreground">{signal.takeProfit ?? "—"}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("mt5Ticket")}: {signal.mt5Link?.mt5Ticket ?? "—"} ·{" "}
              {signal.mt5Link?.connection.name ?? "MT5"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
