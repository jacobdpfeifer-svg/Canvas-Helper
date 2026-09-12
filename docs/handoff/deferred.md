# Deferred and unsigned — do not re-open as code work

Code-bar items that used to wait on "worth installing" are no longer the hold. What remains is either a stub waiting on data, or a human sign-off. The dated list agents must not rediscover is [`pre-ship-decisions.md`](./pre-ship-decisions.md).

| Item | Status | Notes |
|------|--------|-------|
| Self-improve pipeline | **Deleted** (canvas-focus pivot 2026-09-11) | `cluster` / `drafter` / `shadow` / `promoter` / `run` removed. Do **not** re-add or wire a cron. `logger.py` + `distill.py` remain for episodic → semantic memory only. |
| Billing / Twilio | Unsigned product call | Stubs in `app/billing/` — ship or delete, do not wire. See [`pre-ship-decisions.md`](./pre-ship-decisions.md) |
| `app/mobile/` | Unsigned product call | Phase-2 stub; same decision row as billing |
| Tauri ambient-dock model | Unsigned product call | Partially built; do not replace or finish Hidden/auto-peek without a signature |
| `src/canvas_mcp/` identity | Unsigned product call | Upstream CHANGELOG vs ProductName fork — pick one before more ProductName-only edits |
| Notarized `.dmg` | Unsigned, then escalate | Trigger rewritten in [`packaging-notes.md`](./packaging-notes.md); packaging walk is last, after the decision |
| Live Google OAuth consent smoke | Escalate | Code + dry-run tests green; checklist in [`oauth-smoke.md`](./oauth-smoke.md) needs real client secrets (read/draft only post-pivot) |
| Jacob corpus git-history purge | Escalate | Blobs still on branch + local `pre-purge-backup` tag — see [`history-purge.md`](./history-purge.md). First item on the pre-ship walk |
| Chrome ↔ daemon manual NM smoke | Escalate | Host framing unit-tested; needs loaded extension + install script on a real Chrome profile |
| True two-device SSO | Escalate | `test_two_user_isolation.py` proves separate roots only; cookie jar is shared `browser/.auth/` |
| CampusGroups RSVP | Product call | Real external write via CLI; keep as student-operated escape hatch or remove from ship surface before public |
