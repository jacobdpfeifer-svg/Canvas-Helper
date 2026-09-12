# Packaging notes

Notarized `.dmg` / distribution signing is **deferred**: packaging trigger signed **not yet** on 2026-09-12 ([`pre-ship-decisions.md`](./pre-ship-decisions.md) row 4). Do not notarize. Do not claim the app is “worth installing” for public testers yet.

Local unsigned builds for **dev** are fine.

## Build locally (dev only)

Repo path contains `:` which breaks the default DYLD library path on macOS. Workaround:

```bash
source "$HOME/.cargo/env"
cd app/src-tauri && CARGO_TARGET_DIR=/tmp/productname-tauri-target cargo check
```

See also [`architect-brief.md`](./architect-brief.md) W4 gate.

## Later (only after decision 4 flips to “worth installing”)

- Expand `tauri.conf.json` `bundle.macOS` (targets, minimum system version, entitlements).
- Apple Developer ID + notarization env (`APPLE_ID`, `APPLE_TEAM_ID`, etc.) — never commit secrets.
- Unsigned `tauri build` CI artifact before notarization.
