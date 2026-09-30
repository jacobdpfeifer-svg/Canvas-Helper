---
name: student-canvas-browser
description: Run SSO Canvas browser sync into inbox/ without a PAT; open LTI/external tool UIs with the student. Use for "sync Canvas", "canvas sync", "update my canvas sync", "pull todo", "open Canvas", "open ZyBooks", "WebAssign", "PlayPosit" — the sync/open action itself, not week planning or inbox file repair.
schema_version: 1
category: canvas_read
model_tier: fast
requires_cloud: false
---

# Canvas browser (SSO)

Spec: [`docs/architecture.md`](../../docs/architecture.md). School-specific browser notes live under `docs/schools/` and `plugins/{school}/`.

Playwright/Cursor browser is **auth + occasional UI**, not a second due-list product.

## Instructions

### A — Canonical sync (preferred for week data)

```bash
cd browser && npm run open-canvas   # if session expired
cd browser && npm run sync          # SSO → /api/v1 → inbox/week.md
```

Then run `canvas-week-plan` on inbox. Do **not** rebuild the week list by scraping the calendar DOM unless sync failed. Do not paste the full `week.md` into this prompt; the next turn's inbox slice carries the due-list rows.

**Audit vs sync:** `npm run sync` writes `inbox/week.md` (daily). `npm run audit` measures recall vs prior week.md and writes `inbox/audit-YYYY-MM-DD.md` — run weekly or when a course looks thin. Audit exits non-zero if pagination is truncated.

### B — Playwright automation (school plugins + sync)

**Agent automation = Playwright `browser/.auth` only.** Never assume Cursor IDE browser has SSO.

School plugins (e.g. CampusGroups under `plugins/cu-boulder-campusgroups/`) own RSVP scripts and dated examples — do not hardcode event IDs or majors in this skill.

Before calendar-binding RSVP: read [`calibration/signup-preferences.md`](../../calibration/signup-preferences.md). Verify RSVP via the plugin’s success contract — never infer from page text alone. RSVP does not complete the Canvas assignment when a later upload is required.

**RSVP turn, end to end** (CampusGroups; details in the plugin README):

1. Run the RSVP script **without** `--confirm`. Show the student the preview `message`, the event label/date, and any `alternatives`. The organizer sees RSVPs — say so.
2. Wait for an explicit yes to *that* event. A yes to "sign me up for dinners" in general is not a yes to a specific dinner. If they pick an alternative, run its `previewWith` and show that preview instead.
3. Run `confirmWith` exactly as printed (it carries `--expect`). Never hand-build a `--confirm` command or drop `--expect`.
4. Relay `message` and `next` verbatim-in-spirit. On `not_attempted`, say plainly that nothing was registered and give the `next` fix (usually `npm run open-campusgroups`). On `unconfirmed`, say the student **may** be registered and must check CampusGroups → My Events before any retry — do not auto-retry. On `confirmed` / `already_registered`, you may offer a calendar reminder (preview → confirm via the calendar connector).
5. Don't open or paste the diagnostics folder unless the student asks why it failed; then show the `screenshot` path.

### C — Cursor browser LTI escape hatch (the student driving)

**Bucket B** (assessment-shaped): WebAssign, ZyBooks, PlayPosit, Norton/EOC/LearningCurve, proctoring (Honorlock/Respondus/etc.), or graded `external_tool` items.

1. Open the tool via Canvas (the student completes MFA if needed).
2. Help with navigation and concepts in chat — never the answer to a graded item (don't state, pick, compute, or check it). Asked for the answer → decline in one line and offer the concept or a parallel practice problem. Proctored/exam screens → no help. Same scope as [`student-screen-coach`](../student-screen-coach/SKILL.md) § Graded work.
3. **The student** submits in the tool UI.
4. Optionally mark done in `inbox/week.md`.

Never auto-click Submit in those tools. No connector, config flag, or “trust” override may automate Bucket B.

Stuck on where to click? Hand off to [`student-screen-coach`](../student-screen-coach/SKILL.md) — the student sends screenshots, the agent names the next control, the student taps. Device-automation harnesses (cell-use, Appium, mobile-mcp, agent-device) are never a way around this section ([`plugins/README.md`](../../plugins/README.md) rule 7).

**Bucket A** (admin / read-only surfaces, CampusGroups): registry-eligible only. Sync writes a discovery inventory under `## Tools this semester` in each course file and flags missing connectors in `inbox/tool-gaps.md`. Do **not** fetch or generate connector code — maintainers add `plugins/{school}/{tool}/` via reviewed PR ([`plugins/README.md`](../../plugins/README.md)). MCP writes from a Bucket-A connector require `ConfirmationGuard` (`connector_guards.get_connector_guard`).

Do not use IDE browser for scripted external RSVP — use Playwright plugin scripts.

### Hard stops

- Quizzes / exams / proctored → the student only
- WebAssign / ZyBooks / PlayPosit → the student in tool UI
- Bucket B tools → never automate (no override)
- Missing Bucket A connector → flag gap only; never auto-build
- External RSVP → Playwright plugin scripts only (not IDE browser)
- No password storage; never commit `browser/.auth/`

## Context

Do not paste the inbox here — this turn’s slice is supplied after the learning profile. Do not read the full `inbox/week.md` into this prompt.

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. `inbox/week.md` is the sync target, not a blob to paste into the stable prefix
3. [`calibration/signup-preferences.md`](../../calibration/signup-preferences.md) before calendar-binding RSVP
4. `docs/schools/` and `plugins/{school}/` for school-specific browser notes
5. `inbox/tool-gaps.md` for missing Bucket-A connectors

## Tools available

Read only for Canvas MCP. No `submit_assignment` from this skill. No auto-click Submit in Bucket B tools.

- `npm run open-canvas` / `npm run sync` / `npm run audit` — SSO session and inbox write
- Playwright plugin scripts — Bucket A RSVP only, after the success contract
- MCP writes from a Bucket-A connector require `ConfirmationGuard`

## Triggers

- sync Canvas
- canvas sync
- update my canvas sync
- sync my canvas
- pull todo
- open Canvas
- open ZyBooks
- open WebAssign
- PlayPosit
