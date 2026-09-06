#!/usr/bin/env bash
# Install Chrome Native Messaging host manifest for com.productname.daemon (macOS).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST_PY="$ROOT/app/native-messaging/host.py"
TEMPLATE="$ROOT/app/native-messaging/com.productname.daemon.json"
EXT_ID="${PRODUCTNAME_EXTENSION_ID:-PRODUCTNAME_EXTENSION_ID}"

chmod +x "$HOST_PY"

NM_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
mkdir -p "$NM_DIR"
DEST="$NM_DIR/com.productname.daemon.json"

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
    cp "$DEST" "$alt/com.productname.daemon.json"
  fi
done

echo "Installed Native Messaging host com.productname.daemon"
echo "Set PRODUCTNAME_EXTENSION_ID to your unpacked extension ID and re-run if needed."
