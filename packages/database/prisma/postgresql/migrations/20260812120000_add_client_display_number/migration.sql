-- Stable studio-scoped client display numbers (CL-xxxx).

ALTER TABLE "clients" ADD COLUMN "displayNumber" TEXT;

WITH numbered AS (
  SELECT
    "id",
    "studioId",
    ROW_NUMBER() OVER (PARTITION BY "studioId" ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "clients"
)
UPDATE "clients" AS c
SET "displayNumber" = 'CL-' || LPAD(numbered.rn::text, 4, '0')
FROM numbered
WHERE c."id" = numbered."id";

ALTER TABLE "clients" ALTER COLUMN "displayNumber" SET NOT NULL;

CREATE UNIQUE INDEX "clients_studioId_displayNumber_key"
  ON "clients"("studioId", "displayNumber");
