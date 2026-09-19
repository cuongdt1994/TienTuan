# Tien Tuan Photography Portfolio

A self-hosted photography portfolio and lightweight CMS built with Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL, Prisma, MinIO, Sharp, Zod, and dnd-kit.

The public experience is image-led: large editorial project covers, preserved aspect ratios, a responsive masonry gallery, a keyboard-friendly lightbox, lightweight motion, and project-level SEO. The admin workflow keeps image management out of the codebase: sign in, create a project, drag in a batch of images, reorder them, choose a cover, and publish.

## Requirements

- Node.js 22+
- npm 10+
- PostgreSQL 16+
- MinIO (or another S3-compatible object store)
- Docker and Docker Compose for the containerized setup

## Installation

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`. The admin lives at `http://localhost:3000/admin/login`.

## Environment variables

See `.env.example`. The important values are:

- `DATABASE_URL` — PostgreSQL connection string.
- `AUTH_SECRET` — at least 16 random characters; use a long random value in production.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — used by the seed command to create/update the admin user.
- `MINIO_*` — S3-compatible storage connection details.
- `PUBLIC_IMAGE_BASE_URL` — public bucket base URL, for example `https://cdn.example.com/photography`.

Never commit `.env` or real credentials.

## Prisma migration and admin

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

The seed creates the admin account, three categories, demo projects, and site settings. Change `ADMIN_PASSWORD` before using the app outside local development.

## MinIO setup

The Docker Compose file starts MinIO on port `9000` and its console on `9001`. Create a bucket named `photography` and configure a read-only public policy for the image path, or put a CDN/reverse proxy in front of it and set `PUBLIC_IMAGE_BASE_URL` accordingly.

After MinIO is available, the bucket can be bootstrapped with `npm run minio:setup`. The command is safe to run repeatedly.

The browser uploads originals with a presigned URL. The server then reads the object, applies EXIF orientation with Sharp, and writes WebP variants at approximately 2560px, 1400px, and 720px widths. PostgreSQL only stores image metadata and URLs, never binary image data.

## Docker setup

```bash
cp .env.example .env
docker compose up --build
```

The web container runs `prisma migrate deploy` on startup. Run the seed once after the services are healthy:

```bash
docker compose exec web npx prisma db seed
```

## Production deployment

1. Generate a unique `AUTH_SECRET`.
2. Use managed PostgreSQL or a persistent PostgreSQL volume.
3. Use a persistent MinIO volume or managed S3-compatible storage.
4. Set a real `NEXT_PUBLIC_SITE_URL` and `PUBLIC_IMAGE_BASE_URL`.
5. Put TLS and an image cache/CDN in front of the app and object store.
6. Run `docker compose up -d --build`.

## Backups

Back up PostgreSQL with `pg_dump` or your provider's point-in-time backups. Back up MinIO using `mc mirror` or a provider replication policy; the original objects and processed WebP variants are both needed for a full restore.

## Routes

Public: `/`, `/work`, `/commercial`, `/beauty`, `/portrait`, `/project/[slug]`, `/contact`.

Admin: `/admin/login`, `/admin`, `/admin/projects`, `/admin/projects/new`, `/admin/categories`, `/admin/media`, `/admin/settings`.

## Notes

The demo content uses Unsplash URLs so a fresh install has a meaningful fallback before a MinIO bucket is configured. Once the database is seeded and projects are uploaded, database content takes over automatically. The reference site informed the restraint, typography, and image-first rhythm only; this is a separate implementation and layout.
