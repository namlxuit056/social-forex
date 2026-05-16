-- CreateTable
CREATE TABLE "UserPinnedSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPinnedSignal_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "UserPinnedSignal_userId_signalId_key" ON "UserPinnedSignal"("userId", "signalId");

-- CreateIndex
CREATE INDEX "UserPinnedSignal_userId_sortOrder_idx" ON "UserPinnedSignal"("userId", "sortOrder");

-- AddForeignKey
ALTER TABLE "UserPinnedSignal" ADD CONSTRAINT "UserPinnedSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPinnedSignal" ADD CONSTRAINT "UserPinnedSignal_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
