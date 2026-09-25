#!/bin/bash
# The static demo on GitHub Pages (https://dpolumienko.github.io/awards-maker/).
#
# Needs a database with the shows to show - the award pages are rendered from
# it at build time, then served as files. Nothing that writes works on Pages:
# sign-in, voting and publishing all need the server.
#
#   DEMO_USER=admin DEMO_PASS=... PRERENDER_ROUTES=/a/some-show,/a/other \
#     MYSQL_HOST=... MYSQL_PORT=... MYSQL_USERNAME=... MYSQL_PASSWORD=... MYSQL_DATABASE=... \
#     scripts/build-demo.sh
# Output: .output/public, ready to be the gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DEMO_USER:?set DEMO_USER}" "${DEMO_PASS:?set DEMO_PASS}"
# `nuxi generate` finishes its work and then does not exit - something the
# prerendered pages open (the database, most likely) keeps it alive. Wait for
# its last line and stop it.
LOG=$(mktemp)
NUXT_APP_BASE_URL=/awards-maker/ NITRO_PRESET=github_pages NUXT_SITE_ENV=staging NUXT_PUBLIC_DEMO=1 \
  NUXT_PUBLIC_SITE_URL=https://dpolumienko.github.io/awards-maker \
  npx nuxi generate > "$LOG" 2>&1 &
GEN=$!
until grep -q 'You can now deploy' "$LOG"; do
  if ! kill -0 "$GEN" 2>/dev/null; then cat "$LOG"; echo 'generate failed' >&2; exit 1; fi
  sleep 3
done
kill "$GEN" 2>/dev/null || true
pkill -P "$GEN" 2>/dev/null || true
grep -E '/a/|Generated' "$LOG" | grep -v _payload || true
rm -f "$LOG"
node scripts/demo-gate.mjs .output/public "$DEMO_USER" "$DEMO_PASS"
