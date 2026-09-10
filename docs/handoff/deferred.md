# Deferred and unsigned — do not re-open as code work

Code-bar items that used to wait on "worth installing" are no longer the hold. What remains is either a stub waiting on data, or a human sign-off. The dated list agents must not rediscover is [`pre-ship-decisions.md`](./pre-ship-decisions.md).

| Item | Status | Notes |
|------|--------|-------|
| Self-improve pipeline auto-run | Unsigned product call | `run_self_improve` (cluster → draft → shadow, real LLM critic, no auto-promote) is manual-CLI-only by design; wiring it to a daemon/cron loop is a product call, not a stub gap |
| Billing / Twilio | Unsigned product call | Stubs in `app/billing/` — ship or delete, do not wire. See [`pre-ship-decisions.md`](./pre-ship-decisions.md) |
| `app/mobile/` | Unsigned product call | Phase-2 stub; same decision row as billing |
| Tauri ambient-dock model | Unsigned product call | Partially built; do not replace or finish Hidden/auto-peek without a signature |
| `src/canvas_mcp/` identity | Unsigned product call | Upstream CHANGELOG vs ProductName fork — pick one before more ProductName-only edits |
| Notarized `.dmg` | Unsigned, then escalate | Trigger rewritten in [`packaging-notes.md`](./packaging-notes.md); packaging walk is last, after the decision |
| Live Google OAuth consent smoke | Escalate | Code + dry-run tests green; checklist in [`oauth-smoke.md`](./oauth-smoke.md) needs real client secrets |
| Jacob corpus git-history purge | Escalate | Working tree clean; blobs still on branch — see [`history-purge.md`](./history-purge.md). First item on the pre-ship walk |
| Chrome ↔ daemon manual NM smoke | Escalate | Host framing unit-tested; needs loaded extension + install script on a real Chrome profile |
| True two-device SSO | Escalate | `test_two_user_isolation.py` proves separate roots only |
