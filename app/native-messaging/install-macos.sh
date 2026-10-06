#!/usr/bin/env bash
# Install Chrome Native Messaging host manifest for com.kairosstudy.daemon (macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC_HOST="$ROOT/app/native-messaging/host.py"
TEMPLATE="$ROOT/app/native-messaging/com.kairosstudy.daemon.json"
# Chrome-launched processes cannot read files in iCloud Drive or other
# TCC-protected folders ("Operation not permitted", found 2026-09-29), so the
# stdlib-only host is copied next to the profile data instead of run in place.
HOST_DIR="$HOME/Library/Application Support/Kairos/native-host"
HOST_PY="$HOST_DIR/host.py"
EXT_ID="${KAIROS_EXTENSION_ID:-jkjkbgcbpakeenemjgkfohbcfbghmall}"
if [[ ! "$EXT_ID" =~ ^[a-z]{32}$ ]]; then
  echo "KAIROS_EXTENSION_ID must be the 32-character ID of the loaded Kairos extension" >&2
  exit 2
fi

mkdir -p "$HOST_DIR"
cp "$SRC_HOST" "$HOST_PY"
chmod 755 "$HOST_PY"

NM_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
mkdir -p "$NM_DIR"
DEST="$NM_DIR/com.kairosstudy.daemon.json"

python3 - "$TEMPLATE" "$DEST" "$HOST_PY" "$EXT_ID" <<'PY'
import json, sys
src, dest, host, ext_id = sys.argv[1:5]
data = json.loads(open(src, encoding="utf-8").read())
data["path"] = host
data["allowed_origins"] = [f"chrome-extension://{ext_id}/"]
with open(dest, "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
    fh.write("\n")
print(dest)
PY

# Chromium / Chrome Canary siblings when present
for alt in \
  "$HOME/Library/Application Support/Chromium/NativeMessagingHosts" \
  "$HOME/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts"
do
  if [[ -d "$(dirname "$alt")" ]]; then
    mkdir -p "$alt"
    cp "$DEST" "$alt/com.kairosstudy.daemon.json"
  fi
done

echo "Installed Native Messaging host com.kairosstudy.daemon → $HOST_PY"
echo "Re-run after changing app/native-messaging/host.py (the installed copy does not follow the repo)."
