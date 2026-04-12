import { Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { prisma } from "@/lib/prisma";
import { pageCtaItems } from "@/lib/page-cta-i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

type Row = {
  userId: string;
  name: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number | null;
};

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");
  const tCommon = await getTranslations("common");
  const ctaEmpty = await pageCtaItems("community", "explore");
  const ctaTable = await pageCtaItems("community", "trading");

  const closed = await prisma.signal.findMany({
    where: { status: { in: ["CLOSED_WIN", "CLOSED_LOSS"] } },
    select: {
      authorId: true,
      status: true,
      author: { select: { name: true, email: true } },
    },
  });

  const map = new Map<string, { wins: number; losses: number; label: string }>();
  for (const s of closed) {
    const label = s.author?.name ?? s.author?.email ?? s.authorId;
    const cur = map.get(s.authorId) ?? { wins: 0, losses: 0, label };
    if (s.status === "CLOSED_WIN") cur.wins += 1;
    if (s.status === "CLOSED_LOSS") cur.losses += 1;
    cur.label = label;
    map.set(s.authorId, cur);
  }

  const rows: Row[] = [...map.entries()].map(([userId, v]) => {
    const total = v.wins + v.losses;
    const winRate = total > 0 ? Math.round((v.wins / total) * 1000) / 10 : null;
    return { userId, name: v.label, wins: v.wins, losses: v.losses, total, winRate };
  });

  rows.sort((a, b) => (b.total !== a.total ? b.total - a.total : (b.winRate ?? 0) - (a.winRate ?? 0)));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      {rows.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={Trophy}
            title={t("empty")}
            description={t("emptyHint")}
            primary={{ href: "/signals", label: t("goToSignals") }}
          />
          <PageCtaRow heading={tCommon("next")} items={ctaEmpty} />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">{t("rank")}</th>
                  <th className="px-4 py-3">{t("trader")}</th>
                  <th className="px-4 py-3">{t("wins")}</th>
                  <th className="px-4 py-3">{t("losses")}</th>
                  <th className="px-4 py-3">{t("winRate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={r.userId} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 text-foreground">
                      <Link href={`/u/${r.userId}`} className="font-medium text-primary hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-primary">{r.wins}</td>
                    <td className="px-4 py-3 text-destructive">{r.losses}</td>
                    <td className="px-4 py-3 font-mono">{r.winRate !== null ? `${r.winRate}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PageCtaRow heading={tCommon("next")} items={ctaTable} />
        </>
      )}
    </div>
  );
}
