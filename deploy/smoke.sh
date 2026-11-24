#!/usr/bin/env bash
# The post-deploy smoke test: the product's whole life, against the real site, in under a minute.
#
#   smoke.sh https://howler.example.com
#
# It creates a howler, looks at it, opens it, tries to open it again, and checks the doors that must stay shut. Then it
# makes a second howler EXPIRE (by moving its expiry into the past in the database, the only way to not wait 7 days),
# checks that the site says so, runs the purge and checks that the message is gone from the database.
#
# The last part needs to run commands on the server. It does that through SMOKE_REMOTE_SHELL, a command that reads a shell
# script from its standard input and runs it where the app lives, for example:
#   SMOKE_REMOTE_SHELL="ssh -i key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes deploy@host bash -s"
# Without it the expiry part is skipped (and said so). SMOKE_APP_DIR is where docker-compose.prod.yml is (default /opt/howler).
#
# Every howler it makes is an ordinary one (it costs a voice, about 1.5 US cents): the retention job removes it later.
# SMOKE_CURL_OPTS adds options to every curl (a local test against a self-signed certificate uses -k) and SMOKE_LOCAL=1
# skips the checks that only make sense on the public site (the http redirect on port 80 and the link-preview URL).
# Exit code 0 when everything passed, 1 otherwise.
set -uo pipefail

# the options are meant to be split into words (SMOKE_CURL_OPTS="-k --max-time 5")
# shellcheck disable=SC2086
curl() { command curl ${SMOKE_CURL_OPTS:-} "$@"; }

BASE="${1:?usage: smoke.sh https://host}"
BASE="${BASE%/}"
APP_DIR="${SMOKE_APP_DIR:-/opt/howler}"
API="${BASE}/api/howlers"
pass=0
fail=0

check() { # name, actual, expected
  if [ "$2" = "$3" ]; then echo "  ok    $1"; pass=$((pass + 1)); else echo "  FAIL  $1 (expected '$3', got '$2')"; fail=$((fail + 1)); fi
}
contains() { # name, text, needle
  if printf '%s' "$2" | grep -q -- "$3"; then echo "  ok    $1"; pass=$((pass + 1)); else echo "  FAIL  $1 (missing '$3')"; fail=$((fail + 1)); fi
}
absent() { # name, text, needle
  if printf '%s' "$2" | grep -q -- "$3"; then echo "  FAIL  $1 (found '$3')"; fail=$((fail + 1)); else echo "  ok    $1"; pass=$((pass + 1)); fi
}
code() { curl -s -o /dev/null -m 30 -w '%{http_code}' "$@"; }
field() { # json, name -> the first string value of that field
  printf '%s' "$1" | sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p"
}

echo "== 1. the site, over https"
check "/up answers" "$(code "${BASE}/up")" "200"
headers="$(curl -sS -D - -o /tmp/smoke-index.html -m 30 "${BASE}/")"
check "the page is served (a valid certificate: curl is not told to ignore it)" "$(grep -c '<div id="app">' /tmp/smoke-index.html)" "1"
check "HSTS header" "$(printf '%s' "$headers" | grep -ci '^strict-transport-security')" "1"
check "Content-Security-Policy header" "$(printf '%s' "$headers" | grep -ci '^content-security-policy')" "1"
check "X-Content-Type-Options header" "$(printf '%s' "$headers" | grep -ci '^x-content-type-options: nosniff')" "1"
check "the page is never cached" "$(printf '%s' "$headers" | grep -ci '^cache-control: no-cache')" "1"
if [ -z "${SMOKE_LOCAL:-}" ]; then
  check "http redirects to https" "$(code "http://${BASE#https://}/")" "308"
fi
check "robots.txt allows indexing" "$(curl -s -m 30 "${BASE}/robots.txt" | grep -c '^Allow: /')" "1"
if [ -z "${SMOKE_LOCAL:-}" ]; then
  contains "the link preview points at this site" "$(cat /tmp/smoke-index.html)" "og:image\" content=\"${BASE}/og.png"
fi

