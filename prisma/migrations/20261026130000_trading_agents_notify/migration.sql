-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'TRADING_AGENTS_DONE';

-- AlterTable
ALTER TABLE "TradingAgentsRun" ADD COLUMN "watcherIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
