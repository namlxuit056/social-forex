import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationList } from "@/components/notifications/notification-list";
import { PushNotificationManager } from "@/components/notifications/push-notification-manager";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/actions/notifications";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("notifications");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/notifications");
  }

  const rows = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      signal: { select: { id: true, symbol: true, direction: true } },
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  const items = rows.map((n) => ({
    id: n.id,
    kind: n.kind,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
    signal: n.signal,
    actor: n.actor,
    meta: n.meta as Record<string, unknown> | null,
  }));

  const hasUnread = rows.some((n) => n.readAt === null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-xl font-semibold text-foreground">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {hasUnread ? (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              {t("markAllRead")}
            </Button>
          </form>
        ) : null}
      </div>

      <PushNotificationManager />

      <NotificationList items={items} locale={locale} />
    </div>
  );
}
