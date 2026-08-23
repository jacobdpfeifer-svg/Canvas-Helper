# CLAUDE.md — Jacob IBE personal Canvas fork

Load [`JACOB.md`](./JACOB.md) and [`AGENTS.md`](./AGENTS.md). Architecture: [`docs/HYBRID.md`](./docs/HYBRID.md).

**Default: no Canvas PAT.** Useful via SSO → `/api/v1` → `inbox/`.

This is **not** the upstream multi-audience product. Do not restore educator tools, hosted Azure, or quiz-taking automation.

## Truth path

1. Brain: `JACOB.md` triage (+ `.jacob/priority-rubric.md` when Jacob asks what’s next; `jacob-course-arc` when Jacob names a course)
2. Memory: `inbox/week.md` (+ `inbox/courses/*` catalogs + arc notes; optional dated `inbox/focus.md` Top-3 cache)
3. Fill memory: `cd browser && npm run sync` (SSO cookies → Canvas REST)
4. Optional later: PAT + `canvas-mcp-server` for the same REST + native submits
5. Escape hatch: browser UI for WebAssign / ZyBooks / PlayPosit / proctored / LTI — Jacob operates; agent drafts  

## Layout

```
JACOB.md, AGENTS.md, docs/HYBRID.md
inbox/                 # durable due-list memory (+ optional focus.md)
browser/               # SSO auth + sync scripts (not DOM-primary)
.jacob/                # calibration + priority-rubric
src/canvas_mcp/        # optional MCP when PAT exists
skills/                # jacob-* + week-plan + task-brief + course-arc + discussion
```

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
- MCP tools: `@mcp.tool()` + `@validate_params`; `submit_assignment` stays preview→confirm
- Never commit `.env` or `browser/.auth/`

## Out of scope

Degree audit engines, Handshake, Azure hosting, educator grading, auto-driving LTI tools.
