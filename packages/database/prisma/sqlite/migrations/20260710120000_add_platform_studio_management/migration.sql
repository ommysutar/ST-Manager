-- Platform Admin Phase 2: studio status + platform audit log

ALTER TABLE "studios" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "studios" ADD COLUMN "archivedAt" DATETIME;

CREATE INDEX "studios_status_idx" ON "studios"("status");

CREATE TABLE "platform_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "studioId" TEXT,
    "studioName" TEXT,
    "metadata" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");
CREATE INDEX "platform_audit_logs_studioId_idx" ON "platform_audit_logs"("studioId");
