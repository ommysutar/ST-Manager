-- Team management: studio membership, roles, permissions, invitations, audit log

-- AlterTable: extend users
ALTER TABLE "users" ADD COLUMN "fullName" TEXT;
ALTER TABLE "users" ADD COLUMN "phone" TEXT;
ALTER TABLE "users" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN "studioId" TEXT;
ALTER TABLE "users" ADD COLUMN "customPermissions" JSON;
ALTER TABLE "users" ADD COLUMN "lastLoginAt" DATETIME;

-- CreateTable: permissions
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable: role_definitions
CREATE TABLE "role_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: role_permissions
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    PRIMARY KEY ("roleId", "permissionId")
);

-- CreateTable: studio_invitations
CREATE TABLE "studio_invitations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "customPermissions" JSON,
    "expiresAt" DATETIME NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSON,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
CREATE UNIQUE INDEX "role_definitions_studioId_name_key" ON "role_definitions"("studioId", "name");
CREATE UNIQUE INDEX "studio_invitations_tokenHash_key" ON "studio_invitations"("tokenHash");
CREATE INDEX "studio_invitations_studioId_status_idx" ON "studio_invitations"("studioId", "status");
CREATE INDEX "studio_invitations_email_idx" ON "studio_invitations"("email");
CREATE INDEX "users_studioId_idx" ON "users"("studioId");
CREATE INDEX "audit_logs_studioId_createdAt_idx" ON "audit_logs"("studioId", "createdAt");

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

-- Seed system roles
INSERT INTO "role_definitions" ("id", "studioId", "name", "label", "isSystem", "createdAt", "updatedAt") VALUES
  ('role_owner', NULL, 'owner', 'Owner', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_manager', NULL, 'manager', 'Manager', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_engineer', NULL, 'engineer', 'Engineer', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_assistant', NULL, 'assistant', 'Assistant', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_reception', NULL, 'reception', 'Reception', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role_accountant', NULL, 'accountant', 'Accountant', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_owner', "id" FROM "permissions";

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_manager', "id" FROM "permissions" WHERE "key" NOT IN ('users.manage', 'settings.manage');

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_engineer', "id" FROM "permissions" WHERE "key" IN (
  'clients.view', 'bookings.manage', 'calendar.manage', 'tasks.manage', 'reports.view'
);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_assistant', "id" FROM "permissions" WHERE "key" IN (
  'clients.view', 'clients.create', 'bookings.manage', 'calendar.manage',
  'tasks.manage', 'quotations.manage', 'reports.view', 'finance.view'
);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_reception', "id" FROM "permissions" WHERE "key" IN (
  'clients.view', 'clients.create', 'bookings.manage', 'calendar.manage'
);

INSERT INTO "role_permissions" ("roleId", "permissionId")
SELECT 'role_accountant', "id" FROM "permissions" WHERE "key" IN (
  'finance.view', 'finance.manage', 'reports.view', 'reports.export', 'clients.view'
);

-- Migrate existing users without studio
INSERT INTO "studios" ("id", "name", "createdAt", "updatedAt")
SELECT
  'legacy_' || "id",
  'My Studio',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users"
WHERE "studioId" IS NULL AND "role" = 'owner';

UPDATE "users"
SET "studioId" = 'legacy_' || "id"
WHERE "studioId" IS NULL AND "role" = 'owner';

UPDATE "users"
SET "studioId" = (SELECT "id" FROM "studios" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "studioId" IS NULL;
