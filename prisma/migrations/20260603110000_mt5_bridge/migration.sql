-- CreateTable
CREATE TABLE "Mt5Connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'MT5 Bridge',
    "tokenHash" TEXT NOT NULL,
    "tokenLast4" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "accountLogin" TEXT,
    "accountServer" TEXT,
    "accountName" TEXT,
    "accountCompany" TEXT,
    "accountCurrency" TEXT,
    "balance" DOUBLE PRECISION,
    "equity" DOUBLE PRECISION,
    "margin" DOUBLE PRECISION,
    "freeMargin" DOUBLE PRECISION,
    "leverage" INTEGER,
    "openPositions" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mt5Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mt5Snapshot" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "account" JSONB NOT NULL,
    "positions" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mt5Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mt5Connection_tokenHash_key" ON "Mt5Connection"("tokenHash");

-- CreateIndex
CREATE INDEX "Mt5Connection_userId_revokedAt_idx" ON "Mt5Connection"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Mt5Connection_lastSeenAt_idx" ON "Mt5Connection"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Mt5Snapshot_connectionId_receivedAt_idx" ON "Mt5Snapshot"("connectionId", "receivedAt");

-- AddForeignKey
ALTER TABLE "Mt5Connection" ADD CONSTRAINT "Mt5Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mt5Snapshot" ADD CONSTRAINT "Mt5Snapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Mt5Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
