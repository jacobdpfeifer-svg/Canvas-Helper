---
name: student-canvas-browser
description: Run SSO Canvas browser sync into inbox/ without a PAT; open LTI/external tool UIs with the student. Use for "sync Canvas", "pull todo", "open Canvas", "open ZyBooks", "WebAssign", "PlayPosit" — the sync/open action itself, not week planning.
schema_version: 1
category: canvas_read
requires_cloud: false
---

# Canvas browser (SSO)

Spec: [`docs/architecture.md`](../../docs/architecture.md). School-specific browser notes live under `docs/schools/` and `plugins/{school}/`.

Playwright/Cursor browser is **auth + occasional UI**, not a second due-list product.

## A — Canonical sync (preferred for week data)

```bash
cd browser && npm run open-canvas   # if session expired
cd browser && npm run sync          # SSO → /api/v1 → inbox/week.md
```

Then run `canvas-week-plan` on inbox. Do **not** rebuild the week list by scraping the calendar DOM unless sync failed.

**Audit vs sync:** `npm run sync` writes `inbox/week.md` (daily). `npm run audit` measures recall vs prior week.md and writes `inbox/audit-YYYY-MM-DD.md` — run weekly or when a course looks thin. Audit exits non-zero if pagination is truncated.

## B — Playwright automation (school plugins + sync)

**Agent automation = Playwright `browser/.auth` only.** Never assume Cursor IDE browser has SSO.

School plugins (e.g. CampusGroups under `plugins/cu-boulder-campusgroups/`) own RSVP scripts and dated examples — do not hardcode event IDs or majors in this skill.

Before calendar-binding RSVP: read [`calibration/signup-preferences.md`](../../calibration/signup-preferences.md). Verify RSVP via the plugin’s success contract — never infer from page text alone. RSVP does not complete the Canvas assignment when a later upload is required.

## C — Cursor browser LTI escape hatch (the student driving)

**Bucket B** (assessment-shaped): WebAssign, ZyBooks, PlayPosit, Norton/EOC/LearningCurve, proctoring (Honorlock/Respondus/etc.), or graded `external_tool` items.

1. Open the tool via Canvas (the student completes MFA if needed).
2. Draft steps/answers in chat.
3. **The student** submits in the tool UI.
4. Optionally mark done in `inbox/week.md`.

Never auto-click Submit in those tools. No connector, config flag, or “trust” override may automate Bucket B.

**Bucket A** (admin / read-only surfaces, CampusGroups): registry-eligible only. Sync writes a discovery inventory under `## Tools this semester` in each course file and flags missing connectors in `inbox/tool-gaps.md`. Do **not** fetch or generate connector code — maintainers add `plugins/{school}/{tool}/` via reviewed PR ([`plugins/README.md`](../../plugins/README.md)). MCP writes from a Bucket-A connector require `ConfirmationGuard` (`connector_guards.get_connector_guard`).

Do not use IDE browser for scripted external RSVP — use Playwright plugin scripts.

## Hard stops

- Quizzes / exams / proctored → the student only  
- WebAssign / ZyBooks / PlayPosit → the student in tool UI  
- Bucket B tools → never automate (no override)  
- Missing Bucket A connector → flag gap only; never auto-build  
- External RSVP → Playwright plugin scripts only (not IDE browser)  
- No password storage; never commit `browser/.auth/`
