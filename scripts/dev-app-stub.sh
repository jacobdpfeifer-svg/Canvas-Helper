#!/usr/bin/env bash
# Run the desktop app end-to-end with NO Canvas: stubbed SSO + a synthetic
# 4-course sync (see scripts/stub-core.sh). Fresh profile every run unless
# DEV_USER_ROOT is set. Never touches your real profile or Canvas.
#
#   scripts/dev-app-stub.sh                       # port 1420
#   PN_DEV_PORT=1430 scripts/dev-app-stub.sh      # when 1420 is busy
#   STUB_SSO_FAIL=1 scripts/dev-app-stub.sh       # sign-in failure path
#   STUB_FAIL_COURSE=3103 scripts/dev-app-stub.sh # partial sync path
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
STUB="$("$REPO/scripts/stub-core.sh")"
export PRODUCTNAME_CORE_DIR="$STUB"
export PRODUCTNAME_PYTHON="${PRODUCTNAME_PYTHON:-$REPO/.venv/bin/python}"
export PRODUCTNAME_NODE="$(command -v node)"
export DEV_USER_ROOT="${DEV_USER_ROOT:-$(mktemp -d /tmp/pn-stub-profile.XXXX)}"
PORT="${PN_DEV_PORT:-1420}"
[ -x "$PRODUCTNAME_PYTHON" ] || { echo "missing $PRODUCTNAME_PYTHON (run: uv venv .venv && uv pip install -e .)"; exit 1; }
echo "[dev-app-stub] core=$STUB profile=$DEV_USER_ROOT port=$PORT" >&2
cd "$REPO/app"
exec npm run tauri -- dev --config "{\"build\":{\"devUrl\":\"http://localhost:$PORT\",\"beforeDevCommand\":\"npm run dev -- --port $PORT\"}}" "$@"
