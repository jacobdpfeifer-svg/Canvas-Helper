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

`npm run sync` pulls planner + paginated todo + per-course assignments (`all_dates` + submission) + dated discussions + calendar events (with `context_codes[]`), dedupes by Canvas id, and writes **open dated** rows for the window (America/Denver calendar days). Completed items are counted but omitted from the main table.

Then ask the agent for a week plan (`canvas-week-plan` reads inbox).

## Audit (accuracy check)

```bash
cd browser && npm run audit
```

Fetches a 45-day universe via the **same** `fetchDueUniverse` path, compares to the prior `inbox/week.md`, and writes `inbox/audit-YYYY-MM-DD.md` with:

- **Actionable misses** — dated within 14 days, absent from prior week.md (the accuracy signal)
- **Catalog extras** — undated shells / outside window (reported separately, not failures)

Audit does **not** overwrite `inbox/week.md`; run `npm run sync` for the canonical list.

For cron/automation after SSO is established: `HEADLESS=1 npm run sync`.

## Automation browser vs IDE browser

**Agent automation uses Playwright `browser/.auth` only.** Cursor's IDE browser (`cursor-ide-browser` MCP) has no SSO session — do not use it for sync, RSVP, or any scripted workflow.

| When | Mode |
|------|------|
| First SSO / consent / MFA | Headed: `npm run open-canvas` or `npm run open-campusgroups` |
| Routine sync + RSVP | `HEADLESS=1 npm run sync` / `HEADLESS=1 npm run rsvp-campusgroups` |
| Session dies | Re-run headed open |
| Agent automation | Playwright `.auth` only — **not** cursor-ide-browser |
| Jacob actively driving UI | IDE browser OK (LTI, proctored, manual review) |

Do not run headed and headless Playwright against `.auth` simultaneously.

## CampusGroups (COEN signups)

Major Dinner and AI Lab Workshop signups live on CampusGroups (Shibboleth SSO). Canvas REST knows the assignment exists; RSVP requires Playwright.

```bash
cd browser
npm run open-campusgroups   # once per term — consent + onboarding
HEADLESS=1 npm run sync-dinners -- --force    # CU engineering schedule → inbox/coen-major-dinners.md
HEADLESS=1 npm run sync-ai-labs -- --force    # Canvas AI Lab description → inbox/coen-ai-labs.md
HEADLESS=1 npm run rsvp-dinner -- --major cs --date 2026-08-26
HEADLESS=1 npm run rsvp-ai-lab -- --slot "Wed 1:55 PM"   # after preference confirmed
HEADLESS=1 npm run rsvp-campusgroups -- --event 385793
```

Read `.jacob/signup-preferences.md` before picking a major dinner slot. RSVP ≠ Canvas assignment complete (selfie upload is a separate step weeks later).

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
