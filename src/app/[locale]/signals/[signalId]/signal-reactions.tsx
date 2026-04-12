"use client";

import { useTranslations } from "next-intl";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toggleSignalReaction } from "@/actions/signal-social";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  signalId: string;
  likes: number;
  dislikes: number;
  userReaction: "LIKE" | "DISLIKE" | null;
  loggedIn: boolean;
}

export function SignalReactions({
  signalId,
  likes,
  dislikes,
  userReaction,
  loggedIn,
}: Props) {
  const t = useTranslations("signals");

  return (
    <div className="flex items-center gap-2 border-t border-border/40 pt-4">
      <form action={toggleSignalReaction}>
        <input type="hidden" name="signalId" value={signalId} />
        <input type="hidden" name="type" value="LIKE" />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!loggedIn}
          className={cn(
            "h-8 gap-1.5 text-xs",
            userReaction === "LIKE" &&
              "border-emerald-500/50 bg-emerald-500/10 text-emerald-500",
          )}
        >
          <ThumbsUp className="size-3.5" />
          {likes}
        </Button>
      </form>
      <form action={toggleSignalReaction}>
        <input type="hidden" name="signalId" value={signalId} />
        <input type="hidden" name="type" value="DISLIKE" />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={!loggedIn}
          className={cn(
            "h-8 gap-1.5 text-xs",
            userReaction === "DISLIKE" &&
              "border-red-500/50 bg-red-500/10 text-red-500",
          )}
        >
          <ThumbsDown className="size-3.5" />
          {dislikes}
        </Button>
      </form>
      {!loggedIn && (
        <span className="text-xs text-muted-foreground">
          {t("loginToComment")}
        </span>
      )}
    </div>
  );
}
