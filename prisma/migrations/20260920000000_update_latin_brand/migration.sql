UPDATE "SiteSettings"
SET
  "photographerName" = 'Tien Tuan Photography',
  "websiteTitle" = 'Tien Tuan Photography — Editorial Image Maker'
WHERE "photographerName" = 'Tiến Tuấn Photography'
   OR "websiteTitle" LIKE 'Tiến Tuấn Photography%';
