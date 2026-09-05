-- CreateTable
CREATE TABLE "TechnicalRatingDailySummary" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "totalSignals" INTEGER NOT NULL,
    "buySignals" INTEGER NOT NULL,
    "sellSignals" INTEGER NOT NULL,
    "heldSignals" INTEGER NOT NULL,
    "topSymbols" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalRatingDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalRatingDailySummary_day_key" ON "TechnicalRatingDailySummary"("day");
