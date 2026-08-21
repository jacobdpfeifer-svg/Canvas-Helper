# CU Boulder Canvas via SSO (no PAT)

Default path when a student access token is missing or blocked.

Target: `https://canvas.colorado.edu`

## Canonical sync (preferred)

Uses **session cookies → Canvas `/api/v1`** (not DOM scraping) and writes `inbox/week.md`.

```bash
cd browser
npm install && npx playwright install chromium
npm run open-canvas   # IdentiKey + MFA once; session in browser/.auth/
npm run sync          # → ../inbox/week.md
```

Then ask the agent for a week plan (`canvas-week-plan` reads inbox).

Optional deep pass: `npm run audit` (45-day comparison).

## Interactive Cursor browser (escape hatch / LTI)

Use when Jacob must open WebAssign, ZyBooks, PlayPosit, or a proctored quiz:

1. Navigate to Canvas; Jacob completes MFA if needed.
2. Open the external tool.
3. Agent drafts steps / answers; **Jacob** submits in the tool UI.
4. Optionally note completion in `inbox/week.md` or the course file.

Do **not** use interactive UI as the primary way to build the weekly due list — run `npm run sync` instead.

## Security

- Never commit cookies, `browser/.auth/`, or passwords.
- Prefer headed mode for CU SSO.

## When a PAT arrives

Keep SSO sync as fallback. Prefer MCP for routine typed reads/native submits. See [`CU_ACCESS.md`](CU_ACCESS.md). Architecture stays the same: [`HYBRID.md`](HYBRID.md).
