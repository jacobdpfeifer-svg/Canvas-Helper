# Canvas MCP — Jacob IBE (personal fork)

Personal **student-only** Canvas agent for **Jacob Pfeifer**, CU Boulder **Integrated Business and Engineering (IBE)**, Fall 2026.

This branch (`personal/jacob-ibe`) is a cut-down fork of upstream canvas-mcp. It is **not** a drop-in contribution surface back to PyPI / MCP Registry / Azure.

Context and triage rules: [`JACOB.md`](JACOB.md).

## Status (honest)

| Phase | State |
|-------|--------|
| Jacob profile + Cursor rule + skills | Done |
| Student-only tool registry (educator/hosted strip) | Mostly done — local stdio focus |
| **Phase 0 — live CU Boulder API token** | **Open** — add `CANVAS_API_TOKEN` then smoke-test |
| Live auto-submit validation | Blocked on Phase 0 |

See [`IMPLEMENTATION_REMAINING.md`](IMPLEMENTATION_REMAINING.md) and [`docs/CU_ACCESS.md`](docs/CU_ACCESS.md).

## Quick start

1. Copy env and set a real token (when you have one):

```bash
cp env.template .env
# edit CANVAS_API_TOKEN
```

```bash
CANVAS_API_TOKEN=your_token_here
CANVAS_API_URL=https://canvas.colorado.edu/api/v1
CANVAS_ROLE=student
STUDENT_WRITE_TOOLS=submit_assignment,comment_on_my_submission,mark_module_item_done
COURSE_AGENT_POLICY_DEFAULT=allow
ENABLE_DATA_ANONYMIZATION=false
```

2. Install and run (stdio only):

```bash
uv pip install -e .
uv run canvas-mcp-server --test   # after token is set
uv run canvas-mcp-server
```

3. Point Cursor MCP at this server. Always load `JACOB.md`.

## Fall 2026

| Course | Focus |
|--------|--------|
| APPM 1235 | Pre-calc — exams = you |
| BCOR 1030 | Comm strategy — drafts OK; live presentations = you |
| CSCI 1200 | Computational thinking — worth your time by default |
| ECON 2010 | Micro — still required despite ECON 2999TC |

## Skills

| Skill | Purpose |
|-------|---------|
| `jacob-ibe-semester` | Transfer + semester orientation |
| `canvas-week-plan` | Weekly plan with triage buckets |
| `jacob-assignment-triage` | Process help + rare auto-submit |
| `canvas-discussion-facilitator` | Draft discussions; post only if you say so |

## Automation policy (short)

- Process help first; submit is exceptional
- Never auto quizzes/exams/classmate presentations
- When unsure → ask Jacob
- Full rubric: [`JACOB.md`](JACOB.md)
- Course calibration list: [`.jacob/calibrated-courses.md`](.jacob/calibrated-courses.md)

## License

MIT (inherited from upstream). Not for republishing as the multi-audience product.
