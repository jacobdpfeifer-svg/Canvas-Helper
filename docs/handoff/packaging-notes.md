# Packaging notes (Phase A prep)

Notarized `.dmg` / distribution signing is **deferred** until Sync → Top3 and the skill router make the app worth installing (plan items 1–2).

## Build locally (already documented)

Repo path contains `:` which breaks the default DYLD library path on macOS. Use the workaround already recorded in [`architect-brief.md`](./architect-brief.md) (W4 gate + §11 verify):

```bash
source "$HOME/.cargo/env"
cd app/src-tauri && CARGO_TARGET_DIR=/tmp/productname-tauri-target cargo check
```

Do **not** duplicate that procedure elsewhere — keep `architect-brief.md` as the single source of truth.

## Later (item 7)

- Expand `tauri.conf.json` `bundle.macOS` (targets, minimum system version, entitlements).
- Apple Developer ID + notarization env (`APPLE_ID`, `APPLE_TEAM_ID`, etc.) — never commit secrets.
- Unsigned `tauri build` CI artifact before notarization.
