-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "inquiryNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inquiry',
    "projectId" TEXT,
    "advanceAmount" REAL,
    "remainingBalance" REAL,
    "form" JSONB NOT NULL,
    "quotation" JSONB NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "inquiries_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'cash',
    "notes" TEXT NOT NULL DEFAULT '',
    "receivedBy" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'received',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payments_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "inquiryId" TEXT,
    "projectId" TEXT,
    "paymentId" TEXT,
    "snapshot" JSONB,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_documents_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "studio_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "active" INTEGER NOT NULL DEFAULT 1,
    "mandatory" INTEGER NOT NULL DEFAULT 0,
    "isStudioRent" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyPrice" REAL NOT NULL DEFAULT 0,
    "prices" JSONB NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_services_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomName" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "active" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_rooms_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "booking_slot_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startHour" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL DEFAULT 0,
    "endHour" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "isCustom" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "booking_slot_definitions_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "studio_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "whatsapp" JSONB NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "studio_settings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_studioId_inquiryNumber_key" ON "inquiries"("studioId", "inquiryNumber");
CREATE INDEX "inquiries_studioId_updatedAt_idx" ON "inquiries"("studioId", "updatedAt");
CREATE INDEX "inquiries_studioId_deletedAt_idx" ON "inquiries"("studioId", "deletedAt");

CREATE INDEX "payments_studioId_updatedAt_idx" ON "payments"("studioId", "updatedAt");
CREATE INDEX "payments_studioId_projectId_idx" ON "payments"("studioId", "projectId");
CREATE INDEX "payments_studioId_deletedAt_idx" ON "payments"("studioId", "deletedAt");

CREATE UNIQUE INDEX "studio_documents_studioId_type_documentNumber_key" ON "studio_documents"("studioId", "type", "documentNumber");
CREATE INDEX "studio_documents_studioId_updatedAt_idx" ON "studio_documents"("studioId", "updatedAt");
CREATE INDEX "studio_documents_studioId_deletedAt_idx" ON "studio_documents"("studioId", "deletedAt");
CREATE INDEX "studio_documents_studioId_projectId_idx" ON "studio_documents"("studioId", "projectId");

CREATE INDEX "studio_services_studioId_updatedAt_idx" ON "studio_services"("studioId", "updatedAt");
CREATE INDEX "studio_services_studioId_deletedAt_idx" ON "studio_services"("studioId", "deletedAt");

CREATE INDEX "studio_rooms_studioId_updatedAt_idx" ON "studio_rooms"("studioId", "updatedAt");
CREATE INDEX "studio_rooms_studioId_deletedAt_idx" ON "studio_rooms"("studioId", "deletedAt");

CREATE INDEX "booking_slot_definitions_studioId_updatedAt_idx" ON "booking_slot_definitions"("studioId", "updatedAt");
CREATE INDEX "booking_slot_definitions_studioId_deletedAt_idx" ON "booking_slot_definitions"("studioId", "deletedAt");

CREATE UNIQUE INDEX "studio_settings_studioId_key" ON "studio_settings"("studioId");
CREATE INDEX "studio_settings_studioId_updatedAt_idx" ON "studio_settings"("studioId", "updatedAt");
