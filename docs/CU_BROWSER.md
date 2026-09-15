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

## Achieve / LearningCurve / Norton EOC (process help)

Macmillan Achieve and similar LTI tools are **Jacob-operated** — never auto-drive.

1. Open via Canvas LTI; Jacob completes IdentiKey / publisher SSO.
2. Agent drafts answers in chat (no em dashes in Achieve open-ended fields; meet character minima). Draft.js fields often need keyboard typing, not DOM `value` writes.
3. **Jacob** submits in the tool UI.
4. Canvas passback (AGS) can lag: if Achieve shows complete but Canvas is still `unsubmitted`, note `Achieve complete — Canvas passback pending` in week/course Notes. Do **not** force Grade Refresh or native `submit_assignment` for `external_tool`.
5. LearningCurve / Norton EOC: same rule — process help only; Jacob operates the UI.

## WeVideo / PlayPosit (full-auto when Jacob asks)

CU branded **WeVideo Interactivity** (formerly PlayPosit). Canvas still launches via `playposit.com` LTI → `wevideo.com/interactive/player_v2`. Courses: **BCOR 1030** (PlayPosit bulbs), **ONLINEEXP** (Welcome + Sections 1–5), **LEEDSFYE** (e.g. Marketing with Meg).

```bash
cd browser
npm run open-canvas          # if SSO expired
npm run wevideo -- --list --course LEEDSFYE
npm run wevideo -- --assignment https://canvas.colorado.edu/courses/21463/assignments/2864476
npm run wevideo -- --course ONLINEEXP --limit 1
npm run wevideo -- --course BCOR1030 --all-open
```

**Behavior:** Playwright uses `browser/.auth`, opens the Canvas assignment LTI, plays the interactive video, answers interactions (transcript-first heuristic; optional `OPENAI_API_KEY`), clicks Submit/Continue, waits for Interactive Video Complete, logs `inbox/courses/_raw/wevideo-*.json`, and notes the matching course MD (`WeVideo complete — Canvas passback pending` if grade lags).

**Env:**
- `OPENAI_API_KEY` — stronger MC/free-response answers
- `WEVIDEO_NO_WEB=1` — skip DuckDuckGo fallback
- `HEADLESS=1` — only after headed runs are stable

**Not covered:** ONLINEEXP advising-challenge Canvas quizzes; remoted-proctored BCOR reading quizzes; non-WeVideo LTI (skipped with a log).

Recon dump: `inbox/courses/_raw/wevideo-recon.json`.

## WebAssign (process help)

Open via Canvas LTI or [CU WebAssign login](https://www.webassign.net/colorado/login.html). Agent drafts steps/answers; **Jacob** enters and submits. Never auto-fill or auto-submit.

**UI tips (Jacob typing in the tool):**

- Plain fractions/text: use WebAssign’s text fields as shown; avoid pasting into broken MathType when a plain answer works.
- Math expressions: prefer MathType in the assignment UI (`x^2-9` style); hidden `RA_*` fields are unreliable if edited outside MathType.
- Graph / interval answers: formats like `(3),5];` or `(-infinity,2];` — match the problem’s interval notation.
- Past due: WebAssign → **Request Extension** (often automatic, ~3 days) before more submits will stick.
- Work one question at a time; don’t batch-paste across reloads.

## Google Calendar (school schedule)

Curated classes, timed exams/presentations, and confirmed club RSVPs → dedicated subcalendar **CU Fall 2026**. See [`.jacob/calendar-policy.md`](../.jacob/calendar-policy.md).

### Canonical sync

```bash
cd browser && npm run sync-calendar              # rebuild manifest + dry-run
cd browser && npm run sync-calendar -- --apply   # push via Composio (OAuth required)
cd browser && npm run sync-calendar -- --setup-calendar  # create subcalendar
```

Manifest: `inbox/calendar-manifest.json`. Diff report: `inbox/calendar-sync-diff.md`.

**Auth paths (separate):**

| Path | Purpose |
|------|---------|
| Composio `googlecalendar` OAuth | Bulk create/update via API (`--apply`) |
| `browser/.auth-google` + CDP | One-time Google login + visual verification only |

```bash
cd browser && npm run open-google-calendar   # real Chrome, dedicated profile, port 9222
```

Do **not** use Canvas `.auth` for Google (different origin). Do **not** use IDE browser MCP for Google Calendar writes.

After `rsvp-dinner` / `rsvp-ai-lab`, offer `sync-calendar` to add the confirmed slot.

## Security

- Never commit cookies, `browser/.auth/`, `browser/.auth-google/`, or passwords.
- Prefer headed mode for CU SSO.

## When a PAT arrives

Keep SSO sync as fallback. Prefer MCP for routine typed reads/native submits. See [`CU_ACCESS.md`](CU_ACCESS.md). Architecture stays the same: [`HYBRID.md`](HYBRID.md).
