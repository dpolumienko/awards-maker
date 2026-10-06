#!/bin/bash
# The static demo on GitHub Pages (https://dpolumienko.github.io/awards-maker/).
#
# No database: every page renders in the browser (nuxt.config.ts turns ssr off
# for the demo) and /api/* is answered from localStorage by app/demo/api.ts, so
# sign-in, building, voting and the ceremony all work on Pages.
#
#   DEMO_USER=admin DEMO_PASS=... scripts/build-demo.sh
#   DEMO_DIGEST=<sha256 of user:pass> scripts/build-demo.sh   (the live demo's sign-in)
# Output: .output/public, ready to be the gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -z "${DEMO_DIGEST:-}" ]; then : "${DEMO_USER:?set DEMO_USER or DEMO_DIGEST}" "${DEMO_PASS:?set DEMO_PASS}"; fi
# `nuxi generate` finishes its work and then does not exit - something the
# prerendered pages open (the database, most likely) keeps it alive. Wait for
# its last line and stop it.
LOG=$(mktemp)
NUXT_APP_BASE_URL=/awards-maker/ NITRO_PRESET=github_pages NUXT_SITE_ENV=staging NUXT_PUBLIC_DEMO=1 \
  NUXT_PUBLIC_SITE_URL=https://dpolumienko.github.io/awards-maker NUXT_PUBLIC_SITE_HOST=dpolumienko.github.io \
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
node scripts/demo-gate.mjs .output/public "${DEMO_USER:-}" "${DEMO_PASS:-}"
