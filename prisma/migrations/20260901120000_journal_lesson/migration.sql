-- Trader-written "lessons to improve" notes with an optional image.
CREATE TABLE "JournalLesson" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalLesson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JournalLesson_userId_createdAt_idx" ON "JournalLesson"("userId", "createdAt");

ALTER TABLE "JournalLesson" ADD CONSTRAINT "JournalLesson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
