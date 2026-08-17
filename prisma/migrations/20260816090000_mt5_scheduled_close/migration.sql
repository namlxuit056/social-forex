-- AlterTable
ALTER TABLE "Mt5Connection" ADD COLUMN     "scheduledCloseEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledCloseTime" TEXT,
ADD COLUMN     "scheduledCloseTz" TEXT NOT NULL DEFAULT 'utc',
ADD COLUMN     "lastScheduledCloseTriggeredAt" TIMESTAMP(3);
