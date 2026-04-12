-- CreateTable
CREATE TABLE "VipAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "vipUntil" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VipAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VipAuditLog_userId_createdAt_idx" ON "VipAuditLog"("userId", "createdAt");
