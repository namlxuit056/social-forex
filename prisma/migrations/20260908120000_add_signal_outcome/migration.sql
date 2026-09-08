-- CreateTable
CREATE TABLE "SignalOutcome" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "stance" TEXT NOT NULL,
    "firedAt" TIMESTAMP(3) NOT NULL,
    "entryPrice" DOUBLE PRECISION NOT NULL,
    "evaluatedAt" TIMESTAMP(3),
    "exitPrice" DOUBLE PRECISION,
    "result" TEXT,
    "favorPct" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignalOutcome_dedupeKey_key" ON "SignalOutcome"("dedupeKey");

-- CreateIndex
CREATE INDEX "SignalOutcome_source_firedAt_idx" ON "SignalOutcome"("source", "firedAt");

-- CreateIndex
CREATE INDEX "SignalOutcome_evaluatedAt_idx" ON "SignalOutcome"("evaluatedAt");
