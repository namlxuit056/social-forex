import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BroadcasterManager } from "./broadcaster-manager";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("telegramSignals") };
}

export const dynamic = "force-dynamic";

export default async function AdminTelegramSignalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const rows = await prisma.telegramSignalBroadcaster.findMany({
    select: {
      userId: true,
      createdAt: true,
      user: { select: { email: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const broadcasters = rows.map((r) => ({
    userId: r.userId,
    email: r.user.email ?? "—",
    name: r.user.name,
    addedAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          <Send className="mr-2 inline-block size-5" aria-hidden />
          {t("telegramSignals")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("telegramSignalsDesc")}
        </p>
      </div>

      <Card className="border-border/70 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">
            {t("telegramSignalsListTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BroadcasterManager
            broadcasters={broadcasters}
            locale={locale}
            broadcastAll={broadcasters.length === 0}
          />
        </CardContent>
      </Card>

      <p className="max-w-2xl text-xs text-muted-foreground">
        {t("telegramSignalsHint")}
      </p>
    </div>
  );
}
