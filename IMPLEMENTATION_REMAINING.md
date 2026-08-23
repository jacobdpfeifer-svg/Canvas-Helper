# Implementation status — Jacob IBE fork

## Done (no PAT required)

- [x] Architecture: SSO → Canvas `/api/v1` → `inbox/` → JACOB triage ([`docs/HYBRID.md`](docs/HYBRID.md))
- [x] `browser/npm run sync` (session cookies → planner+todo+assignments → `inbox/week.md`)
- [x] Inbox memory + course stubs for all 7 enrolled courses (incl. CALCREADY, ONLINEEXP)
- [x] Browser sync unit tests + DST-safe Denver windows + outcome classification
- [x] Skills/rules/docs aligned (LTI escape hatch; never auto WebAssign/ZyBooks/PlayPosit/proctored)
- [x] Optional MCP student-only server kept for when a PAT arrives
- [x] Goal-oriented priority + briefing (`jacob-task-brief`, `.jacob/priority-rubric.md`, optional `inbox/focus.md`)
- [x] Course learning-arc briefing (`jacob-course-arc`, sync writes `inbox/courses/*.md` catalogs)
- [x] Instructor profile system (`jacob-instructor-profile`, sync fetches syllabus/teachers/policy pages → `inbox/courses/_raw/`)
- [x] CampusGroups RSVP automation (major dinner + AI lab): Playwright scripts, dinner/AI lab caches, enriched inbox tags, registration log

## Open (external)

- [ ] CU student API token / OIT exception — optional upgrade, not a blocker
- [ ] AI Lab workshop: Jacob picks slot in `.jacob/signup-preferences.md` → `npm run rsvp-ai-lab`

## Use now

```bash
cd browser && npm install && npx playwright install chromium
npm run open-canvas && npm run sync
```

Then ask for a week plan, “brief me” / “what should I do first” (priority + first step), or “brief me on [course]” (learning arc).
