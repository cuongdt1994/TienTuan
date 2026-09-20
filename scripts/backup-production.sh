#!/bin/sh
set -eu

APP_ROOT="${APP_ROOT:-/opt/portfolio}"
BACKUP_ROOT="${BACKUP_ROOT:-/opt/portfolio-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_DIR="$BACKUP_ROOT/postgres"
MINIO_DIR="$BACKUP_ROOT/minio/$STAMP"

set -a
. "$APP_ROOT/.env"
set +a

mkdir -p "$DB_DIR" "$MINIO_DIR"

docker exec portfolio-postgres-1 pg_dump -U "${POSTGRES_USER:-portfolio}" -d "${POSTGRES_DB:-portfolio}" -Fc > "$DB_DIR/portfolio-$STAMP.dump"

MINIO_SCHEME="http"
if [ "${MINIO_USE_SSL:-false}" = "true" ]; then MINIO_SCHEME="https"; fi
MINIO_URL="$MINIO_SCHEME://${MINIO_ENDPOINT}:${MINIO_PORT}"

docker run --rm --network host \
  -e MINIO_URL="$MINIO_URL" \
  -e MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY}" \
  -e MINIO_SECRET_KEY="${MINIO_SECRET_KEY}" \
  -e MINIO_BUCKET="${MINIO_BUCKET}" \
  -v "$MINIO_DIR:/backup" \
  minio/mc:latest sh -c 'mc alias set portfolio "$MINIO_URL" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" >/dev/null && mc mirror --overwrite "portfolio/$MINIO_BUCKET" /backup >/dev/null'

sha256sum "$DB_DIR/portfolio-$STAMP.dump" > "$DB_DIR/portfolio-$STAMP.dump.sha256"

find "$DB_DIR" -type f -mtime +14 -delete
find "$BACKUP_ROOT/minio" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +

echo "Backup completed: $STAMP"
