-- CreateTable
CREATE TABLE "TrailingStopConfig" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "ticket" TEXT NOT NULL,
    "distancePips" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrailingStopConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrailingStopConfig_connectionId_ticket_key" ON "TrailingStopConfig"("connectionId", "ticket");

-- AddForeignKey
ALTER TABLE "TrailingStopConfig" ADD CONSTRAINT "TrailingStopConfig_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Mt5Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
