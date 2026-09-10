#!/bin/bash
# Append one local evaluation snapshot. Does not compare, and does not
# register a scheduler. Honors DEV_USER_ROOT when set.
#
# To run this weekly, add it yourself, for example:
#   crontab -e
#   15 8 * * 1 /absolute/path/to/scripts/eval-snapshot-weekly.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
exec uv run python -m canvas_mcp.core.learn_loop evaluate --record
