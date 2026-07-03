-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'MT5_AUTO_CLOSE';

-- AlterTable
ALTER TABLE "Mt5Connection" ADD COLUMN     "autoCloseBeforeWeekend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAutoCloseTriggeredAt" TIMESTAMP(3);
