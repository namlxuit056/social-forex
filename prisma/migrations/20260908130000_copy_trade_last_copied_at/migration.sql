-- CopyTrade: track the last position a follower actually opened from this
-- subscription (bridge -> /api/copy-trade/report action=OPENED), so the
-- "last copied N days ago" social proof reflects real activity, not sign-up date.
ALTER TABLE "CopyTrade" ADD COLUMN "lastCopiedAt" TIMESTAMP(3);
