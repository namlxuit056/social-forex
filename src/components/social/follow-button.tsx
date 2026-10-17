"use client";

import { useTranslations } from "next-intl";
import { toggleFollowUser } from "@/actions/social";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FollowButton({
  userId,
  isFollowing,
  className,
}: {
  userId: string;
  isFollowing: boolean;
  className?: string;
}) {
  const t = useTranslations("profile");

  return (
    <form action={toggleFollowUser} className="inline-flex">
      <input type="hidden" name="targetUserId" value={userId} />
      <Button
        type="submit"
        size="sm"
        variant={isFollowing ? "secondary" : "outline"}
        className={cn("h-8 min-w-[5.5rem] px-2 text-xs", className)}
      >
        {isFollowing ? t("following") : t("follow")}
      </Button>
    </form>
  );
}
