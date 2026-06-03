-- AlterEnum
ALTER TYPE "SignalStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Mt5SignalKind" AS ENUM ('PENDING_ORDER', 'OPEN_POSITION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Mt5Connection" ADD COLUMN IF NOT EXISTS "pendingOrders" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Mt5Snapshot" ADD COLUMN IF NOT EXISTS "orders" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE IF NOT EXISTS "Mt5SignalLink" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "mt5Ticket" TEXT NOT NULL,
    "kind" "Mt5SignalKind" NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mt5SignalLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Mt5SignalLink_signalId_key" ON "Mt5SignalLink"("signalId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Mt5SignalLink_connectionId_mt5Ticket_key" ON "Mt5SignalLink"("connectionId", "mt5Ticket");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Mt5SignalLink_connectionId_kind_idx" ON "Mt5SignalLink"("connectionId", "kind");

-- AddForeignKey
ALTER TABLE "Mt5SignalLink" ADD CONSTRAINT "Mt5SignalLink_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Mt5Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mt5SignalLink" ADD CONSTRAINT "Mt5SignalLink_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
