-- Add studio tenant isolation to clients.

ALTER TABLE "clients" ADD COLUMN "studioId" TEXT;

UPDATE "clients"
SET "studioId" = (
  SELECT b."studioId"
  FROM "bookings" b
  WHERE b."clientId" = "clients"."id"
  ORDER BY b."createdAt" ASC
  LIMIT 1
)
WHERE "studioId" IS NULL;

UPDATE "clients"
SET "studioId" = (
  SELECT s."studioId"
  FROM "sessions" s
  WHERE s."clientId" = "clients"."id"
  ORDER BY s."createdAt" ASC
  LIMIT 1
)
WHERE "studioId" IS NULL;

UPDATE "clients"
SET "studioId" = (SELECT "id" FROM "studios" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "studioId" IS NULL
  AND EXISTS (SELECT 1 FROM "studios");

DELETE FROM "clients" WHERE "studioId" IS NULL;

CREATE TABLE "clients_new" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studioId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "whatsappNumber" TEXT,
  "whatsappSameAsPhone" BOOLEAN NOT NULL DEFAULT false,
  "company" TEXT,
  "notes" TEXT,
  "deletedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "clients_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "clients_new" (
  "id", "studioId", "name", "email", "phone", "whatsappNumber", "whatsappSameAsPhone",
  "company", "notes", "deletedAt", "createdAt", "updatedAt"
)
SELECT
  "id", "studioId", "name", "email", "phone", "whatsappNumber", "whatsappSameAsPhone",
  "company", "notes", "deletedAt", "createdAt", "updatedAt"
FROM "clients";

DROP TABLE "clients";
ALTER TABLE "clients_new" RENAME TO "clients";

CREATE INDEX "clients_studioId_updatedAt_idx" ON "clients"("studioId", "updatedAt");
CREATE INDEX "clients_studioId_deletedAt_idx" ON "clients"("studioId", "deletedAt");
