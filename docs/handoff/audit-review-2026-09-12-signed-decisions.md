# Audit / review — signed decisions pass (2026-09-12)

## What Jacob signed

| # | Decision | Choice |
|---|----------|--------|
| 1 | `src/canvas_mcp/` identity | **Vendored** upstream canvas-mcp |
| 2 | billing / mobile | **Delete** |
| 3 | Tauri dock | **Park** (keep as-is; no Hidden/auto-peek finish; no shell replace) |
| 4 | Packaging | **Not yet** worth installing |

Recorded in [`pre-ship-decisions.md`](./pre-ship-decisions.md).

## What this pass did

### Vendored MCP (row 1)

- Banner atop root [`CHANGELOG.md`](../../CHANGELOG.md): this is **upstream** release history, not ProductName’s product log.
- [`vendor/README.md`](../../vendor/README.md) explains the boundary; archived `articles/`, `examples/`, `internal/` under `vendor/`.
- README / CLAUDE / architecture / pyproject updated so outside testers are not confused by canvas-mcp issue numbers.

### Billing / mobile (row 2)

- Deleted `app/billing/` (Stripe/Twilio stubs) and `app/mobile/`.
- Product paths grepped clean of monetization wiring (historical handoff docs may still mention the old stubs).

### Tauri (row 3)

- Parked ambient-dock design status; compared Electron / SwiftUI / menu-bar / browser-only in [`ui-shell-alternatives.md`](./ui-shell-alternatives.md).
- **Verdict:** no near-term alternative beats finishing honesty on the existing Tauri dock. UI polish still needed; shell rewrite deferred.

### Packaging (row 4)

- [`packaging-notes.md`](./packaging-notes.md) updated: notarization blocked until “worth installing.”

### History purge (human walk #1)

- **Was not done** despite earlier belief — `git show 37f38b3:dev/JACOB.md` still returned the personal profile.
- Ran `git filter-repo` to strip `dev/`, `.jacob/`, `inbox/` from history; force-pushed `phase1-productname-pivot`.
- Post-check: `37f38b3` is an invalid object name.

### Housekeeping

- Committed signed-decision work (`92ad6bd`) after earlier pre-ship honesty commit (`7ce2ad2`).
- Left `.cursor/skills/*` **uncommitted** on purpose (4.6MB Cursor design skill packs) — added to `.gitignore`. Committed `design-system/productname/MASTER.md` + `.cursor/rules/ui-craft.mdc` (product dock craft).

## What Jacob still owns

1. Live Google OAuth smoke (read/draft only) — agent cannot complete MFA/consent.
2. Chrome Native Messaging on a real profile.
3. Two-device / second-account SSO.
4. Optional counsel pass on Privacy/Terms drafts.
5. Flip packaging to “worth installing” only when UI + smokes feel ready.

## What agent cannot do (confirmed)

- CU IdentiKey + MFA for `npm run open-canvas`
- Live Google OAuth browser consent
- Loading the Chrome extension on your everyday profile
- Second physical device SSO

## Suggested next steps for you

1. `cd browser && npm run open-canvas` → MFA → `npm run sync` when you want live inbox data.
2. Run OAuth / NM / two-device checks from [`pre-ship-human-walk.md`](./pre-ship-human-walk.md).
3. Treat private beta as CU-only until packaging is signed “worth installing.”
