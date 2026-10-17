import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Clock,
  MousePointerClick,
  Target,
  User,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("analytics") };
}

export const dynamic = "force-dynamic";

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function displayUser(user: { email: string | null; name: string | null }) {
  return user.email ?? user.name ?? "Unknown";
}

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { locale } = await params;
  const { userId: selectedUserId } = await searchParams;
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
        <h1 className="font-heading text-xl font-semibold">{t("noAccess")}</h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [
    totalVisits,
    totalErrors,
    totalFunnelEvents,
    visitGroups,
    errorGroups,
    funnelGroups,
    recentFunnelEvents,
    topErrors,
    recentErrors,
  ] = await Promise.all([
    prisma.userPageVisit.count({ where: { createdAt: { gte: since } } }),
    prisma.userClientError.count({ where: { createdAt: { gte: since } } }),
    prisma.funnelEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.userPageVisit.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.userClientError.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.funnelEvent.groupBy({
      by: ["eventName"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { eventName: "desc" } },
    }),
    prisma.funnelEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        eventName: true,
        path: true,
        surface: true,
        cta: true,
        destination: true,
        reason: true,
        createdAt: true,
        userId: true,
        visitorId: true,
      },
    }),
    prisma.userClientError.groupBy({
      by: ["message", "path", "kind"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { message: "desc" } },
      take: 15,
    }),
    prisma.userClientError.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        path: true,
        kind: true,
        message: true,
        digest: true,
        stack: true,
        createdAt: true,
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  const funnelCountMap = new Map(
    funnelGroups.map((row) => [row.eventName, row._count._all]),
  );
  const signupFunnel = [
    "homepage_cta_click",
    "signup_prompt_view",
    "signup_prompt_click",
    "register_view",
    "register_submit",
    "register_success",
    "register_failure",
  ].map((eventName) => ({
    eventName,
    count: funnelCountMap.get(eventName) ?? 0,
  }));

  const userIds = [
    ...new Set([
      ...visitGroups.map((row) => row.userId),
      ...errorGroups.map((row) => row.userId),
    ]),
  ];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  });

  const userMap = new Map(users.map((user) => [user.id, user]));
  const visitCountMap = new Map(
    visitGroups.map((row) => [row.userId, row._count._all]),
  );
  const errorCountMap = new Map(
    errorGroups.map((row) => [row.userId, row._count._all]),
  );
  const userRows = userIds
    .map((userId) => ({
      userId,
      user: userMap.get(userId) ?? { email: null, name: null },
      visits: visitCountMap.get(userId) ?? 0,
      errors: errorCountMap.get(userId) ?? 0,
    }))
    .sort((a, b) => b.visits + b.errors - (a.visits + a.errors));

  const selectedUser =
    selectedUserId && userMap.has(selectedUserId)
      ? userMap.get(selectedUserId)
      : null;

  const [selectedTopPages, selectedVisits, selectedErrors] = selectedUserId
    ? await Promise.all([
        prisma.userPageVisit.groupBy({
          by: ["path"],
          where: { userId: selectedUserId },
          _count: { _all: true },
          orderBy: { _count: { path: "desc" } },
          take: 10,
        }),
        prisma.userPageVisit.findMany({
          where: { userId: selectedUserId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            path: true,
            fullPath: true,
            title: true,
            createdAt: true,
          },
        }),
        prisma.userClientError.findMany({
          where: { userId: selectedUserId },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            path: true,
            kind: true,
            message: true,
            digest: true,
            createdAt: true,
          },
        }),
      ])
    : [[], [], []];

  const stats = [
    {
      label: t("analyticsVisits30d"),
      value: totalVisits,
      icon: MousePointerClick,
      className: "text-emerald-500 bg-emerald-500/10",
    },
    {
      label: t("analyticsActiveUsers30d"),
      value: userRows.length,
      icon: Activity,
      className: "text-blue-500 bg-blue-500/10",
    },
    {
      label: t("analyticsErrors30d"),
      value: totalErrors,
      icon: AlertTriangle,
      className:
        totalErrors > 0
          ? "text-red-500 bg-red-500/10"
          : "text-muted-foreground bg-muted/50",
    },
    {
      label: t("analyticsFunnelEvents30d"),
      value: totalFunnelEvents,
      icon: Target,
      className: "text-primary bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-foreground">
          <Activity className="mr-2 inline-block size-5" />
          {t("analytics")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("analyticsDesc")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border/60">
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${stat.className}`}
              >
                <stat.icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("analyticsSignupFunnel")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {signupFunnel.map((event) => (
              <div
                key={event.eventName}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <span className="truncate font-mono text-xs text-foreground">
                  {event.eventName}
                </span>
                <Badge variant={event.count > 0 ? "secondary" : "outline"}>
                  {event.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("analyticsRecentFunnelEvents")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {recentFunnelEvents.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                {t("analyticsNoFunnelEvents")}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5">{t("time")}</th>
                    <th className="px-4 py-2.5">{t("analyticsEvent")}</th>
                    <th className="px-4 py-2.5">{t("analyticsPage")}</th>
                    <th className="px-4 py-2.5">{t("analyticsContext")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentFunnelEvents.map((event) => (
                    <tr key={event.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(event.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{event.eventName}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {event.path}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex max-w-lg flex-wrap gap-1.5">
                          {event.surface && (
                            <Badge variant="outline">{event.surface}</Badge>
                          )}
                          {event.cta && (
                            <Badge variant="outline">{event.cta}</Badge>
                          )}
                          {event.destination && (
                            <Badge variant="outline">{event.destination}</Badge>
                          )}
                          {event.reason && (
                            <Badge variant="destructive">{event.reason}</Badge>
                          )}
                          {!event.userId && event.visitorId && (
                            <Badge variant="outline">{t("analyticsGuest")}</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>{t("analyticsUsers")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {userRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("analyticsNoVisits")}
              </p>
            ) : (
              userRows.map((row) => (
                <Link
                  key={row.userId}
                  href={`/admin/analytics?userId=${encodeURIComponent(row.userId)}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:bg-muted/50",
                    selectedUserId === row.userId && "border-primary/50 bg-primary/10",
                  )}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <User className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{displayUser(row.user)}</span>
                    </span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-muted-foreground">
                      {row.userId}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <Badge variant="secondary">
                      {row.visits} {t("analyticsVisits")}
                    </Badge>
                    {row.errors > 0 && (
                      <Badge variant="destructive">
                        {row.errors} {t("analyticsErrors")}
                      </Badge>
                    )}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {!selectedUserId ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
                <User className="size-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground">
                  {t("analyticsSelectUser")}
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {t("analyticsSelectUserHint")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>
                    {t("analyticsUserDetail")}:{" "}
                    {selectedUser
                      ? displayUser(selectedUser)
                      : selectedUserId.slice(0, 12)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTopPages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("analyticsNoVisits")}
                    </p>
                  ) : (
                    selectedTopPages.map((page) => (
                      <div
                        key={page.path}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                      >
                        <span className="truncate font-mono text-xs text-foreground">
                          {page.path}
                        </span>
                        <Badge variant="secondary">
                          {page._count._all} {t("analyticsVisits")}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>{t("analyticsRecentVisits")}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {selectedVisits.length === 0 ? (
                    <p className="px-4 pb-4 text-sm text-muted-foreground">
                      {t("analyticsNoVisits")}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2.5">{t("time")}</th>
                          <th className="px-4 py-2.5">{t("analyticsPage")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {selectedVisits.map((visit) => (
                          <tr key={visit.id}>
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                              <Clock className="mr-1 inline-block size-3" />
                              {formatDate(visit.createdAt, locale)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-md truncate font-mono text-xs">
                                {visit.fullPath}
                              </div>
                              {visit.title && (
                                <div className="max-w-md truncate text-xs text-muted-foreground">
                                  {visit.title}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle>{t("analyticsRecentErrors")}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  {selectedErrors.length === 0 ? (
                    <p className="px-4 pb-4 text-sm text-muted-foreground">
                      {t("analyticsNoErrors")}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2.5">{t("time")}</th>
                          <th className="px-4 py-2.5">{t("analyticsPage")}</th>
                          <th className="px-4 py-2.5">{t("analyticsError")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {selectedErrors.map((error) => (
                          <tr key={error.id} className="align-top">
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                              {formatDate(error.createdAt, locale)}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">
                              {error.path}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="destructive">{error.kind}</Badge>
                                {error.digest && (
                                  <Badge variant="outline">{error.digest}</Badge>
                                )}
                              </div>
                              <p className="mt-2 max-w-3xl break-words text-xs text-muted-foreground">
                                {error.message}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Global error view */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              Top lỗi 30 ngày
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topErrors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Không có lỗi nào.</p>
            ) : (
              topErrors.map((err, i) => (
                <div key={i} className="rounded-lg border border-border/60 px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="destructive" className="shrink-0">{err.kind}</Badge>
                    <Badge variant="secondary" className="shrink-0 ml-auto">{err._count._all}×</Badge>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground truncate">{err.path}</p>
                  <p className="text-xs text-foreground wrap-break-word line-clamp-2">{err.message}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-red-500" />
              Lỗi gần đây (tất cả user)
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            {recentErrors.length === 0 ? (
              <p className="px-4 pb-4 text-sm text-muted-foreground">Không có lỗi nào.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5">{t("time")}</th>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">{t("analyticsPage")}</th>
                    <th className="px-4 py-2.5">{t("analyticsError")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentErrors.map((error) => (
                    <tr key={error.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(error.createdAt, locale)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {error.user.email ?? error.user.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{error.path}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="destructive">{error.kind}</Badge>
                          {error.digest && <Badge variant="outline">{error.digest}</Badge>}
                        </div>
                        <p className="mt-1.5 max-w-sm wrap-break-word text-xs text-muted-foreground line-clamp-3">
                          {error.message}
                        </p>
                        {error.stack && (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-[11px] text-muted-foreground/60 hover:text-muted-foreground">stack trace</summary>
                            <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/40 p-2 text-[10px] text-muted-foreground">
                              {error.stack}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
