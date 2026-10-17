import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackLink } from "@/components/layout/back-link";
import { PageCtaRow } from "@/components/layout/page-cta-row";
import { auth } from "@/auth";
import { DmCompose } from "@/components/messages/dm-compose";
import { prisma } from "@/lib/prisma";
import { pageCtaItems } from "@/lib/page-cta-i18n";

type Props = { params: Promise<{ locale: string; userId: string }> };

export const dynamic = "force-dynamic";

export default async function MessageThreadPage({ params }: Props) {
  const { locale, userId: otherId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("messages");
  const tCommon = await getTranslations("common");
  const ctaRow = await pageCtaItems("community", "explore");
  const dateLocale = locale === "vi" ? "vi-VN" : "en-US";

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/messages/${otherId}`);
  }
  const me = session.user.id;

  if (otherId === me) {
    redirect("/messages");
  }

  const other = await prisma.user.findUnique({
    where: { id: otherId },
    select: { id: true, name: true, email: true },
  });
  if (!other) notFound();

  await prisma.directMessage.updateMany({
    where: {
      recipientId: me,
      senderId: otherId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  const thread = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: me, recipientId: otherId },
        { senderId: otherId, recipientId: me },
      ],
    },
    orderBy: { createdAt: "asc" },
    include: {
      sender: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <BackLink href="/messages">{t("conversation")}</BackLink>
        <Link
          href={`/u/${otherId}`}
          className="text-lg font-medium text-foreground hover:text-primary"
        >
          {other.name ?? other.email ?? "Trader"}
        </Link>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        {thread.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            {t("threadEmpty")}
          </p>
        )}
        {thread.map((m) => {
          const mine = m.senderId === me;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                mine
                  ? "ml-auto bg-primary/20 text-foreground"
                  : "bg-muted text-foreground/90"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(m.createdAt).toLocaleString(dateLocale)}
              </p>
            </div>
          );
        })}
      </div>

      <DmCompose recipientId={otherId} />
      <PageCtaRow heading={tCommon("ctaDiscovery")} items={ctaRow} />
    </div>
  );
}
