#!/usr/bin/env bash
# A daily dump of the database, kept for 7 days. Put it in cron on the server, for example:
#   17 3 * * *  /opt/howler/backup.sh >> /opt/howler/backups/backup.log 2>&1
#
# The data is short-lived by design (a howler lives 7 days and is deleted once opened), so the worst a lost database
# costs is a few unopened howlers. The dump is there for a bad migration or a mistake, not for archival.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DB_USER="$(grep -E '^DB_USERNAME=' .env | cut -d= -f2- | tr -d '"' || true)"; DB_USER="${DB_USER:-howler}"
DB_NAME="$(grep -E '^DB_DATABASE=' .env | cut -d= -f2- | tr -d '"' || true)"; DB_NAME="${DB_NAME:-howler}"

TAG="$(cat .current_tag 2>/dev/null || echo none)" docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "backups/howler-${STAMP}.sql.gz"
find backups -name 'howler-*.sql.gz' -mtime +7 -delete
echo "backup written: backups/howler-${STAMP}.sql.gz"
