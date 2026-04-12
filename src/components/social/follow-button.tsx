"use client";

import { useTranslations } from "next-intl";
import { toggleFollowUser } from "@/actions/social";
import { Button } from "@/components/ui/button";

export function FollowButton({
  userId,
  isFollowing,
}: {
  userId: string;
  isFollowing: boolean;
}) {
  const t = useTranslations("profile");

  return (
    <form action={toggleFollowUser}>
      <input type="hidden" name="targetUserId" value={userId} />
      <Button
        type="submit"
        size="sm"
        variant={isFollowing ? "outline" : "default"}
      >
        {isFollowing ? t("following") : t("follow")}
      </Button>
    </form>
  );
}
