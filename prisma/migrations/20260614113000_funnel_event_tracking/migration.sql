CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "visitorId" TEXT,
    "userId" TEXT,
    "path" TEXT NOT NULL,
    "fullPath" TEXT,
    "locale" TEXT,
    "surface" TEXT,
    "cta" TEXT,
    "destination" TEXT,
    "reason" TEXT,
    "properties" JSONB,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FunnelEvent_eventName_createdAt_idx" ON "FunnelEvent"("eventName", "createdAt");
CREATE INDEX "FunnelEvent_visitorId_createdAt_idx" ON "FunnelEvent"("visitorId", "createdAt");
CREATE INDEX "FunnelEvent_userId_createdAt_idx" ON "FunnelEvent"("userId", "createdAt");
CREATE INDEX "FunnelEvent_path_createdAt_idx" ON "FunnelEvent"("path", "createdAt");
CREATE INDEX "FunnelEvent_createdAt_idx" ON "FunnelEvent"("createdAt");

ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
