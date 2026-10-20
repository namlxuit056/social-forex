"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { NewOrderForm } from "@/components/mt5/new-order-dialog";
import { QUOTE_BY_SYMBOL } from "@/lib/quotes/definitions";

export type DeskOrderTicketState = "signedOut" | "noConnection" | "ready";

/** Inline MT5 order ticket on /desk; follows the chart's ?symbol= selection. */
export function DeskOrderTicket({ state }: { state: DeskOrderTicketState }) {
  const t = useTranslations("desk");
  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get("symbol")?.toUpperCase();
  const symbol = urlSymbol && QUOTE_BY_SYMBOL[urlSymbol] ? urlSymbol : undefined;

  return (
    <section id="desk-order" className="scroll-mt-24 space-y-4" aria-labelledby="desk-order-title">
      <div className="flex flex-col gap-1 border-b border-border pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="desk-order-title" className="font-heading text-lg font-medium text-foreground">
            {t("orderTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("orderSubtitle")}</p>
        </div>
        {state === "ready" && (
          <Link
            href="/positions"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {t("orderOpenPositions")}
          </Link>
        )}
      </div>

      <Card className="rounded-xl">
        <CardContent>
          {state === "ready" ? (
            <div className="max-w-xl">
              <NewOrderForm inline symbol={symbol} />
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              {state === "signedOut" ? t("orderSignedOut") : t("orderNoConnection")}{" "}
              <Link
                href={state === "signedOut" ? "/auth/signin" : "/mt5"}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {state === "signedOut" ? t("orderSignInCta") : t("orderConnectCta")}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
