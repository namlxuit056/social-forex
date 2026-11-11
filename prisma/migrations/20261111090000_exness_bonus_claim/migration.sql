-- CreateEnum
CREATE TYPE "ExnessBonusStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "ExnessBonusClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mt5ConnectionId" TEXT,
    "accountLogin" TEXT NOT NULL,
    "accountServer" TEXT,
    "accountCompany" TEXT,
    "amountUsd" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "status" "ExnessBonusStatus" NOT NULL DEFAULT 'PENDING',
    "payoutMethod" TEXT NOT NULL,
    "payoutDetails" TEXT NOT NULL,
    "userNote" TEXT,
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExnessBonusClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExnessBonusClaim_userId_key" ON "ExnessBonusClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExnessBonusClaim_accountLogin_accountServer_key" ON "ExnessBonusClaim"("accountLogin", "accountServer");

-- CreateIndex
CREATE INDEX "ExnessBonusClaim_status_createdAt_idx" ON "ExnessBonusClaim"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ExnessBonusClaim" ADD CONSTRAINT "ExnessBonusClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
