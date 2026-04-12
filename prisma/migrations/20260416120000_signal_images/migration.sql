-- CreateTable
CREATE TABLE "SignalImage" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignalImage_signalId_sortOrder_idx" ON "SignalImage"("signalId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SignalImage" ADD CONSTRAINT "SignalImage_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
