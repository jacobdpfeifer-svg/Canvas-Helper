# Pre-ship human walk — remaining checklist

Signed product decisions (2026-09-12): vendored MCP, delete billing/mobile, park Tauri, packaging **not yet**. See [`pre-ship-decisions.md`](./pre-ship-decisions.md).

## Before public testers

1. [x] Sign product decision rows 1–4
2. [x] History purge + force-push — `git show 37f38b3:dev/JACOB.md` fails; see [`history-purge.md`](./history-purge.md)
3. [ ] Counsel/review of [`docs/legal/privacy.md`](../legal/privacy.md) and [`docs/legal/terms.md`](../legal/terms.md)
4. [ ] Live OAuth smoke — read/draft only ([`oauth-smoke.md`](./oauth-smoke.md)) — **Jacob**
5. [ ] Chrome Native Messaging round-trip — **Jacob**
6. [ ] Second-account / two-device SSO — **Jacob**
7. [ ] Packaging / notarization — blocked until decision 4 flips to worth installing
8. [x] CampusGroups RSVP kept as documented CLI escape hatch for CU private beta

## Agent cannot run (confirmed)

- CU IdentiKey + MFA (`npm run open-canvas`)
- Live Google OAuth consent in a browser
- Chrome extension install on your real profile
- Second physical device/account SSO
