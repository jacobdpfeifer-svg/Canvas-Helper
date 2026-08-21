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

## B — Cursor browser LTI escape hatch

For WebAssign, ZyBooks, PlayPosit, proctored quizzes, other LTI:

1. Open the tool via Canvas (Jacob completes MFA if needed).
2. Draft steps/answers in chat.
3. **Jacob** submits in the tool UI.
4. Optionally mark done in `inbox/week.md`.

Never auto-click Submit in those tools.

## Hard stops

- Quizzes / exams / proctored → Jacob only  
- WebAssign / ZyBooks / PlayPosit → Jacob in tool UI  
- No password storage; never commit `browser/.auth/`
