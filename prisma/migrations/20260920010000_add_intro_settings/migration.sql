ALTER TABLE "SiteSettings"
ADD COLUMN "introEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "introAvatarUrl" TEXT;
