-- AlterTable
ALTER TABLE "Mt5Connection" ADD COLUMN     "autoCloseEndOfDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastAutoCloseEodTriggeredAt" TIMESTAMP(3);
