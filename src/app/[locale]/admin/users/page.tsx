import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isVipActive } from "@/lib/vip";
import { Card, CardContent } from "@/components/ui/card";
import { UserRow } from "./user-row";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  return { title: t("users") };
}

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
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

  const searchFilter = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where: searchFilter,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      vipUntil: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          <Users className="mr-2 inline-block size-5" />
          {t("users")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("usersDesc")}</p>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          type="text"
          placeholder={t("searchPlaceholder")}
          defaultValue={q ?? ""}
          className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("users")}
        </button>
      </form>

      {/* Table */}
      {users.length === 0 ? (
        <p className="text-muted-foreground">{t("noUsers")}</p>
      ) : (
        <Card className="border-border/60">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5">Email</th>
                  <th className="px-4 py-2.5">{t("role")}</th>
                  <th className="px-4 py-2.5">VIP</th>
                  <th className="px-4 py-2.5">{t("joined")}</th>
                  <th className="px-4 py-2.5">{t("changeRole")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {users.map((u) => (
                  <UserRow
                    key={u.id}
                    user={{
                      id: u.id,
                      email: u.email ?? "—",
                      name: u.name,
                      role: u.role,
                      vipActive: isVipActive(u.vipUntil),
                      vipUntil: u.vipUntil?.toISOString() ?? null,
                      createdAt: u.createdAt.toISOString(),
                    }}
                    currentUserId={session.user.id}
                    locale={locale}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
