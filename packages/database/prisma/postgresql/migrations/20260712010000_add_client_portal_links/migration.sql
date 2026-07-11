-- CreateTable
CREATE TABLE "client_portal_links" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "projectKey" VARCHAR(64) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "snapshot" JSONB NOT NULL,
    "studioMessage" TEXT,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_portal_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_links_tokenHash_key" ON "client_portal_links"("tokenHash");

-- CreateIndex
CREATE INDEX "client_portal_links_studioId_status_idx" ON "client_portal_links"("studioId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_links_studioId_projectKey_key" ON "client_portal_links"("studioId", "projectKey");

-- AddForeignKey
ALTER TABLE "client_portal_links" ADD CONSTRAINT "client_portal_links_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
