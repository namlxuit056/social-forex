-- CreateEnum
CREATE TYPE "VipPaymentStatus" AS ENUM ('CREATED', 'CAPTURED', 'FULFILLED', 'FAILED');

-- CreateTable
CREATE TABLE "VipPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYPAL',
    "providerOrderId" TEXT NOT NULL,
    "providerCaptureId" TEXT,
    "planKey" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "VipPaymentStatus" NOT NULL DEFAULT 'CREATED',
    "vipUntil" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VipWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'PAYPAL',
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "processedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VipWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "VipPayment_providerOrderId_key" ON "VipPayment"("providerOrderId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "VipPayment_providerCaptureId_key" ON "VipPayment"("providerCaptureId");

-- CreateIndex
CREATE INDEX "VipPayment_userId_createdAt_idx" ON "VipPayment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VipPayment_status_createdAt_idx" ON "VipPayment"("status", "createdAt");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "VipWebhookEvent_providerEventId_key" ON "VipWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "VipWebhookEvent_eventType_createdAt_idx" ON "VipWebhookEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "VipWebhookEvent_providerOrderId_idx" ON "VipWebhookEvent"("providerOrderId");

-- AddForeignKey
ALTER TABLE "VipPayment" ADD CONSTRAINT "VipPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
