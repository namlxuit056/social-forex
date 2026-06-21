-- CreateTable
CREATE TABLE "AiTradeProposal" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "entry" DOUBLE PRECISION NOT NULL,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "confidence" INTEGER,
    "qualityScore" DOUBLE PRECISION,
    "reasoning" TEXT NOT NULL,
    "checklist" JSONB,
    "keyLevels" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "signalId" TEXT,
    "mt5Ticket" TEXT,

    CONSTRAINT "AiTradeProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiTradeProposal_userId_status_createdAt_idx" ON "AiTradeProposal"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AiTradeProposal_connectionId_status_idx" ON "AiTradeProposal"("connectionId", "status");

-- AddForeignKey
ALTER TABLE "AiTradeProposal" ADD CONSTRAINT "AiTradeProposal_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Mt5Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiTradeProposal" ADD CONSTRAINT "AiTradeProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
