"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addSignalComment } from "@/actions/signal-social";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Comment {
  id: string;
  body: string;
  authorLabel: string;
  authorId: string;
  createdAt: string;
}

interface Props {
  signalId: string;
  comments: Comment[];
  loggedIn: boolean;
}

export function SignalComments({ signalId, comments, loggedIn }: Props) {
  const t = useTranslations("signals");
  const [state, formAction, isPending] = useActionState(
    addSignalComment,
    null,
  );

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">
          {t("comments")} ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noComments")}</p>
        )}

        {comments.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-border/40 bg-muted/30 p-3"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link
                href={`/u/${c.authorId}`}
                className="font-medium text-foreground hover:underline"
              >
                {c.authorLabel}
              </Link>
              <span>·</span>
              <span>{new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1.5 text-sm text-foreground">{c.body}</p>
          </div>
        ))}

        {loggedIn ? (
          <form action={formAction} className="space-y-2">
            <input type="hidden" name="signalId" value={signalId} />
            <Textarea
              name="body"
              placeholder={t("commentPlaceholder")}
              required
              minLength={1}
              maxLength={1000}
              rows={2}
            />
            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "…" : t("comment")}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("loginToComment")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
