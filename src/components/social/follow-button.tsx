"use client";

import { toggleFollowUser } from "@/actions/social";
import { Button } from "@/components/ui/button";

export function FollowButton({
  userId,
  isFollowing,
}: {
  userId: string;
  isFollowing: boolean;
}) {
  return (
    <form action={toggleFollowUser}>
      <input type="hidden" name="targetUserId" value={userId} />
      <Button
        type="submit"
        size="sm"
        variant={isFollowing ? "outline" : "default"}
      >
        {isFollowing ? "Đang follow" : "Follow"}
      </Button>
    </form>
  );
}
