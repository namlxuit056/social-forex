-- AlterTable
ALTER TABLE "User" ADD COLUMN     "copyTradingPaused" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Signal" ADD COLUMN     "excludedFromCopy" BOOLEAN NOT NULL DEFAULT false;
