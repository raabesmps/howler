#!/usr/bin/env bash
# Goes back to the version that ran before the current one. Run it on the server, next to deploy.sh.
set -euo pipefail
cd "$(dirname "$0")"

[ -f .previous_tag ] || { echo "no previous version is recorded: nothing to roll back to" >&2; exit 1; }
PREVIOUS="$(cat .previous_tag)"
echo "rolling back to ${PREVIOUS}"
# the previous version is still on this machine, so no registry login is needed
SKIP_PULL="${SKIP_PULL:-1}" exec ./deploy.sh "${PREVIOUS}"
