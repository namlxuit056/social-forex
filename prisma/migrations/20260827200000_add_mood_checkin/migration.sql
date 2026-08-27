-- CreateTable
CREATE TABLE "MoodCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "mood" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MoodCheckin_userId_day_idx" ON "MoodCheckin"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "MoodCheckin_userId_day_key" ON "MoodCheckin"("userId", "day");

-- AddForeignKey
ALTER TABLE "MoodCheckin" ADD CONSTRAINT "MoodCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
