-- Activation codes for Platform Admin Phase 1

CREATE TABLE "activation_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "usedByStudioId" TEXT,
    "generatedByPlatformAdmin" VARCHAR(64) NOT NULL,
    "notes" TEXT,
    CONSTRAINT "activation_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "activation_codes_code_key" ON "activation_codes"("code");
CREATE INDEX "activation_codes_status_idx" ON "activation_codes"("status");
CREATE INDEX "activation_codes_createdAt_idx" ON "activation_codes"("createdAt");

ALTER TABLE "activation_codes" ADD CONSTRAINT "activation_codes_usedByStudioId_fkey" FOREIGN KEY ("usedByStudioId") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
