-- CreateTable
CREATE TABLE "AiDailyJournalReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "dayEnd" TIMESTAMP(3) NOT NULL,
    "tradeCount" INTEGER NOT NULL,
    "analysis" JSONB NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDailyJournalReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiDailyJournalReview_userId_day_idx" ON "AiDailyJournalReview"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AiDailyJournalReview_userId_day_key" ON "AiDailyJournalReview"("userId", "day");

-- AddForeignKey
ALTER TABLE "AiDailyJournalReview" ADD CONSTRAINT "AiDailyJournalReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
