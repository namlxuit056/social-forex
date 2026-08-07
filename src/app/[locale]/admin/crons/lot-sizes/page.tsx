import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Gauge } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { listScreenerLotConfig, SCREENER_LOT_DEFAULT_SYMBOL } from "@/lib/signals/screener-lot-config";
import { LotConfigPanel } from "./lot-config-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Cấu hình Lot — Screener Auto-Fire" };
}

export default async function ScreenerLotSizesPage({
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

  const rows = await listScreenerLotConfig();
  const defaultRow = rows.find((r) => r.symbol === SCREENER_LOT_DEFAULT_SYMBOL) ?? {
    id: "__unsaved_default__",
    symbol: SCREENER_LOT_DEFAULT_SYMBOL,
    lotSize: 0.01,
  };
  const symbolRows = rows.filter((r) => r.symbol !== SCREENER_LOT_DEFAULT_SYMBOL);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/crons" className="text-xs text-muted-foreground hover:underline">
          ← Cron Jobs
        </Link>
        <h1 className="font-heading mt-1 text-2xl font-semibold text-foreground">
          <Gauge className="mr-2 inline-block size-5" aria-hidden />
          Cấu hình Lot — Screener Auto-Fire
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lot size dùng khi cron &quot;Screener: tự bắn lệnh&quot; đăng Signal dưới tài khoản
          bot. Symbol chưa có dòng riêng sẽ dùng lot mặc định (DEFAULT).
        </p>
      </div>

      <Card className="border-border/70 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Danh sách lot</CardTitle>
        </CardHeader>
        <CardContent>
          <LotConfigPanel defaultRow={defaultRow} symbolRows={symbolRows} />
        </CardContent>
      </Card>
    </div>
  );
}
