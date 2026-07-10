-- Commercial licensing fields on activation_codes

ALTER TABLE "activation_codes" ADD COLUMN "licenseType" TEXT NOT NULL DEFAULT 'LIFETIME';
ALTER TABLE "activation_codes" ADD COLUMN "subscriptionMonths" INTEGER;
ALTER TABLE "activation_codes" ADD COLUMN "customerName" TEXT;
ALTER TABLE "activation_codes" ADD COLUMN "phone" TEXT;
ALTER TABLE "activation_codes" ADD COLUMN "activatedAt" DATETIME;
ALTER TABLE "activation_codes" ADD COLUMN "revokedAt" DATETIME;

UPDATE "activation_codes" SET "activatedAt" = "usedAt" WHERE "usedAt" IS NOT NULL;

CREATE INDEX "activation_codes_licenseType_idx" ON "activation_codes"("licenseType");
