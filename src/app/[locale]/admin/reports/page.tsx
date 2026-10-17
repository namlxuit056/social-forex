import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Flag } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewReportActions } from "./review-actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("reports") };
}

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
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

  if (admin?.role !== "ADMIN" && admin?.role !== "MOD") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const reports = await prisma.forumReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { select: { email: true, name: true } },
      post: {
        select: {
          id: true,
          body: true,
          thread: {
            select: {
              slug: true,
              category: { select: { slug: true } },
            },
          },
        },
      },
      thread: {
        select: {
          id: true,
          slug: true,
          title: true,
          category: { select: { slug: true } },
        },
      },
      signalComment: {
        select: {
          id: true,
          body: true,
          signal: { select: { id: true, symbol: true } },
        },
      },
      copyTradeReview: {
        select: {
          id: true,
          rating: true,
          comment: true,
          providerId: true,
        },
      },
    },
    take: 100,
  });

  const statusBadge = (s: string) => {
    if (s === "OPEN")
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
    if (s === "REVIEWED")
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
    return "bg-muted text-muted-foreground";
  };

  const statusLabel = (s: string) => {
    if (s === "OPEN") return t("open");
    if (s === "REVIEWED") return t("reviewed");
    return t("dismissed");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <Flag className="mr-2 inline-block size-5" />
          {t("reports")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("reportsDesc")}
        </p>
      </div>

      {reports.length === 0 ? (
        <p className="text-muted-foreground">{t("noReports")}</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const threadUrl = r.thread
              ? `/forum/${r.thread.category.slug}/thread/${r.thread.slug}`
              : r.post?.thread
                ? `/forum/${r.post.thread.category.slug}/thread/${r.post.thread.slug}`
                : null;

            const signalUrl = r.signalComment
              ? `/signals/${r.signalComment.signal.id}`
              : null;

            const reviewUrl = r.copyTradeReview
              ? `/u/${r.copyTradeReview.providerId}?tab=reviews`
              : null;

            return (
              <Card key={r.id} className="border-border">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge(r.status)}`}
                    >
                      {statusLabel(r.status)}
                    </span>
                    <span className="text-muted-foreground">
                      {t("reporter")}:{" "}
                      <span className="font-medium text-foreground">
                        {r.reporter.email}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString(locale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-foreground">{r.reason}</p>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {r.thread && (
                      <span>
                        {t("thread")}: <strong>{r.thread.title}</strong>
                      </span>
                    )}
                    {r.post && (
                      <span>
                        {t("post")}:{" "}
                        <em className="line-clamp-1 max-w-xs text-xs">
                          {r.post.body.slice(0, 100)}
                        </em>
                      </span>
                    )}
                    {r.signalComment && (
                      <span>
                        {t("reportTargetSignalComment")} (
                        {t("signalSymbol")}:{" "}
                        <strong>{r.signalComment.signal.symbol}</strong>
                        ):{" "}
                        <em className="line-clamp-1 max-w-md text-xs">
                          {r.signalComment.body.slice(0, 120)}
                        </em>
                      </span>
                    )}
                    {r.copyTradeReview && (
                      <span>
                        {t("reportTargetReview")} ({r.copyTradeReview.rating}/5):{" "}
                        <em className="line-clamp-1 max-w-md text-xs">
                          {r.copyTradeReview.comment?.slice(0, 120) ?? "—"}
                        </em>
                      </span>
                    )}
                    {threadUrl && (
                      <Link
                        href={threadUrl}
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        {t("viewThread")} →
                      </Link>
                    )}
                    {signalUrl && (
                      <Link
                        href={signalUrl}
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        {t("viewSignal")} →
                      </Link>
                    )}
                    {reviewUrl && (
                      <Link
                        href={reviewUrl}
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        {t("viewReview")} →
                      </Link>
                    )}
                  </div>

                  {r.status === "OPEN" && (
                    <ReviewReportActions reportId={r.id} />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
