-- Log of times a user clicked "continue anyway" past a risk guard on a surface
-- that has no per-trade row to record it on (currently the copy-trade modal's
-- loss-streak guard). The journal's own guards keep recording on TradeJournal.
CREATE TABLE "GuardOverrideEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "guard" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardOverrideEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuardOverrideEvent_userId_createdAt_idx" ON "GuardOverrideEvent"("userId", "createdAt");

ALTER TABLE "GuardOverrideEvent" ADD CONSTRAINT "GuardOverrideEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
