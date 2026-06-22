import { Video } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { WebinarList } from "@/components/webinar/webinar-list";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("webinar");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

export default async function WebinarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("webinar");

  const session = await auth();
  const userId = session?.user?.id;

  const webinars = await prisma.webinar.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE"] },
    },
    orderBy: { scheduledAt: "asc" },
    take: 20,
    include: {
      host: { select: { name: true, email: true, image: true } },
      _count: { select: { registrations: true } },
      ...(userId
        ? {
            registrations: {
              where: { userId },
              select: { id: true },
              take: 1,
            },
          }
        : {}),
    },
  });

  const serialized = webinars.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    streamUrl: w.streamUrl,
    thumbnailUrl: w.thumbnailUrl,
    scheduledAt: w.scheduledAt.toISOString(),
    duration: w.duration,
    status: w.status as "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED",
    host: w.host,
    _count: w._count,
    isRegistered: userId ? (w as unknown as { registrations?: Array<{ id: string }> }).registrations?.[0] !== undefined : false,
  }));

  const pastWebinars = await prisma.webinar.findMany({
    where: { status: "ENDED" },
    orderBy: { scheduledAt: "desc" },
    take: 10,
    include: {
      host: { select: { name: true, email: true, image: true } },
      _count: { select: { registrations: true } },
    },
  });

  const pastSerialized = pastWebinars.map((w) => ({
    id: w.id,
    title: w.title,
    description: w.description,
    streamUrl: w.streamUrl,
    thumbnailUrl: w.thumbnailUrl,
    scheduledAt: w.scheduledAt.toISOString(),
    duration: w.duration,
    status: w.status as "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED",
    host: w.host,
    _count: w._count,
    isRegistered: false,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("description")}</p>
      </div>

      <section className="space-y-4">
        <h2 className="font-heading text-lg font-medium text-foreground">
          {t("upcoming")}
        </h2>
        <WebinarList webinars={serialized} userId={userId} />
      </section>

      {pastSerialized.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-lg font-medium text-foreground">
            {t("past")}
          </h2>
          <WebinarList webinars={pastSerialized} userId={userId} />
        </section>
      )}
    </div>
  );
}
