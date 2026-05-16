import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";

type Props = {
  profileUserId: string;
  viewerVipUntil?: Date | null;
  viewerUserId?: string;
};

export async function PinnedSignalsSection({ profileUserId, viewerVipUntil, viewerUserId }: Props) {
  const t = await getTranslations("profile");

  const pins = await prisma.userPinnedSignal.findMany({
    where: { userId: profileUserId },
    orderBy: { sortOrder: "asc" },
    take: 6,
    select: {
      signal: {
        select: { id: true, symbol: true, direction: true, tier: true, status: true, entry: true },
      },
    },
  });

  if (pins.length === 0) return null;

  const isOwner = viewerUserId === profileUserId;
  const viewerHasVip = isVipActive(viewerVipUntil);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {t("pinnedSignals")}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {pins.map(({ signal }) => {
          const hideEntry = signal.tier === "VIP" && !isOwner && !viewerHasVip;
          return (
            <Link
              key={signal.id}
              href={`/signals/${signal.id}`}
              className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <span className="font-medium">{signal.symbol}</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={
                    signal.direction === "LONG"
                      ? "text-emerald-600 font-semibold"
                      : "text-red-500 font-semibold"
                  }
                >
                  {signal.direction}
                </span>
                {signal.tier === "VIP" && (
                  <span className="rounded bg-amber-100 px-1 text-xs text-amber-700 font-medium">
                    VIP
                  </span>
                )}
                {!hideEntry && (
                  <span className="text-muted-foreground">@ {signal.entry}</span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
