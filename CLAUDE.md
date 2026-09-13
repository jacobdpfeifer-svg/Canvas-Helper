# CLAUDE.md — ProductName student Canvas platform

Load [`AGENTS.md`](./AGENTS.md) and `{user_root}/USER.md` (template: [`templates/USER.md`](./templates/USER.md)). Architecture: [`docs/architecture.md`](./docs/architecture.md).

**Default: no Canvas PAT.** Useful via SSO → `/api/v1` → inbox.

Do not restore educator tools, hosted Azure, or quiz-taking automation.

## Truth path

1. Brain: `{user_root}/USER.md` triage (+ `{user_root}/calibration/priority-rubric.md` for priority; `student-course-arc` when the student names a course)
2. Memory: `{user_root}/inbox/week.md` (+ `inbox/courses/*` catalogs + arc notes; optional dated `inbox/focus.md` Top-3 cache)
3. Fill memory: `cd browser && npm run sync` (SSO cookies → Canvas REST; honor `DEV_USER_ROOT`)
4. Optional later: PAT + vendored `canvas-mcp-server` (`src/canvas_mcp/` — upstream canvas-mcp fork; see [`vendor/README.md`](./vendor/README.md)) for the same REST + preview-only tools
5. Escape hatch: browser UI for WebAssign / ZyBooks / PlayPosit / proctored / LTI — student operates; agent drafts

## Layout

```
AGENTS.md, templates/USER.md, docs/architecture.md
schools/               # tenant yaml (e.g. cu-boulder)
browser/               # SSO auth + sync scripts (not DOM-primary)
src/canvas_mcp/       # vendored optional PAT MCP (upstream canvas-mcp)
skills/                # student-* + canvas-week-plan + discussion
app/                   # ProductName Tauri shell + daemon (parked)
plugins/               # school-conditional Bucket-A connectors (see plugins/README.md)
vendor/                # upstream CHANGELOG boundary + archived articles/examples/internal
```

Per-user data lives under `{user_root}` (`inbox/`, `calibration/`, `ledger.jsonl`) — never committed.

## Commands

```bash
# Daily / weekly sync (no token)
cd browser && npm run open-canvas   # once
cd browser && npm run sync

# Optional MCP
uv pip install -e .
uv run canvas-mcp-server --test    # only after PAT in .env
uv run python -m pytest tests/ -q
```

## Coding standards

- Prefer extending SSO→API→inbox over new scrapers
- MCP tools: `@mcp.tool()` + `@validate_params`; `submit_assignment` is preview-only (readOnlyHint, no execution path — canvas-focus pivot) and never gains a confirm/execute branch back
- Bucket-A connector MCP writes: dedicated `ConfirmationGuard` via `canvas_mcp.core.connector_guards.get_connector_guard` — no first-write exemption
- External tool inventory is discovery-only; gaps go to `inbox/tool-gaps.md` — never auto-fetch connector code
- Never commit `.env` or `browser/.auth/`

## Out of scope

Handshake, Azure hosting, educator grading, auto-driving LTI tools / Bucket-B assessment automation. **No Buff Portal/DegreeWorks scraper or login, and no registration/add-drop execution path** — see the bounded GPA + course-planning scope below.

**Degree planning scope (2026-09-13, [`docs/handoff/degree-planning-scope-2026-09-13.md`](docs/handoff/degree-planning-scope-2026-09-13.md)):** GPA calculation and interest/prereq-aware course *suggestions* are in scope, computed from Canvas grades + `USER.md` + a small student-maintained `calibration/credit-hours.yaml`. Anything that claims a specific degree/major requirement is satisfied must trace to a dated `{user_root}/inbox/degree-audit.md` import the student pasted from their own Buff Portal/DegreeWorks audit — never inferred from Canvas data alone, never live-scraped.

**Canvas-focus pivot (2026-09-11, [`docs/handoff/canvas-focus-pivot-2026-09-11.md`](docs/handoff/canvas-focus-pivot-2026-09-11.md)):** this product reads Canvas and helps a student plan and study. It does not act on a student's behalf toward anyone else — an instructor, a classmate, or anyone on the other side of a Canvas submit/comment/discussion-post, all of which stay preview-only with no execute path, ever. RateMyProfessors scraping (their ToS prohibits it) and any self-rewriting-prompts pipeline (`self_improve` cluster/draft/shadow/promote — deleted, don't re-add) stay out. `submit_assignment` is preview-only and stays that way. Any gamification on `learn_loop`/`habit` must have no losable state — no learning streaks, no leaderboards (brief-day continuity exposure in `habit` is fine; it is not a learning streak). **Personal Gmail send / Google Calendar event writes (2026-09-13 addendum, same doc):** reopened — these are the student's own accounts, not Canvas-visible. `send_email`/`create_event`/`update_event` execute for real, but only behind `ConfirmationGuard`/`gate_connector_write` (preview → per-instance human "yes, do that" → execute); there is no automatic/standing posture and none may ever escalate to one. Apple Calendar stays hard-blocked (no EventKit helper built, not a policy stance).
