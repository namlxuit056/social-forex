-- CreateTable
CREATE TABLE "TradingAgentsRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "tradeDate" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'vi',
    "analysts" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "rating" TEXT,
    "decision" TEXT,
    "reports" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "TradingAgentsRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradingAgentsRun_userId_createdAt_idx" ON "TradingAgentsRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TradingAgentsRun_symbol_tradeDate_language_status_idx" ON "TradingAgentsRun"("symbol", "tradeDate", "language", "status");

-- AddForeignKey
ALTER TABLE "TradingAgentsRun" ADD CONSTRAINT "TradingAgentsRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

