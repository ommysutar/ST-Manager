-- Team management: studio membership, roles, permissions, invitations, audit log

-- AlterTable: extend users
ALTER TABLE "users" ADD COLUMN "fullName" VARCHAR(120);
ALTER TABLE "users" ADD COLUMN "phone" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN "status" VARCHAR(32) NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN "studioId" TEXT;
ALTER TABLE "users" ADD COLUMN "customPermissions" JSONB;
ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateTable: permissions
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: role_definitions
CREATE TABLE "role_definitions" (
    "id" TEXT NOT NULL,
    "studioId" TEXT,
    "name" VARCHAR(32) NOT NULL,
    "label" VARCHAR(64) NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "role_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: role_permissions
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable: studio_invitations
CREATE TABLE "studio_invitations" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(64),
    "role" VARCHAR(32) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "customPermissions" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "studio_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(32),
    "targetId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
CREATE UNIQUE INDEX "role_definitions_studioId_name_key" ON "role_definitions"("studioId", "name");
CREATE UNIQUE INDEX "studio_invitations_tokenHash_key" ON "studio_invitations"("tokenHash");
CREATE INDEX "studio_invitations_studioId_status_idx" ON "studio_invitations"("studioId", "status");
CREATE INDEX "studio_invitations_email_idx" ON "studio_invitations"("email");
CREATE INDEX "users_studioId_idx" ON "users"("studioId");
CREATE INDEX "audit_logs_studioId_createdAt_idx" ON "audit_logs"("studioId", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_definitions" ADD CONSTRAINT "role_definitions_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "studio_invitations" ADD CONSTRAINT "studio_invitations_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_invitations" ADD CONSTRAINT "studio_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed permissions
INSERT INTO "permissions" ("id", "key", "label", "category") VALUES
  ('perm_clients_view', 'clients.view', 'View Clients', 'clients'),
  ('perm_clients_create', 'clients.create', 'Create Clients', 'clients'),
  ('perm_clients_delete', 'clients.delete', 'Delete Clients', 'clients'),
  ('perm_finance_view', 'finance.view', 'View Finance', 'finance'),
  ('perm_finance_manage', 'finance.manage', 'Manage Finance', 'finance'),
  ('perm_users_manage', 'users.manage', 'Manage Users', 'users'),
  ('perm_settings_manage', 'settings.manage', 'Manage Settings', 'settings'),
  ('perm_reports_view', 'reports.view', 'View Reports', 'reports'),
  ('perm_reports_export', 'reports.export', 'Export Reports', 'reports'),
  ('perm_projects_delete', 'projects.delete', 'Delete Projects', 'projects'),
  ('perm_calendar_manage', 'calendar.manage', 'Manage Calendar', 'calendar'),
  ('perm_bookings_manage', 'bookings.manage', 'Manage Bookings', 'bookings'),
  ('perm_tasks_manage', 'tasks.manage', 'Manage Tasks', 'tasks'),
  ('perm_quotations_manage', 'quotations.manage', 'Manage Quotations', 'quotations');

-- Seed system roles (studioId NULL = global system roles)
INSERT INTO "role_definitions" ("id", "studioId", "name", "label", "isSystem", "createdAt", "updatedAt") VALUES
  ('role_owner', NULL, 'owner', 'Owner', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_manager', NULL, 'manager', 'Manager', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_engineer', NULL, 'engineer', 'Engineer', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_assistant', NULL, 'assistant', 'Assistant', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_reception', NULL, 'reception', 'Reception', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_accountant', NULL, 'accountant', 'Accountant', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Owner: all permissions
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_owner', "id" FROM "permissions";

-- Manager: all except users.manage and settings.manage
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_manager', "id" FROM "permissions" WHERE "key" NOT IN ('users.manage', 'settings.manage');

-- Engineer: limited
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_engineer', "id" FROM "permissions" WHERE "key" IN (
  'clients.view', 'bookings.manage', 'calendar.manage', 'tasks.manage', 'reports.view'
);

-- Assistant: broad operational access
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_assistant', "id" FROM "permissions" WHERE "key" IN (
  'clients.view', 'clients.create', 'bookings.manage', 'calendar.manage',
  'tasks.manage', 'quotations.manage', 'reports.view', 'finance.view'
);

-- Reception: front desk
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_reception', "id" FROM "permissions" WHERE "key" IN (
  'clients.view', 'clients.create', 'bookings.manage', 'calendar.manage'
);

-- Accountant: finance focus
INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_accountant', "id" FROM "permissions" WHERE "key" IN (
  'finance.view', 'finance.manage', 'reports.view', 'reports.export', 'clients.view'
);

-- Migrate existing users: create a default studio per owner user without studioId
INSERT INTO "studios" ("id", "name", "createdAt", "updatedAt")
SELECT
  'legacy_' || "id",
  'My Studio',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users"
WHERE "studioId" IS NULL AND "role" = 'owner';

UPDATE "users" u
SET "studioId" = 'legacy_' || u."id"
WHERE u."studioId" IS NULL AND u."role" = 'owner';

-- Assign non-owner users to the first available studio (dev seed compatibility)
UPDATE "users" u
SET "studioId" = (SELECT s."id" FROM "studios" s ORDER BY s."createdAt" ASC LIMIT 1)
WHERE u."studioId" IS NULL;
