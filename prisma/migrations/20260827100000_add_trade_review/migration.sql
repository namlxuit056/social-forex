-- CreateTable
CREATE TABLE "AiTradeReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "review" JSONB NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTradeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiTradeReview_tradeId_key" ON "AiTradeReview"("tradeId");

-- CreateIndex
CREATE INDEX "AiTradeReview_userId_createdAt_idx" ON "AiTradeReview"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiTradeReview" ADD CONSTRAINT "AiTradeReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTradeReview" ADD CONSTRAINT "AiTradeReview_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "TradeJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
