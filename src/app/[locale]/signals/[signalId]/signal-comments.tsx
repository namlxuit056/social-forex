"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { addSignalComment } from "@/actions/signal-social";
import { hideSignalComment, unhideSignalComment } from "@/actions/moderation";
import { ReportSignalCommentButton } from "@/components/signals/report-signal-comment-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  body: string;
  authorLabel: string;
  authorId: string;
  createdAt: string;
  hidden: boolean;
}

interface Props {
  signalId: string;
  comments: Comment[];
  loggedIn: boolean;
  isMod: boolean;
  currentUserId?: string;
  locale: string;
}

function CommentSubmitButton() {
  const t = useTranslations("signals");
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? t("commentPosting") : t("comment")}
    </Button>
  );
}

export function SignalComments({
  signalId,
  comments,
  loggedIn,
  isMod,
  currentUserId,
  locale,
}: Props) {
  const t = useTranslations("signals");
  const [state, formAction] = useActionState(
    addSignalComment,
    null,
  );

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base">
          {t("comments")} ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/15 p-4">
            <div className="flex gap-3">
              <MessageCircle
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t("noCommentsTitle")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {loggedIn ? t("noCommentsHint") : t("noCommentsLoginHint")}
                </p>
              </div>
            </div>
          </div>
        )}

        {comments.map((c) => {
          const isAuthor = currentUserId === c.authorId;
          const showBody =
            !c.hidden || isMod
              ? c.body
              : isAuthor
                ? null
                : c.body;
          const showAuthorRemoved = c.hidden && !isMod && isAuthor;

          return (
            <div
              key={c.id}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Link
                  href={`/u/${c.authorId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {c.authorLabel}
                </Link>
                <span>·</span>
                <span>{new Date(c.createdAt).toLocaleString(locale)}</span>
                {c.hidden && isMod && (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("commentHiddenBadge")}
                  </Badge>
                )}
                {isMod && (
                  <span className="ml-auto">
                    {c.hidden ? (
                      <form action={unhideSignalComment} className="inline">
                        <input
                          type="hidden"
                          name="signalCommentId"
                          value={c.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                        >
                          {t("unhideComment")}
                        </Button>
                      </form>
                    ) : (
                      <form action={hideSignalComment} className="inline">
                        <input
                          type="hidden"
                          name="signalCommentId"
                          value={c.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                        >
                          {t("hideComment")}
                        </Button>
                      </form>
                    )}
                  </span>
                )}
              </div>
              {showAuthorRemoved ? (
                <p className="mt-1.5 text-sm text-muted-foreground italic">
                  {t("commentRemovedForAuthor")}
                </p>
              ) : (
                <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                  {showBody}
                </p>
              )}

              {loggedIn && currentUserId && currentUserId !== c.authorId ? (
                <div className="mt-2">
                  <ReportSignalCommentButton commentId={c.id} />
                </div>
              ) : null}
            </div>
          );
        })}

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
            <CommentSubmitButton />
          </form>
        ) : (
          <Link
            href="/auth/signin"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "min-h-9",
            )}
          >
            {t("loginToComment")}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
