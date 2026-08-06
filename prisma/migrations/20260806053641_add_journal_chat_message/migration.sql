-- CreateTable
CREATE TABLE "JournalChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalChatMessage_userId_createdAt_idx" ON "JournalChatMessage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "JournalChatMessage" ADD CONSTRAINT "JournalChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

