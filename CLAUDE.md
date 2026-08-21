# CLAUDE.md — Jacob IBE personal Canvas fork

Developer/agent guide for **this** repository. For product context and triage, always load [`JACOB.md`](./JACOB.md) and [`AGENTS.md`](./AGENTS.md).

This is **not** the upstream multi-audience canvas-mcp product. Do not restore educator tools, hosted Azure, PyPI/Registry publishing, or quiz-taking.

## Environment

- `uv pip install -e .`
- `.env` from `env.template`: CU URL, `CANVAS_ROLE=student`, student write allowlist, anonymization off
- CLI: `canvas-mcp-server` (stdio only). `--test` / `--config` supported.
- **Phase 0:** live CU token still required for real Canvas work — see `docs/CU_ACCESS.md`

## Layout

```
canvas-mcp/
├── JACOB.md                 # Jacob goals, courses, triage (load every session)
├── AGENTS.md                # Agent operating rules
├── .jacob/calibrated-courses.md  # First-submit calibration gate
├── src/canvas_mcp/
│   ├── core/                # Client, config, validation, fencing, course policy
│   ├── tools/               # Student + shared read/write tools only
│   ├── resources/           # MCP resources/prompts
│   └── server.py            # stdio entry
├── skills/                  # jacob-* + week-plan + discussion facilitator
└── tests/                   # Student-surface pytest suite
```

## Coding standards

- Type hints on functions; MCP tools use `@mcp.tool()` + `@validate_params`
- Async Canvas I/O via `make_canvas_request()`; course IDs via `get_course_id()`
- Dates via `format_date()`; honor untrusted-content fences in tool output
- `submit_assignment` stays preview → `confirmation_token` → confirm
- Do not reintroduce educator registration paths, HTTP multi-tenant hosting, or `code_api`

## Tests

```bash
uv run python -m pytest tests/ -v
```

New tools need tests (success / error / edge). Registry expectations live in `tests/test_role_filtering.py`.

## Git

Work on `personal/jacob-ibe`. This fork is local/personal — no upstream PR of the strip. Ask before committing if unclear; never commit `.env`.

## Out of scope

Degree audit engines, Handshake, Google Calendar as server features, educator grading/rubrics/course copy, Azure Entra hosting, taking quizzes for Jacob.
