import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { VipGrantForm } from "@/components/admin/vip-grant-form";
import { RevokeVipButton } from "@/components/admin/revoke-vip-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackLink } from "@/components/layout/back-link";

export const metadata = { title: "Admin — VIP Management" };
export const dynamic = "force-dynamic";

export default async function AdminVipPage() {
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
          Không có quyền truy cập
        </h1>
        <p className="text-muted-foreground">Trang này yêu cầu quyền ADMIN.</p>
      </div>
    );
  }

  const vipUsers = await prisma.user.findMany({
    where: { vipUntil: { not: null } },
    select: { id: true, name: true, email: true, vipUntil: true },
    orderBy: { vipUntil: "desc" },
    take: 50,
  });

  const auditLogs = await prisma.vipAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <BackLink href="/dashboard">Dashboard</BackLink>

      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Quản lý VIP
        </h1>
        <p className="mt-2 text-muted-foreground">
          Cấp, thu hồi VIP và xem lịch sử thao tác.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cấp VIP cho người dùng</CardTitle>
          <CardDescription>
            Nhập email và số ngày. VIP sẽ được tính từ thời điểm hiện tại.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VipGrantForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Người dùng có VIP ({vipUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {vipUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có người dùng VIP nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Email</th>
                    <th className="pb-2 pr-4">Tên</th>
                    <th className="pb-2 pr-4">VIP đến</th>
                    <th className="pb-2 pr-4">Trạng thái</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {vipUsers.map((u) => {
                    const active = isVipActive(u.vipUntil);
                    return (
                      <tr key={u.id} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">{u.email}</td>
                        <td className="py-2 pr-4">{u.name ?? "—"}</td>
                        <td className="py-2 pr-4 text-xs">
                          {u.vipUntil
                            ? new Date(u.vipUntil).toLocaleDateString("vi-VN")
                            : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={active ? "default" : "secondary"} className="text-xs">
                            {active ? "Còn hạn" : "Hết hạn"}
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
          <CardTitle>Lịch sử thao tác (Audit log)</CardTitle>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có thao tác nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Thời gian</th>
                    <th className="pb-2 pr-4">Admin</th>
                    <th className="pb-2 pr-4">User ID</th>
                    <th className="pb-2 pr-4">Hành động</th>
                    <th className="pb-2 pr-4">Ngày</th>
                    <th className="pb-2">VIP đến</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-xs">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">{log.adminId.slice(0, 8)}…</td>
                      <td className="py-2 pr-4 font-mono text-xs">{log.userId.slice(0, 8)}…</td>
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
                        {new Date(log.vipUntil).toLocaleDateString("vi-VN")}
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
