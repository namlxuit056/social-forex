CREATE TYPE "TradingPlanBias" AS ENUM ('BULLISH', 'BEARISH', 'RANGE', 'WAIT');

CREATE TABLE "DailyTradingPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planDate" TIMESTAMP(3) NOT NULL,
  "watchedSymbols" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "bias" "TradingPlanBias" NOT NULL DEFAULT 'WAIT',
  "keyLevels" TEXT,
  "newsToAvoid" TEXT,
  "maxRiskPercent" DOUBLE PRECISION,
  "maxTrades" INTEGER,
  "sessionFocus" TEXT,
  "notes" TEXT,
  "checkedNews" BOOLEAN NOT NULL DEFAULT false,
  "checkedLevels" BOOLEAN NOT NULL DEFAULT false,
  "checkedRisk" BOOLEAN NOT NULL DEFAULT false,
  "checkedEmotion" BOOLEAN NOT NULL DEFAULT false,
  "checkedJournal" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DailyTradingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyTradingPlan_userId_planDate_key" ON "DailyTradingPlan"("userId", "planDate");
CREATE INDEX "DailyTradingPlan_userId_planDate_idx" ON "DailyTradingPlan"("userId", "planDate");

ALTER TABLE "DailyTradingPlan" ADD CONSTRAINT "DailyTradingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
