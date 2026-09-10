-- Allowlist of users whose signals get broadcast to the Telegram channel.
-- Empty table = broadcast every signal (unchanged behavior).
CREATE TABLE "TelegramSignalBroadcaster" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramSignalBroadcaster_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "TelegramSignalBroadcaster" ADD CONSTRAINT "TelegramSignalBroadcaster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
