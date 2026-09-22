# Spatial Instrument — STATUS

> **Superseded 2026-09-21 by Living Instrument** — [`design-system/productname/MASTER.md`](../../../design-system/productname/MASTER.md). The token values listed below are historical; current values (Night `#0C0D0F`, Paper `#F3EFE7`, Forest `#17201A` gold, Signal `#111522`, High contrast `#08090A`; radii 22/18/14/10/6) live in MASTER §04/§06. Chrome classes and IPC boundaries described here are unchanged.

Landed on `phase1-productname-pivot` as `be0eb3c` (fast-forward from worktree branch `spatial-instrument`). Worktree remains at `~/.cache/productname-spatial`. Not pushed.

**Round-1 has not landed.** Tabs remain Study / Plan / Sources / Settings. Home, Calendar, and Exam Prep were not invented.

## Done

- Style tile: `docs/design/style-tile.html` (four themes, §14 specimens, letter-flip + static frame, thinking capsule). Open with `open docs/design/style-tile.html`.
- Tokens in `app/src/styles.css`: Night `#1C1C1E`, Paper `#ECE4D5` / `#563E3B`, Forest pine + cream `#E8D9C4`, High contrast `#0E0E10` no blur. `--bg` painted on `html, body, #root, .workspace`.
- Chrome classes in `app/src/spatial.css`: glass sidebar 240px ≥900px, iOS tab bar <900px, 44px buttons radius 12, now-playing, grouped lists, command palette.
- Surfaces restyled without changing session IPC: FirstRun (Skip kept), Plan, Study (now-playing + letter-flip), Settings swatches, Sources, palette (no mic).
- Craft docs: `design-system/productname/MASTER.md`, `.cursor/rules/ui-craft.mdc`.
- Frontend: `cd app && npm test` (16 pass) && `npm run build`.

## How to run the app

```bash
export PATH="/opt/homebrew/bin:$PATH"
cd app && npm run dev
# native: scripts/native-mirror.sh (iCloud paths break cargo)
```

Synthetic profile only.

## Not done

- Native launch through `scripts/native-mirror.sh` against a synthetic profile (time). Confirm `--bg` paint in the Tauri window when a mirror build is run.
- Round-1 Home / Calendar / Exam Prep (do not exist).
- Candidate E vs F comparison (owner asked for phase1, not a two-look bake-off).
