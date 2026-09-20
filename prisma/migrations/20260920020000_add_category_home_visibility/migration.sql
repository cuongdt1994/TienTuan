ALTER TABLE "Category"
ADD COLUMN "showOnHome" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Category"
SET "showOnHome" = false
WHERE "slug" = 'portrait';
