-- CreateEnum (idempotent: skip if already exists)
DO $$ BEGIN
  CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SignalComment" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignalComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SignalComment_signalId_createdAt_idx" ON "SignalComment"("signalId", "createdAt");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "SignalComment" ADD CONSTRAINT "SignalComment_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SignalComment" ADD CONSTRAINT "SignalComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SignalReaction" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,

    CONSTRAINT "SignalReaction_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SignalReaction_signalId_userId_key" ON "SignalReaction"("signalId", "userId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "SignalReaction" ADD CONSTRAINT "SignalReaction_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SignalReaction" ADD CONSTRAINT "SignalReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: add hidden column (idempotent)
ALTER TABLE "SignalComment" ADD COLUMN IF NOT EXISTS "hidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: add signalCommentId to ForumReport
ALTER TABLE "ForumReport" ADD COLUMN IF NOT EXISTS "signalCommentId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ForumReport_signalCommentId_idx" ON "ForumReport"("signalCommentId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
  ALTER TABLE "ForumReport" ADD CONSTRAINT "ForumReport_signalCommentId_fkey" FOREIGN KEY ("signalCommentId") REFERENCES "SignalComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
