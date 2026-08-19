-- Stable studio-scoped client display numbers (CL-xxxx).

ALTER TABLE "clients" ADD COLUMN "displayNumber" TEXT;

UPDATE "clients"
SET "displayNumber" = (
  SELECT 'CL-' || printf('%04d', COUNT(*))
  FROM "clients" AS earlier
  WHERE earlier."studioId" = "clients"."studioId"
    AND (
      earlier."createdAt" < "clients"."createdAt"
      OR (earlier."createdAt" = "clients"."createdAt" AND earlier."id" <= "clients"."id")
    )
);

CREATE UNIQUE INDEX "clients_studioId_displayNumber_key"
  ON "clients"("studioId", "displayNumber");
