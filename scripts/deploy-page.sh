#!/usr/bin/env bash
# Deploy the game to pages.jkaindl.de.
#
# Deploys ONLY the shipped artifact — index.html (redirect shim),
# synthwave_surfer.html (the whole app, inline) and assets/ — from committed
# HEAD to the pages server (/srv/pages/synthwave-surfer/, served at
# https://pages.jkaindl.de/synthwave-surfer/).
#
# This intentionally replaces the old Codeberg Pages flow, which served the
# ENTIRE source tree from the pages branch (including .claude/ and claude/
# internals — a privacy leak). Deploys main directly; the pages branch is
# obsolete.
#
# Auth is via the dedicated deploy key behind the `pages-deploy` SSH host alias
# (~/.ssh/config) — restricted server-side to rsync into /srv/pages only.
#
# Requires real rsync 3.x — macOS ships openrsync, which is incompatible with
# the server-side rrsync wrapper: brew install rsync
#
# Usage: bash scripts/deploy-page.sh

set -euo pipefail

RSYNC="${RSYNC:-/opt/homebrew/bin/rsync}"
# No pipe here: grep -q + pipefail would turn rsync's SIGPIPE into a failure.
case "$("$RSYNC" --version 2>/dev/null || true)" in
  *"version 3."*) ;;
  *)
    echo "ERROR: $RSYNC is not rsync 3.x (macOS openrsync won't work): brew install rsync" >&2
    exit 1
    ;;
esac

DEST="pages-deploy:synthwave-surfer/"

cd "$(git rev-parse --show-toplevel)"

echo "=== Gate ==="
node scripts/check-syntax.mjs

if [[ -n "$(git status --porcelain -- index.html synthwave_surfer.html assets/)" ]]; then
  echo "NOTE: artifact files have uncommitted changes — deploying committed HEAD." >&2
fi

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "=== Snapshot artifact from HEAD ==="
git archive HEAD index.html synthwave_surfer.html assets | tar -x -C "$STAGE"

echo "=== Publishing via rsync ==="
"$RSYNC" -az --delete --chmod=D755,F644 "$STAGE"/ "$DEST"

echo "✓ Deployed. Live: https://pages.jkaindl.de/synthwave-surfer/"
