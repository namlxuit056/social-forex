-- AlterTable: add lastOrders column to Mt5Connection
ALTER TABLE "Mt5Connection" ADD COLUMN "lastOrders" JSONB NOT NULL DEFAULT '[]';

-- CreateTable: Mt5Command
CREATE TABLE "Mt5Command" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ticket" TEXT,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "Mt5Command_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mt5Command_connectionId_status_createdAt_idx" ON "Mt5Command"("connectionId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "Mt5Command" ADD CONSTRAINT "Mt5Command_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Mt5Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
