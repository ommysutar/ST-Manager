-- Activation codes for Platform Admin Phase 1

CREATE TABLE "activation_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "usedAt" DATETIME,
    "usedByStudioId" TEXT,
    "generatedByPlatformAdmin" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "activation_codes_usedByStudioId_fkey" FOREIGN KEY ("usedByStudioId") REFERENCES "studios" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "activation_codes_code_key" ON "activation_codes"("code");
CREATE INDEX "activation_codes_status_idx" ON "activation_codes"("status");
CREATE INDEX "activation_codes_createdAt_idx" ON "activation_codes"("createdAt");
