import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { VipGrantForm } from "@/components/admin/vip-grant-form";
import { RevokeVipButton } from "@/components/admin/revoke-vip-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("vipManagement") };
}

export const dynamic = "force-dynamic";

export default async function AdminVipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");

  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (admin?.role !== "ADMIN") {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("noAccess")}
        </h1>
        <p className="text-muted-foreground">{t("noAccessHint")}</p>
      </div>
    );
  }

  const vipUsers = await prisma.user.findMany({
    where: { vipUntil: { not: null } },
    select: { id: true, name: true, email: true, vipUntil: true },
    orderBy: { vipUntil: "desc" },
    take: 50,
  });

  const rawLogs = await prisma.vipAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const logUserIds = [
    ...new Set(rawLogs.flatMap((l) => [l.adminId, l.userId])),
  ];
  const logUsers = await prisma.user.findMany({
    where: { id: { in: logUserIds } },
    select: { id: true, email: true, name: true },
  });
  const userMap = new Map(logUsers.map((u) => [u.id, u]));
  const auditLogs = rawLogs.map((l) => ({
    ...l,
    adminLabel: userMap.get(l.adminId)?.email ?? l.adminId.slice(0, 8) + "…",
    userLabel: userMap.get(l.userId)?.email ?? l.userId.slice(0, 8) + "…",
  }));

  return (
    <div className="space-y-8">
      <BackLink href="/dashboard">{tc("dashboard")}</BackLink>

      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          {t("vipManagement")}
        </h1>
        <p className="mt-2 text-muted-foreground">{t("vipDescription")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("grantVip")}</CardTitle>
          <CardDescription>{t("grantHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <VipGrantForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("vipUsers")} ({vipUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vipUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">{t("userEmail")}</th>
                    <th className="pb-2 pr-4">{t("colName")}</th>
                    <th className="pb-2 pr-4">{t("vipUntil")}</th>
                    <th className="pb-2 pr-4" />
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {vipUsers.map((u) => {
                    const active = isVipActive(u.vipUntil);
                    return (
                      <tr key={u.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                        <td className="py-2 pr-4 text-xs">{u.name ?? "—"}</td>
                        <td className="py-2 pr-4 text-xs">
                          {u.vipUntil ? new Date(u.vipUntil).toLocaleDateString(locale) : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={active ? "default" : "secondary"} className="text-xs">
                            {active ? t("active") : t("expired")}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <RevokeVipButton userId={u.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("auditLog")}</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">{t("time")}</th>
                    <th className="pb-2 pr-4">Admin</th>
                    <th className="pb-2 pr-4">User</th>
                    <th className="pb-2 pr-4">{t("action")}</th>
                    <th className="pb-2 pr-4">{t("days")}</th>
                    <th className="pb-2">{t("vipUntil")}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-xs">
                        {new Date(log.createdAt).toLocaleString(locale)}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{log.adminLabel}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{log.userLabel}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={log.action === "grant" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">{log.days}</td>
                      <td className="py-2 text-xs">
                        {new Date(log.vipUntil).toLocaleDateString(locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
