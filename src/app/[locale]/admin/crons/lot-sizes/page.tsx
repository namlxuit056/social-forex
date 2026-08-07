import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Gauge, Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { listScreenerLotConfig, SCREENER_LOT_DEFAULT_SYMBOL } from "@/lib/signals/screener-lot-config";
import { upsertScreenerLot, deleteScreenerLot } from "./actions";

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
  const defaultRow = rows.find((r) => r.symbol === SCREENER_LOT_DEFAULT_SYMBOL);
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
          <CardTitle className="text-base">Lot mặc định (áp dụng cho symbol chưa cấu hình riêng)</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertScreenerLot} className="flex items-end gap-3">
            <input type="hidden" name="symbol" value={SCREENER_LOT_DEFAULT_SYMBOL} />
            <div className="max-w-40 flex-1">
              <Label htmlFor="default-lot" className="text-xs text-muted-foreground">
                Lot mặc định
              </Label>
              <Input
                id="default-lot"
                name="lotSize"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={defaultRow?.lotSize ?? 0.01}
                required
              />
            </div>
            <Button type="submit" size="sm">
              Lưu
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/70 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Lot riêng theo symbol</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {symbolRows.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có symbol nào được cấu hình riêng.</p>
          )}

          {symbolRows.map((row) => (
            <form key={row.id} action={upsertScreenerLot} className="flex items-end gap-3">
              <input type="hidden" name="symbol" value={row.symbol} />
              <input type="hidden" name="id" value={row.id} />
              <div className="w-28 shrink-0">
                <Label className="text-xs text-muted-foreground">Symbol</Label>
                <p className="font-mono text-sm font-medium text-foreground">{row.symbol}</p>
              </div>
              <div className="max-w-40 flex-1">
                <Label htmlFor={`lot-${row.id}`} className="text-xs text-muted-foreground">
                  Lot
                </Label>
                <Input
                  id={`lot-${row.id}`}
                  name="lotSize"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={row.lotSize}
                  required
                />
              </div>
              <Button type="submit" size="sm" variant="outline">
                Lưu
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                formAction={deleteScreenerLot}
                className="text-destructive hover:text-destructive"
              >
                <input type="hidden" name="id" value={row.id} />
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </form>
          ))}

          <div className="border-border/60 mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Thêm symbol mới</p>
            <form action={upsertScreenerLot} className="flex items-end gap-3">
              <div className="w-28 shrink-0">
                <Label htmlFor="new-symbol" className="text-xs text-muted-foreground">
                  Symbol
                </Label>
                <Input id="new-symbol" name="symbol" placeholder="EURUSD" required />
              </div>
              <div className="max-w-40 flex-1">
                <Label htmlFor="new-lot" className="text-xs text-muted-foreground">
                  Lot
                </Label>
                <Input id="new-lot" name="lotSize" type="number" step="0.01" min="0.01" placeholder="0.05" required />
              </div>
              <Button type="submit" size="sm">
                Thêm
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
