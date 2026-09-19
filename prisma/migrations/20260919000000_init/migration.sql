CREATE TYPE "Role" AS ENUM ('ADMIN');
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "coverImageId" TEXT,
  "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Image" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "originalUrl" TEXT NOT NULL,
  "largeUrl" TEXT NOT NULL,
  "mediumUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "alt" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteSettings" (
  "id" TEXT NOT NULL DEFAULT 'site',
  "photographerName" TEXT NOT NULL DEFAULT 'Tiến Tuấn Photography',
  "phone" TEXT,
  "zalo" TEXT,
  "email" TEXT,
  "instagram" TEXT,
  "facebook" TEXT,
  "websiteTitle" TEXT NOT NULL DEFAULT 'Tiến Tuấn Photography',
  "websiteDescription" TEXT NOT NULL DEFAULT 'Editorial photography for culture, fashion, and people.',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE UNIQUE INDEX "Project_coverImageId_key" ON "Project"("coverImageId");
CREATE INDEX "Project_status_sortOrder_idx" ON "Project"("status", "sortOrder");
CREATE INDEX "Project_categoryId_status_idx" ON "Project"("categoryId", "status");
CREATE INDEX "Image_projectId_sortOrder_idx" ON "Image"("projectId", "sortOrder");

ALTER TABLE "Project" ADD CONSTRAINT "Project_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_coverImageId_fkey" FOREIGN KEY ("coverImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
