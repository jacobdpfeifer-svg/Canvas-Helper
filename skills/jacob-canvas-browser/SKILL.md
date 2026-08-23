---
name: jacob-canvas-browser
description: SSO sync Canvas REST into inbox/ without a PAT; LTI/external UI escape hatch with Jacob. Use for "sync Canvas", "pull todo", "open Canvas", "ZyBooks", "WebAssign", "PlayPosit".
---

# Jacob Canvas browser (SSO)

Spec: [`docs/HYBRID.md`](../../docs/HYBRID.md), [`docs/CU_BROWSER.md`](../../docs/CU_BROWSER.md).

Playwright/Cursor browser is **auth + occasional UI**, not a second due-list product.

## A — Canonical sync (preferred for week data)

```bash
cd browser && npm run open-canvas   # if session expired
cd browser && npm run sync          # SSO → /api/v1 → inbox/week.md
```

Then run `canvas-week-plan` on inbox. Do **not** rebuild the week list by scraping the calendar DOM unless sync failed.

**Audit vs sync:** `npm run sync` writes `inbox/week.md` (daily). `npm run audit` measures recall vs prior week.md and writes `inbox/audit-YYYY-MM-DD.md` — run weekly or when a course looks thin. Audit exits non-zero if pagination is truncated.

## B — Playwright automation (CampusGroups + sync)

**Agent automation = Playwright `browser/.auth` only.** Never assume Cursor IDE browser has SSO.

```bash
cd browser && npm run open-campusgroups   # once per term (consent/onboarding)
HEADLESS=1 npm run rsvp-dinner -- --major cs --date 2026-08-26
HEADLESS=1 npm run rsvp-campusgroups -- --event 385793
```

Before major dinner RSVP: read [`.jacob/signup-preferences.md`](../../.jacob/signup-preferences.md). Verify RSVP via confirmation URL / attendee list — never infer from page text alone. RSVP does not complete the Canvas assignment (selfie upload is later).

## C — Cursor browser LTI escape hatch (Jacob driving)

For WebAssign, ZyBooks, PlayPosit, proctored quizzes, other LTI:

1. Open the tool via Canvas (Jacob completes MFA if needed).
2. Draft steps/answers in chat.
3. **Jacob** submits in the tool UI.
4. Optionally mark done in `inbox/week.md`.

Never auto-click Submit in those tools. Do not use IDE browser for scripted CampusGroups RSVP — use Playwright scripts above.

## Hard stops

- Quizzes / exams / proctored → Jacob only  
- WebAssign / ZyBooks / PlayPosit → Jacob in tool UI  
- CampusGroups RSVP → Playwright scripts only (not IDE browser)  
- No password storage; never commit `browser/.auth/`
