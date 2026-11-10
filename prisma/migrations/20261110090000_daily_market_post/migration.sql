-- CreateTable
CREATE TABLE "DailyMarketPost" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "bias" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "telegramText" TEXT NOT NULL,
    "facebookText" TEXT NOT NULL,
    "videoScript" TEXT NOT NULL,
    "chartImageUrl" TEXT,
    "telegramSentAt" TIMESTAMP(3),
    "telegramError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMarketPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyMarketPost_day_symbol_key" ON "DailyMarketPost"("day", "symbol");

-- CreateIndex
CREATE INDEX "DailyMarketPost_createdAt_idx" ON "DailyMarketPost"("createdAt");
