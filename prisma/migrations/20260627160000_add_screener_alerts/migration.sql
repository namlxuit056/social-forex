-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'SCREENER_ALERT';

-- CreateTable
CREATE TABLE "ScreenerAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreenerAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenerAlertLog" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "ScreenerAlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreenerAlert_userId_isActive_idx" ON "ScreenerAlert"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ScreenerAlertLog_alertId_triggeredAt_idx" ON "ScreenerAlertLog"("alertId", "triggeredAt");

-- AddForeignKey
ALTER TABLE "ScreenerAlert" ADD CONSTRAINT "ScreenerAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerAlertLog" ADD CONSTRAINT "ScreenerAlertLog_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "ScreenerAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
