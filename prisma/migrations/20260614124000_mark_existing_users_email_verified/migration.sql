UPDATE "User"
SET "emailVerified" = COALESCE("emailVerified", "createdAt", CURRENT_TIMESTAMP)
WHERE "email" IS NOT NULL
  AND "passwordHash" IS NOT NULL
  AND "emailVerified" IS NULL;
