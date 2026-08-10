-- Add studio tenant isolation to clients.

ALTER TABLE "clients" ADD COLUMN "studioId" TEXT;

UPDATE "clients" AS c
SET "studioId" = (
  SELECT b."studioId"
  FROM "bookings" b
  WHERE b."clientId" = c."id"
  ORDER BY b."createdAt" ASC
  LIMIT 1
)
WHERE c."studioId" IS NULL;

UPDATE "clients" AS c
SET "studioId" = (
  SELECT s."studioId"
  FROM "sessions" s
  WHERE s."clientId" = c."id"
  ORDER BY s."createdAt" ASC
  LIMIT 1
)
WHERE c."studioId" IS NULL;

UPDATE "clients"
SET "studioId" = (SELECT "id" FROM "studios" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "studioId" IS NULL
  AND EXISTS (SELECT 1 FROM "studios");

DELETE FROM "clients" WHERE "studioId" IS NULL;

ALTER TABLE "clients" ALTER COLUMN "studioId" SET NOT NULL;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_studioId_fkey"
  FOREIGN KEY ("studioId") REFERENCES "studios"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "clients_studioId_updatedAt_idx" ON "clients"("studioId", "updatedAt");
CREATE INDEX "clients_studioId_deletedAt_idx" ON "clients"("studioId", "deletedAt");
