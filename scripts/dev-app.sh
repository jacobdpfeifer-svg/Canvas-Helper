#!/usr/bin/env bash
# Run the desktop app in development against a real profile.
#
# Builds from the non-iCloud mirror (see native-mirror.sh) but points the core
# at THIS checkout so browser/node_modules, templates and the repo venv are the
# ones you edit. Profile: PRODUCT_USER_ID (default "dev" — your existing
# ~/Library/Application Support/ProductName/dev). Canvas sign-in happens from
# the app's Settings/First-run buttons (Playwright window), never from here.
#
#   scripts/dev-app.sh                # profile "dev"
#   PRODUCT_USER_ID=tester1 scripts/dev-app.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
export PRODUCTNAME_CORE_DIR="$REPO"
export PRODUCTNAME_PYTHON="$REPO/.venv/bin/python"
export PRODUCTNAME_NODE="$(command -v node)"
export PRODUCT_USER_ID="${PRODUCT_USER_ID:-dev}"
export PLAYWRIGHT_CHANNEL="${PLAYWRIGHT_CHANNEL:-}"
unset DEV_USER_ROOT
[ -x "$PRODUCTNAME_PYTHON" ] || { echo "missing $PRODUCTNAME_PYTHON (run: uv sync)"; exit 1; }

# Tauri dev needs Vite on 1420 (strictPort). A stale Vite/study-bridge from an
# earlier run (ours) is stopped; anything else on the port is reported instead.
for port in 1420 1421; do
  for pid in $(lsof -nP -iTCP:$port -sTCP:LISTEN -t 2>/dev/null); do
    cmd="$(ps -o command= -p "$pid" 2>/dev/null || true)"
    case "$cmd" in
      *vite/bin/vite.js*|*canvas_mcp.core.study*serve*)
        echo "[dev-app] stopping stale process on :$port (pid $pid)"; kill "$pid" 2>/dev/null || true ;;
      *)
        echo "[dev-app] port $port is held by another program (pid $pid): $cmd"; echo "[dev-app] stop it, then rerun."; exit 1 ;;
    esac
  done
done
# Exact process name only: a -f pattern would match unrelated shells whose
# command line merely mentions the binary.
pkill -x productname 2>/dev/null || true
sleep 1
[ -d "$REPO/browser/node_modules/playwright" ] || { echo "missing browser deps (run: cd browser && npm ci)"; exit 1; }
exec "$REPO/scripts/native-mirror.sh" npm run tauri -- dev "$@"
