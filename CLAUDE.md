# CLAUDE.md — ProductName student Canvas platform

Load [`AGENTS.md`](./AGENTS.md) and `{user_root}/USER.md` (template: [`templates/USER.md`](./templates/USER.md)). Architecture: [`docs/architecture.md`](./docs/architecture.md).

**Default: no Canvas PAT.** Useful via SSO → `/api/v1` → inbox.

Do not restore educator tools, hosted Azure, or quiz-taking automation.

## Truth path

1. Brain: `{user_root}/USER.md` triage (+ `{user_root}/calibration/priority-rubric.md` for priority; `student-course-arc` when the student names a course)
2. Memory: `{user_root}/inbox/week.md` (+ `inbox/courses/*` catalogs + arc notes; optional dated `inbox/focus.md` Top-3 cache)
3. Fill memory: `cd browser && npm run sync` (SSO cookies → Canvas REST; honor `DEV_USER_ROOT`)
4. Optional later: PAT + `canvas-mcp-server` for the same REST + native submits
5. Escape hatch: browser UI for WebAssign / ZyBooks / PlayPosit / proctored / LTI — student operates; agent drafts

## Layout

```
AGENTS.md, templates/USER.md, docs/architecture.md
schools/               # tenant yaml (e.g. cu-boulder)
browser/               # SSO auth + sync scripts (not DOM-primary)
src/canvas_mcp/       # optional MCP when PAT exists
skills/                # student-* + canvas-week-plan + discussion
app/                   # ProductName Tauri shell + daemon
plugins/               # school-conditional Bucket-A connectors (see plugins/README.md)
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
- MCP tools: `@mcp.tool()` + `@validate_params`; `submit_assignment` stays preview→confirm via ConfirmationGuard
- Bucket-A connector MCP writes: dedicated `ConfirmationGuard` via `canvas_mcp.core.connector_guards.get_connector_guard` — no first-write exemption
- External tool inventory is discovery-only; gaps go to `inbox/tool-gaps.md` — never auto-fetch connector code
- Never commit `.env` or `browser/.auth/`

## Out of scope

Degree audit engines, Handshake, Azure hosting, educator grading, auto-driving LTI tools / Bucket-B assessment automation.
