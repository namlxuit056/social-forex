-- CreateTable
CREATE TABLE "TradingGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "targetWinRate" DOUBLE PRECISION,
    "targetAvgR" DOUBLE PRECISION,
    "targetNetPnl" DOUBLE PRECISION,
    "targetTrades" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradingGoal_userId_month_idx" ON "TradingGoal"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "TradingGoal_userId_month_key" ON "TradingGoal"("userId", "month");

-- AddForeignKey
ALTER TABLE "TradingGoal" ADD CONSTRAINT "TradingGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
