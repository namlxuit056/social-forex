import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { DeleteSignalButton } from "@/components/admin/delete-signal-button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("manageSignals") };
}

export const dynamic = "force-dynamic";

export default async function AdminSignalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const staff = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (staff?.role !== "ADMIN" && staff?.role !== "MOD") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const signals = await prisma.signal.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      symbol: true,
      direction: true,
      status: true,
      tier: true,
      createdAt: true,
      author: { select: { email: true, name: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <TrendingUp className="mr-2 inline-block size-5" />
          {t("manageSignals")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("signalsDesc")}</p>
      </div>

      {signals.length === 0 ? (
        <p className="text-muted-foreground">{t("noSignals")}</p>
      ) : (
        <Card className="border-border/60">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5">{t("colSymbol")}</th>
                  <th className="px-4 py-2.5">{t("colDirection")}</th>
                  <th className="px-4 py-2.5">{t("status")}</th>
                  <th className="px-4 py-2.5">{t("colTier")}</th>
                  <th className="px-4 py-2.5">{t("colAuthor")}</th>
                  <th className="px-4 py-2.5">{t("colCreated")}</th>
                  <th className="px-4 py-2.5">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {signals.map((s) => (
                  <tr key={s.id} className="align-middle">
                    <td className="px-4 py-2.5 font-medium tabular-nums">
                      {s.symbol}
                    </td>
                    <td className="px-4 py-2.5">{s.direction}</td>
                    <td className="px-4 py-2.5">{s.status}</td>
                    <td className="px-4 py-2.5">{s.tier}</td>
                    <td className="max-w-40 truncate px-4 py-2.5 text-muted-foreground">
                      {s.author.email ?? s.author.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">
                      {s.createdAt.toLocaleString(locale)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/signals/${s.id}`}
                          className="text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {t("viewSignal")}
                        </Link>
                        <DeleteSignalButton signalId={s.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