echo "== 2. a howler's whole life"
created="$(curl -s -m 90 -X POST "$API" -H 'Content-Type: application/json' -d '{"message":"SMOKE TEST. PLEASE IGNORE.","recipient_name":"Smoke"}' -w '|%{http_code}')"
check "create answers 201" "${created##*|}" "201"
token="$(field "$created" token)"
check "the token has 22 characters" "${#token}" "22"
contains "create says whether the voice was made" "$created" '"voice":'
state="$(curl -s -m 30 "${API}/${token}")"
check "the state is sealed, with the name" "$state" '{"status":"sealed","recipient_name":"Smoke"}'
absent "the state never reveals the message" "$state" "SMOKE"
opened="$(curl -s -m 60 -X POST "${API}/${token}/open" -w '|%{http_code}')"
check "the first open answers 200" "${opened##*|}" "200"
contains "and carries the message" "$opened" '"message":"SMOKE TEST. PLEASE IGNORE."'
# Laravel writes the slash of the mime type escaped (audio\/wav), so the pattern accepts both spellings.
if printf '%s' "$created" | grep -q '"voice":true'; then
  contains "and the voice, because it was made" "$opened" '"audio":{"mime":"audio.\{1,2\}wav"'
fi
again="$(curl -s -m 30 -X POST "${API}/${token}/open" -w '|%{http_code}')"
check "the second open answers 410" "${again##*|}" "410"
absent "and does not leak the message" "$again" "SMOKE"
check "the state is now burned" "$(curl -s -m 30 "${API}/${token}")" '{"status":"burned","recipient_name":null}'

echo "== 3. the doors that must stay shut"
check "an unknown link is 404" "$(code "${API}/not-a-token-0000000000000000000000000000000000")" "404"
check "opening with a GET is refused (a link preview cannot burn it)" "$(code "${API}/${token}/open")" "405"
check "an empty message is refused" "$(code -X POST "$API" -H 'Content-Type: application/json' -d '{"message":""}')" "422"
check "a message over 140 characters is refused" "$(code -X POST "$API" -H 'Content-Type: application/json' -d "{\"message\":\"$(head -c 141 /dev/zero | tr '\0' a)\"}")" "422"
check "a request body over 8 KB is refused at the edge" "$(head -c 20000 /dev/zero | tr '\0' a | code -X POST "$API" -H 'Content-Type: application/json' --data-binary @-)" "413"

echo "== 4. expiry, and the purge"
if [ -z "${SMOKE_REMOTE_SHELL:-}" ]; then
  echo "  skipped: no SMOKE_REMOTE_SHELL, so nothing can be run on the server"
else
  remote() { printf '%s\n' "cd ${APP_DIR} && $1" | ${SMOKE_REMOTE_SHELL}; }
  dc() { echo "TAG=\$(cat .current_tag) docker compose -f docker-compose.prod.yml $1"; }
  sql() { remote "$(dc "exec -T db psql -q -U howler -d howler -tA -c \"$1\"")" | tr -d '[:space:]'; }

  created2="$(curl -s -m 90 -X POST "$API" -H 'Content-Type: application/json' -d '{"message":"SMOKE EXPIRY. PLEASE IGNORE."}')"
  token2="$(field "$created2" token)"
  hash2="$(printf '%s' "$token2" | sha256sum | cut -d' ' -f1)"
  check "a second howler is sealed" "$(curl -s -m 30 "${API}/${token2}")" '{"status":"sealed","recipient_name":null}'
  check "its expiry is moved into the past (one row changed)" "$(sql "update howlers set expires_at = now() - interval '1 minute' where token_hash = '${hash2}' returning 1")" "1"
  check "the site now says it expired" "$(curl -s -m 30 "${API}/${token2}")" '{"status":"expired","recipient_name":null}'
  gone="$(curl -s -m 30 -X POST "${API}/${token2}/open" -w '|%{http_code}')"
  check "opening it answers 410" "${gone##*|}" "410"
  contains "and says it expired" "$gone" '"status":"expired"'
  absent "without the message" "$gone" "SMOKE"
  purged="$(remote "$(dc "exec -T app php artisan howlers:purge")" 2>&1)"
  contains "the purge runs and marks it expired" "$purged" "expired"
  check "afterwards the database holds the status and no message" "$(sql "select status || ':' || (message is null)::text from howlers where token_hash = '${hash2}'")" "expired:true"
fi

echo
echo "smoke test: ${pass} passed, ${fail} failed"
[ "${fail}" -eq 0 ]
