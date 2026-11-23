#!/usr/bin/env bash
# Starts the API for the end-to-end tests (voice off, high rate limits, the howler_test database) and waits for it.
# Run it where Docker runs (inside WSL on Windows). Afterwards, from e2e/: npm test.
# To go back to the normal development API: docker compose up -d --force-recreate backend
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up -d db
for _ in $(seq 1 40); do
  [ "$(docker compose ps db --format '{{.Health}}')" = "healthy" ] && break
  sleep 2
done

compose="docker compose -f docker-compose.yml -f docker-compose.e2e.yml"
$compose run --rm backend php artisan migrate --force
$compose up -d --force-recreate backend

for _ in $(seq 1 40); do
  if curl -fsS -m 30 http://localhost:8000/up >/dev/null 2>&1; then
    echo "e2e API ready at http://localhost:8000"
    exit 0
  fi
  sleep 2
done
echo "the API did not start in time" >&2
$compose logs --tail 20 backend >&2
exit 1
