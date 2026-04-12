-- CreateTable
CREATE TABLE "CalendarSyncMeta" (
    "id" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "CalendarSyncMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicCalendarEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "timeUtc" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "forecast" TEXT,
    "previous" TEXT,
    "actual" TEXT,

    CONSTRAINT "EconomicCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EconomicCalendarEvent_externalId_key" ON "EconomicCalendarEvent"("externalId");

-- CreateIndex
CREATE INDEX "EconomicCalendarEvent_timeUtc_idx" ON "EconomicCalendarEvent"("timeUtc");
