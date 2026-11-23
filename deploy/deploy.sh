#!/usr/bin/env bash
# Deploys one image tag to this server and rolls back by itself if the new version does not come up healthy.
#
#   ./deploy.sh <tag>          pull the images for <tag>, migrate, start, check
#   SKIP_PULL=1 ./deploy.sh <tag>   use the images already on this machine (tests and manual rollbacks)
#
# It runs on the server, in the folder that holds docker-compose.prod.yml and .env (the deploy workflow copies this
# file there). The tag of the running version is kept in .current_tag and the one before it in .previous_tag, so a
# rollback is "deploy the previous tag" (rollback.sh).
#
# Migrations are NOT undone by a rollback. Write them so the previous version still works on the new schema: add a
# column or table first, stop using the old one in a later release, drop it in a later one again (see docs/DEPLOYMENT.md).
set -euo pipefail
cd "$(dirname "$0")"

TAG="${1:?usage: deploy.sh <image tag>}"
COMPOSE=(docker compose -f docker-compose.prod.yml)
export TAG

[ -f .env ] || { echo "missing .env next to this script (see deploy/env.production.example)" >&2; exit 1; }
PREVIOUS=""
[ -f .current_tag ] && PREVIOUS="$(cat .current_tag)"

# the host Caddy answers for, taken from SITE_ADDRESS (no scheme, no port)
site_host() {
  local a
  a="$(grep -E '^SITE_ADDRESS=' .env | tail -n1 | cut -d= -f2- | tr -d '"' || true)"
  a="${a:-localhost}"; a="${a#http://}"; a="${a#https://}"; echo "${a%%:*}"
}

healthy() {
  local host; host="$(site_host)"
  for _ in $(seq 1 "${HEALTH_TRIES:-30}"); do
    # ask the local Caddy as if we were the site: -k because the certificate may still be arriving
    if curl -fsS -k -m 5 --resolve "${host}:${HTTPS_PORT:-443}:127.0.0.1" "https://${host}:${HTTPS_PORT:-443}/up" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

echo "==> deploying ${TAG} (running now: ${PREVIOUS:-nothing})"
if [ "${SKIP_PULL:-0}" != "1" ]; then
  "${COMPOSE[@]}" pull web app scheduler
fi

"${COMPOSE[@]}" up -d db
"${COMPOSE[@]}" run --rm app php artisan migrate --force
"${COMPOSE[@]}" up -d --remove-orphans

if healthy; then
  echo "${TAG}" > .current_tag
  if [ -n "${PREVIOUS}" ] && [ "${PREVIOUS}" != "${TAG}" ]; then echo "${PREVIOUS}" > .previous_tag; fi
  echo "==> ${TAG} is up and healthy"
  exit 0
fi

echo "==> ${TAG} did not become healthy" >&2
"${COMPOSE[@]}" logs --tail 30 app web >&2 || true
if [ -n "${PREVIOUS}" ] && [ "${PREVIOUS}" != "${TAG}" ]; then
  echo "==> rolling back to ${PREVIOUS}" >&2
  export TAG="${PREVIOUS}"
  "${COMPOSE[@]}" up -d --remove-orphans
  if healthy; then echo "==> rolled back to ${PREVIOUS}" >&2; else echo "==> the rollback is not healthy either: look at the logs" >&2; fi
else
  echo "==> nothing to roll back to (first deploy)" >&2
fi
exit 1
