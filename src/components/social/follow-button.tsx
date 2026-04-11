"use client";

import { toggleFollowUser } from "@/actions/social";

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
      <button
        type="submit"
        className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
          isFollowing
            ? "border border-zinc-600 text-zinc-300 hover:bg-zinc-800"
            : "bg-emerald-600 text-white hover:bg-emerald-500"
        }`}
      >
        {isFollowing ? "Đang follow" : "Follow"}
      </button>
    </form>
  );
}
