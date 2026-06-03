-- CreateTable
CREATE TABLE "UserDemoChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "completedAt" TIMESTAMP(3),
    "rewardGrantedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDemoChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDemoChallenge_userId_key" ON "UserDemoChallenge"("userId");

-- CreateIndex
CREATE INDEX "UserDemoChallenge_rewardGrantedAt_idx" ON "UserDemoChallenge"("rewardGrantedAt");

-- AddForeignKey
ALTER TABLE "UserDemoChallenge" ADD CONSTRAINT "UserDemoChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
