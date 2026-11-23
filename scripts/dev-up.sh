#!/usr/bin/env bash
# Starts the local database (Docker) and waits until it accepts connections.
# Run it where Docker runs: inside WSL on Windows (see backend/README.md), or on any Linux or macOS with Docker.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up -d db

for _ in $(seq 1 40); do
  if [ "$(docker compose ps db --format '{{.Health}}')" = "healthy" ]; then
    echo "database ready"
    exit 0
  fi
  sleep 2
done

echo "the database did not become healthy in time" >&2
docker compose logs --tail 20 db >&2
exit 1
