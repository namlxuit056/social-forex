-- AlterEnum (ignore if re-run in dev)
ALTER TYPE "NotificationKind" ADD VALUE 'USER_FOLLOWED';

ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
UPDATE "Notification" SET "dedupeKey" = "signalId" WHERE "dedupeKey" IS NULL;
ALTER TABLE "Notification" ALTER COLUMN "dedupeKey" SET NOT NULL;

ALTER TABLE "Notification" DROP CONSTRAINT "Notification_signalId_fkey";
ALTER TABLE "Notification" ALTER COLUMN "signalId" DROP NOT NULL;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "actorUserId" TEXT;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "Notification_userId_signalId_key";
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
