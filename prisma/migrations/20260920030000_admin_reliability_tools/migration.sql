ALTER TABLE "User"
ADD COLUMN "authVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Project"
ADD COLUMN "previewToken" TEXT;

CREATE UNIQUE INDEX "Project_previewToken_key" ON "Project"("previewToken");

ALTER TABLE "Image"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Image_deletedAt_idx" ON "Image"("deletedAt");

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
