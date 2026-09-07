# Native Messaging host — `com.productname.daemon`

Chrome extension sensors (`app/extension-chrome/`) send Canvas focus/URL events
to this host via Native Messaging. The host appends JSONL under
`{user_root}/sensors/chrome.jsonl` for the Tauri daemon.

## Install (macOS)

1. Load the unpacked extension and copy its ID from `chrome://extensions`.
2. Run:

```bash
PRODUCTNAME_EXTENSION_ID=<your-extension-id> \
  bash app/native-messaging/install-macos.sh
```

3. Restart Chrome. Focus a Canvas tab — you should see rows in
   `~/Library/Application Support/ProductName/<user>/sensors/chrome.jsonl`
   (or under `DEV_USER_ROOT` when set).

## Files

| Path | Role |
|------|------|
| `host.py` | stdio NM host (length-prefixed JSON) |
| `com.productname.daemon.json` | Manifest template (`path` + `allowed_origins` filled by install) |
| `install-macos.sh` | Copies manifest into Chrome/Chromium NM dirs |

## Stable extension ID

The unpacked extension ships with a fixed `key` in `manifest.json` so the ID is always `jkjkbgcbpakeenemjgkfohbcfbghmall`. Override with `PRODUCTNAME_EXTENSION_ID` only if you load a differently keyed build.
