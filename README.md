# Tien Tuan Photography — Cloudflare portfolio

Next.js App Router + OpenNext deployed to a Cloudflare Worker, with D1 for metadata and a private R2 bucket for originals and prepared public variants.

## Image architecture

- The browser uploads originals directly to R2 with a short-lived presigned PUT URL. The Worker never proxies the file upload.
- Originals live under `originals/` and are private. Public pages only request `/img/{imageId}?w=...`.
- After Admin upload, the Worker starts Cloudflare remote-image transformations in the background. The private source is exposed only to that internal subrequest with a short-lived HMAC token; Cloudflare performs decode/resize/encode and the Worker streams the result into `variants/{imageId}/{width}.{format}`.
- The same automatic path supports originals around 22MB. A laptop does not need to stay on and `npm run variants` is not required for new uploads. If a background job is interrupted, the first public request recreates the missing variant and caches it.
- `app/img/[id]/route.ts` checks the edge Cache API first, then streams `R2Object.body` directly. It never calls `arrayBuffer()`, `blob()`, Sharp, WASM or a canvas.
- The local `sharp` dependency is used only by `scripts/make-variants.ts`; it is a dev dependency and is not imported by application/Worker code.
- Public D1 reads are cached for five minutes and admin mutations purge the `site-content` tag.

## Cloudflare resources

`wrangler.jsonc` defines:

- Worker: `atelier-portfolio`
- R2: `PHOTOGRAPHY_R2` → `photography`
- D1: `ATELIER_PORTFOLIO_DB` → `atelier-portfolio-db`
- Images binding: retained for compatibility with the older local migration path; new uploads use remote transformations so they are not limited by the 20MB Images binding input limit
- OpenNext incremental cache: `NEXT_INC_CACHE_R2_BUCKET`

Create the resources if starting from a new account:

```bash
npx wrangler r2 bucket create photography
npx wrangler r2 bucket create atelier-portfolio-opennext-cache
npx wrangler d1 create atelier-portfolio-db
npx wrangler d1 migrations apply atelier-portfolio-db --remote
```

Apply browser-upload CORS after checking the allowed production origins:

```bash
npx wrangler r2 bucket cors set photography --file config/r2-cors.json
```

## Secrets required for admin uploads

Create an R2 API token scoped to the `photography` bucket with object read/write permission. Store its S3 credentials as Worker secrets; never commit them:

```bash
npx wrangler secret put R2_S3_ACCESS_KEY_ID --name atelier-portfolio
npx wrangler secret put R2_S3_SECRET_ACCESS_KEY --name atelier-portfolio
```

`AUTH_SECRET` is also required. The presign endpoint returns `503` rather than falling back to a Worker upload when the R2 S3 secrets are absent.

## Migrate existing originals and create variants

The script downloads one original at a time on the local machine, converts to sRGB, applies EXIF orientation, strips metadata through the output pipeline, creates the five widths and three formats, uploads them to R2, then rewrites D1 URLs to `/img/{id}?w=...`:

```bash
npm install
npm run typecheck
npm run variants
```

For a safe smoke test:

```powershell
$env:VARIANT_LIMIT = "1"
npm run variants
```

Do not run this conversion in the Worker. The local process may buffer a source image; the Worker never does.

## Build and deploy

```bash
npm run typecheck
npm run build
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy
```

After verifying `/img/{id}?w=640` through the Worker for every migrated image, remove the old public R2 custom domain so `originals/` cannot be fetched publicly:

```bash
npx wrangler r2 bucket domain list photography
npx wrangler r2 bucket domain remove photography --domain media.tientuanphoto.com
```

Keep the main site route on `tientuanphoto.com/*`; only the Worker exposes public image variants.

## Local development

```bash
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Cloudflare production data is accessed through the D1 binding. Local PostgreSQL/MinIO settings remain available for development compatibility, but production image paths use R2 and the `/img` route.

## Important files

- `app/img/[id]/route.ts` — cached, stream-only public image route
- `app/api/admin/upload/presign/route.ts` — short-lived direct-to-R2 upload URL
- `app/api/admin/projects/[id]/images/process/route.ts` — metadata registration and variant scheduling
- `scripts/make-variants.ts` — local-only Sharp conversion/upload script
- `lib/content.ts` — cached D1-backed public content reads
- `lib/db.ts` — prepared D1 statements with explicit column lists
- `migrations/0001_portfolio.sql` — idempotent D1 bootstrap schema
