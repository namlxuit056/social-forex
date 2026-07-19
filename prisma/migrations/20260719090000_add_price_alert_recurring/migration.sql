-- AlterTable
ALTER TABLE "PriceAlert" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cooldownMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "armed" BOOLEAN NOT NULL DEFAULT true;
