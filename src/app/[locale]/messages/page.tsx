import { MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/layout/empty-state";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pageCtaItems } from "@/lib/page-cta-i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("messages");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function MessagesIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("messages");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("community", "explore");

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/messages");
  }
  const me = session.user.id;

  const msgs = await prisma.directMessage.findMany({
    where: { OR: [{ senderId: me }, { recipientId: me }] },
    orderBy: { createdAt: "desc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      recipient: { select: { id: true, name: true, email: true } },
    },
  });

  const seen = new Set<string>();
  const latest: { otherId: string; last: (typeof msgs)[0] }[] = [];
  for (const m of msgs) {
    const otherId = m.senderId === me ? m.recipientId : m.senderId;
    if (seen.has(otherId)) continue;
    seen.add(otherId);
    latest.push({ otherId, last: m });
  }

  const conversations = await Promise.all(
    latest.map(async ({ otherId, last }) => {
      const unread = await prisma.directMessage.count({
        where: { recipientId: me, senderId: otherId, readAt: null },
      });
      const other = last.senderId === me ? last.recipient : last.sender;
      return { otherId, last, unread, other };
    }),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          {t("title")}
        </h1>
      </div>

      {conversations.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={MessageCircle}
            title={t("empty")}
            description={t("emptyHint")}
            primary={{ href: "/leaderboard", label: "Leaderboard" }}
          />
          <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {conversations.map((c) => (
              <li key={c.otherId}>
                <Link
                  href={`/messages/${c.otherId}`}
                  className="flex items-center justify-between gap-4 p-4 transition hover:bg-muted/40"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {c.other?.name ?? c.other?.email ?? c.otherId}
                    </span>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {c.last.body}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {new Date(c.last.createdAt).toLocaleString(
                      locale === "vi" ? "vi-VN" : "en-US",
                    )}
                    {c.unread > 0 && (
                      <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
        </>
      )}
    </div>
  );
}
