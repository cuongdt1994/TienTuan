-- Cloudflare D1 bootstrap schema. It is idempotent so it can be applied to
-- the existing portfolio database without touching content.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "authVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "showOnHome" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "Project" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "previewToken" TEXT,
  "coverImageId" TEXT,
  "coverPositionX" INTEGER NOT NULL DEFAULT 50,
  "coverPositionY" INTEGER NOT NULL DEFAULT 50,
  "categoryId" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "publishedAt" TEXT,
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "Image" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "projectId" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "largeUrl" TEXT NOT NULL,
  "mediumUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TEXT,
  "createdAt" TEXT NOT NULL,
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "metadata" TEXT,
  "createdAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "SiteSettings" (
  "id" TEXT PRIMARY KEY NOT NULL DEFAULT 'site',
  "photographerName" TEXT NOT NULL DEFAULT 'Tien Tuan Photography',
  "phone" TEXT,
  "zalo" TEXT,
  "email" TEXT,
  "instagram" TEXT,
  "facebook" TEXT,
  "introEnabled" INTEGER NOT NULL DEFAULT 1,
  "introAvatarUrl" TEXT,
  "websiteTitle" TEXT NOT NULL DEFAULT 'Tien Tuan Photography',
  "websiteDescription" TEXT NOT NULL DEFAULT 'Editorial photography for culture, fashion, and people.',
  "updatedAt" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_slug_key" ON "Project"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Project_coverImageId_key" ON "Project"("coverImageId");
CREATE INDEX IF NOT EXISTS "Project_status_sortOrder_idx" ON "Project"("status", "sortOrder");
CREATE INDEX IF NOT EXISTS "Project_categoryId_status_idx" ON "Project"("categoryId", "status");
CREATE INDEX IF NOT EXISTS "Image_projectId_sortOrder_idx" ON "Image"("projectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "Image_deletedAt_idx" ON "Image"("deletedAt");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
