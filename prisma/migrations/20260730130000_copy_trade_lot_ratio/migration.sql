-- AlterEnum
ALTER TYPE "CopyTradeMode" ADD VALUE 'RATIO';

-- AlterTable
ALTER TABLE "CopyTrade" ADD COLUMN "lotPercent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Signal" ADD COLUMN "lotSize" DOUBLE PRECISION;
