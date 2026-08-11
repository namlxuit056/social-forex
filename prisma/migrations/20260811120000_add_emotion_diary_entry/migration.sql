-- CreateTable
CREATE TABLE "EmotionDiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmotionDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmotionDiaryEntry_userId_date_idx" ON "EmotionDiaryEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EmotionDiaryEntry_userId_date_key" ON "EmotionDiaryEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "EmotionDiaryEntry" ADD CONSTRAINT "EmotionDiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
