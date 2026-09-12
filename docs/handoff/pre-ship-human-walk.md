# Pre-ship human walk — remaining checklist

Agent work from the 2026-09-12 pre-ship audit is done for code/docs. This file is the human-only remainder (also tracked in [`pre-ship-decisions.md`](./pre-ship-decisions.md)).

## Before public testers

1. [ ] Sign product decision rows 1–4 in `pre-ship-decisions.md` (or park explicitly).
2. [ ] History purge + force-push approval ([`history-purge.md`](./history-purge.md)). Confirm `git show 37f38b3:dev/JACOB.md` fails after rewrite.
3. [ ] Counsel/review of [`docs/legal/privacy.md`](../legal/privacy.md) and [`docs/legal/terms.md`](../legal/terms.md).
4. [ ] Live OAuth smoke — read/draft only ([`oauth-smoke.md`](./oauth-smoke.md)).
5. [ ] Chrome Native Messaging round-trip on a real profile.
6. [ ] Second-account / two-device SSO (cookie jar is still shared `browser/.auth/`).
7. [ ] Packaging / notarization only after decision 4 signed.
8. [ ] Decide CampusGroups RSVP: keep CLI escape hatch or remove from ship surface.

## Private beta (trusted CU only) — already gated in code

- Discussion post/reply and photo `CONFIRM=1` submit are preview-only / hard-blocked.
- Demo STOP / narrate / fake ledger / approve-demo removed from the dock.
- Waitlist path no longer runs CU SSO.
- Brand surfaces say private beta / codename.
