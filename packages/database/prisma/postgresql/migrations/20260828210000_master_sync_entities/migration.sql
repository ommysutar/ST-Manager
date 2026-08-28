-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "inquiryNumber" VARCHAR(16) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'inquiry',
    "projectId" VARCHAR(64),
    "advanceAmount" DOUBLE PRECISION,
    "remainingBalance" DOUBLE PRECISION,
    "form" JSONB NOT NULL,
    "quotation" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" VARCHAR(16) NOT NULL DEFAULT 'cash',
    "notes" VARCHAR(2000) NOT NULL DEFAULT '',
    "receivedBy" VARCHAR(120) NOT NULL DEFAULT '',
    "source" VARCHAR(16) NOT NULL DEFAULT 'manual',
    "status" VARCHAR(32) NOT NULL DEFAULT 'received',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_documents" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "documentNumber" VARCHAR(16) NOT NULL,
    "inquiryId" VARCHAR(64),
    "projectId" TEXT,
    "paymentId" VARCHAR(64),
    "snapshot" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_services" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(120) NOT NULL DEFAULT '',
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "isStudioRent" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "legacyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prices" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_rooms" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "roomName" VARCHAR(120),
    "description" VARCHAR(2000) NOT NULL DEFAULT '',
    "color" VARCHAR(16) NOT NULL DEFAULT '#6366f1',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_slot_definitions" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "startHour" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL DEFAULT 0,
    "endHour" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL DEFAULT 0,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_slot_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_settings" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "whatsapp" JSONB NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_settings_pkey" PRIMARY KEY ("id")
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

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_documents" ADD CONSTRAINT "studio_documents_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_documents" ADD CONSTRAINT "studio_documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "studio_services" ADD CONSTRAINT "studio_services_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_rooms" ADD CONSTRAINT "studio_rooms_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_slot_definitions" ADD CONSTRAINT "booking_slot_definitions_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "studio_settings" ADD CONSTRAINT "studio_settings_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
