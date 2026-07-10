-- Commercial licensing fields on activation_codes

ALTER TABLE "activation_codes" ADD COLUMN "licenseType" VARCHAR(32) NOT NULL DEFAULT 'LIFETIME';
ALTER TABLE "activation_codes" ADD COLUMN "subscriptionMonths" INTEGER;
ALTER TABLE "activation_codes" ADD COLUMN "customerName" VARCHAR(120);
ALTER TABLE "activation_codes" ADD COLUMN "phone" VARCHAR(64);
ALTER TABLE "activation_codes" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "activation_codes" ADD COLUMN "revokedAt" TIMESTAMP(3);

UPDATE "activation_codes" SET "activatedAt" = "usedAt" WHERE "usedAt" IS NOT NULL;

CREATE INDEX "activation_codes_licenseType_idx" ON "activation_codes"("licenseType");
