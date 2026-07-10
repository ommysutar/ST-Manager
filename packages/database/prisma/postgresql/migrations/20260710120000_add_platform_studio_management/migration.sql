-- Platform Admin Phase 2: studio status + platform audit log

ALTER TABLE "studios" ADD COLUMN "status" VARCHAR(32) NOT NULL DEFAULT 'active';
ALTER TABLE "studios" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "studios_status_idx" ON "studios"("status");

CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" VARCHAR(255) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "studioId" TEXT,
    "studioName" VARCHAR(120),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");
CREATE INDEX "platform_audit_logs_studioId_idx" ON "platform_audit_logs"("studioId");
