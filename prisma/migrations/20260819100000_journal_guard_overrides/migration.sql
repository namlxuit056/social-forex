-- AlterTable
ALTER TABLE "TradeJournal" ADD COLUMN     "overrodeDailyLimit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overrodeLossStreakGuard" BOOLEAN NOT NULL DEFAULT false;
