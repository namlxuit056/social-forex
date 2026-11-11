import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExnessBonusClaimReview } from "./claim-review";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("exnessBonus");
  return { title: t("admin.title") };
}

export const dynamic = "force-dynamic";

export default async function AdminExnessBonusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("exnessBonus");
  const tAdmin = await getTranslations("admin");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");
  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-xl font-semibold">{tAdmin("noAccess")}</h1>
        <p className="text-muted-foreground">{tAdmin("noAccessHint")}</p>
      </div>
    );
  }

  const claims = await prisma.exnessBonusClaim.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
    include: { user: { select: { email: true, name: true } } },
  });

  const totals = {
    pending: claims.filter((c) => c.status === "PENDING").length,
    approved: claims.filter((c) => c.status === "APPROVED").length,
    paidUsd: claims.filter((c) => c.status === "PAID").reduce((s, c) => s + c.amountUsd, 0),
  };
  const fmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <Gift className="mr-2 inline-block size-5" aria-hidden />
          {t("admin.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.desc")}</p>
        <p className="mt-2 text-sm">
          {t("admin.totals", { pending: totals.pending, approved: totals.approved, paid: totals.paidUsd })}
        </p>
      </div>

      {claims.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("admin.empty")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {claims.map((c) => (
            <Card key={c.id} className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="truncate">{c.user.email ?? c.user.name ?? c.userId}</span>
                  <span className="rounded border border-border px-2 py-0.5 text-xs font-medium">
                    {t(`status.${c.status}`)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt className="text-muted-foreground">{t("claimAccount")}</dt>
                  <dd className="font-mono">{c.accountLogin}</dd>
                  <dt className="text-muted-foreground">Server</dt>
                  <dd>{c.accountServer ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("form.payoutMethod")}</dt>
                  <dd>{t(`payoutMethods.${c.payoutMethod}`)}</dd>
                  <dt className="text-muted-foreground">{t("form.payoutDetails")}</dt>
                  <dd className="break-all">{c.payoutDetails}</dd>
                  {c.userNote && (
                    <>
                      <dt className="text-muted-foreground">{t("form.note")}</dt>
                      <dd>{c.userNote}</dd>
                    </>
                  )}
                  <dt className="text-muted-foreground">{t("admin.submittedAt")}</dt>
                  <dd>{fmt.format(c.createdAt)}</dd>
                  {c.paidAt && (
                    <>
                      <dt className="text-muted-foreground">{t("admin.paidAt")}</dt>
                      <dd>{fmt.format(c.paidAt)}</dd>
                    </>
                  )}
                </dl>
                <ExnessBonusClaimReview claimId={c.id} status={c.status} adminNote={c.adminNote} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
