-- CreateTable
CREATE TABLE "UserMissionClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "xpAwarded" INTEGER NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMissionClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserMissionClaim_userId_idx" ON "UserMissionClaim"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMissionClaim_userId_missionId_key" ON "UserMissionClaim"("userId", "missionId");

-- AddForeignKey
ALTER TABLE "UserMissionClaim" ADD CONSTRAINT "UserMissionClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
