-- CreateTable
CREATE TABLE "client_portal_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME,
    "completedAt" DATETIME,
    "snapshot" JSONB NOT NULL,
    "studioMessage" TEXT,
    "disabledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "client_portal_links_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "studios" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_links_tokenHash_key" ON "client_portal_links"("tokenHash");

-- CreateIndex
CREATE INDEX "client_portal_links_studioId_status_idx" ON "client_portal_links"("studioId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "client_portal_links_studioId_projectKey_key" ON "client_portal_links"("studioId", "projectKey");
