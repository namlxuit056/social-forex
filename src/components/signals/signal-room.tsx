"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { closeSignal } from "@/actions/signals";
import { SignalCreateForm } from "@/components/signals/signal-create-form";
import { SignalImageGallery } from "@/components/signals/signal-image-gallery";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SignalRow = {
  id: string;
  symbol: string;
  direction: string;
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  tier: "FREE" | "VIP";
  status: "ACTIVE" | "CLOSED_WIN" | "CLOSED_LOSS" | "CANCELLED";
  notes: string | null;
  masked: boolean;
  authorLabel: string;
  authorId: string;
  isAuthor: boolean;
  likes: number;
  dislikes: number;
  commentCount: number;
  imageUrls: string[];
  imageCount: number;
  createdAt: string;
};

const closeInitial: { error?: string; ok?: boolean } | null = null;

export function SignalRoom({
  signals,
  showCreate,
}: {
  signals: SignalRow[];
  showCreate: boolean;
}) {
  const t = useTranslations("signals");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  return (
    <div className="space-y-10">
      {showCreate && <SignalCreateForm />}

      <section>
        <h2 className="text-lg font-medium text-foreground">{t("list")}</h2>
        {signals.length === 0 && (
          <div className="mt-4">
            <EmptyState
              title={t("empty")}
              description={
                showCreate ? t("emptyCreate") : t("emptyLogin")
              }
              primary={
                !showCreate
                  ? {
                      href: "/auth/signin?callbackUrl=/signals",
                      label: tc("signIn"),
                    }
                  : undefined
              }
              secondary={[
                { href: "/quotes", label: tn("quotes") },
                { href: "/calendar", label: tn("calendar") },
                { href: "/leaderboard", label: tn("leaderboard") },
              ]}
            />
          </div>
        )}
        <ul className="mt-4 space-y-4">
          {signals.map((s) => (
            <li key={s.id}>
              <Card>
                <CardContent className="pt-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-lg font-semibold text-foreground">
                        {s.symbol}
                      </span>
                      <Badge
                        variant={s.direction === "LONG" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {s.direction}
                      </Badge>
                      <Badge
                        variant={s.tier === "VIP" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {s.tier}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {s.authorLabel}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <SignalImageGallery
                    className="mt-3"
                    size="sm"
                    imageUrls={s.imageUrls}
                    imageCount={s.imageCount}
                    masked={s.masked}
                  />

                  {s.masked ? (
                    <p className="mt-3 text-sm text-amber-400/90">
                      {t("maskedMessage")}
                    </p>
                  ) : (
                    <dl className="mt-3 grid gap-1 font-mono text-sm text-foreground/80 sm:grid-cols-3">
                      <div>
                        <dt className="text-muted-foreground">Entry</dt>
                        <dd>{s.entry}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">SL</dt>
                        <dd>{s.stopLoss ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">TP</dt>
                        <dd>{s.takeProfit ?? "—"}</dd>
                      </div>
                    </dl>
                  )}

                  {s.notes && !s.masked && (
                    <p className="mt-2 text-sm text-muted-foreground">{s.notes}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{t("status")}:</span>
                    <Badge variant="outline" className="text-xs">
                      {s.status}
                    </Badge>
                    {s.isAuthor && s.status === "ACTIVE" && (
                      <CloseSignalForm signalId={s.id} />
                    )}
                  </div>

                  <div className="mt-3 flex items-center gap-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="size-3" /> {s.likes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsDown className="size-3" /> {s.dislikes}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" /> {s.commentCount}
                    </span>
                    <Link
                      href={`/signals/${s.id}`}
                      className="ml-auto text-primary hover:underline"
                    >
                      {t("viewDetail")} →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CloseSignalForm({ signalId }: { signalId: string }) {
  const [state, formAction] = useActionState(closeSignal, closeInitial);
  return (
    <form action={formAction} className="inline-flex flex-wrap gap-1.5">
      <input type="hidden" name="signalId" value={signalId} />
      {state?.error && (
        <span className="text-destructive">{state.error}</span>
      )}
      <Button
        type="submit"
        name="status"
        value="CLOSED_WIN"
        size="sm"
        variant="outline"
        className="h-6 gap-1 px-2 text-xs text-emerald-400 hover:text-emerald-300"
      >
        TP hit
      </Button>
      <Button
        type="submit"
        name="status"
        value="CLOSED_LOSS"
        size="sm"
        variant="outline"
        className="h-6 gap-1 px-2 text-xs text-destructive hover:text-red-400"
      >
        SL hit
      </Button>
      <Button
        type="submit"
        name="status"
        value="CANCELLED"
        size="sm"
        variant="ghost"
        className="h-6 gap-1 px-2 text-xs"
      >
        Huỷ
      </Button>
    </form>
  );
}
