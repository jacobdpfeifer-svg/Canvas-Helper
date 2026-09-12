# Deferred — do not re-open as unsigned code work

Signed product calls live in [`pre-ship-decisions.md`](./pre-ship-decisions.md).

| Item | Status | Notes |
|------|--------|-------|
| Self-improve pipeline | **Deleted** (canvas-focus pivot) | Do not re-add cluster/draft/shadow/promote. `logger.py` + `distill.py` only. |
| Billing / Twilio / mobile | **Deleted** (signed 2026-09-12) | `app/billing/` and `app/mobile/` removed. Do not re-add monetization stubs. |
| Tauri ambient-dock model | **Parked** (signed 2026-09-12) | Peek/expanded as-built; see [`ui-shell-alternatives.md`](./ui-shell-alternatives.md). |
| `src/canvas_mcp/` identity | **Vendored** (signed 2026-09-12) | Upstream CHANGELOG + [`vendor/README.md`](../../vendor/README.md). |
| Notarized `.dmg` | **Not yet** (signed 2026-09-12) | Packaging trigger not met; local unsigned build only. |
| Live Google OAuth consent smoke | Escalate (Jacob) | [`oauth-smoke.md`](./oauth-smoke.md) |
| Jacob corpus git-history purge | Escalate / in progress | [`history-purge.md`](./history-purge.md) |
| Chrome ↔ daemon manual NM smoke | Escalate (Jacob) | |
| True two-device SSO | Escalate (Jacob) | Cookie jar still shared `browser/.auth/` |
| CampusGroups RSVP | Keep as CLI escape hatch for CU private beta | Documented in plugin README |
