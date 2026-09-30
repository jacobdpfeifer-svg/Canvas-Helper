# Native Messaging host — `com.productname.daemon`

Moves data between the Chrome extension (`app/extension-chrome/`) and the
student's `{user_root}`. It never talks to Canvas.

`host.py` is **standard library only** and runs under the system
`python3` (3.9 on macOS), because that is what Chrome launches. It mirrors
the user-root rule from `app/src-tauri/src/runtime.rs`: `DEV_USER_ROOT`, else
`<app support>/ProductName/<profile>` where the profile comes from
`PRODUCT_USER_ID`, then the app's `current_profile` file, then `dev`.

## Messages

| `type` | Does |
|---|---|
| `canvas_delta` | validates and queues the extension's change slice in `inbox/freshness/deltas/` (0600) for the freshness tick |
| `canvas_signed_out` | queues a signed-out status |
| `get_dashboard` | returns `inbox/freshness/dashboard.json` |
| `get_assignment_context` | skip cost + recent announcements/changes for one assignment |
| `queue_calendar_suggestion` | appends to `inbox/calendar-suggestions.jsonl` (the app's Calendar tab, where the student approves it) |
| `ping` | records beta funnel markers (timestamps and counts only) |
| `canvas_focus`, `canvas_visible` | legacy sensor rows in `sensors/chrome.jsonl` |

Tests: `tests/core/test_native_messaging_host.py` (runs the host with
`/usr/bin/python3 -S -I`).

## Install (macOS)

```bash
bash app/native-messaging/install-macos.sh
```

The installer copies `host.py` to
`~/Library/Application Support/ProductName/native-host/` and points the
Chrome, Chromium, and Canary manifests at the copy. Chrome-launched
processes cannot read files in iCloud Drive ("Operation not permitted"), so
the host is never run from the checkout. Re-run the installer after editing
`host.py`. Set `PRODUCTNAME_EXTENSION_ID` only for a differently keyed build.

## Files

| Path | Role |
|------|------|
| `host.py` | stdio NM host (length-prefixed JSON) |
| `com.productname.daemon.json` | manifest template (`path` + `allowed_origins` filled by the installer) |
| `install-macos.sh` | copies the host and writes the manifests |
