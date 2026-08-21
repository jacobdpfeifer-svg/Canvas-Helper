# Implementation status — Jacob IBE fork

Branch: `personal/jacob-ibe`.

## Done (code / docs)

- [x] `JACOB.md` + `.cursor/rules/jacob-ibe-student.mdc`
- [x] Skills: week-plan, assignment-triage, ibe-semester, discussion facilitator
- [x] Student-only `register_all_tools`; educator tools / Azure deploy / `code_api` / access-approval removed
- [x] Hosted shell gutted (stdio-focused server, no `[hosted]` extra, no publish workflows)
- [x] `env.template` + slim `README.md` / `AGENTS.md` / fork `CLAUDE.md`
- [x] Triage skill: visible why-auto; calibration file
- [x] Submit preview: points + submission_types; quiz soft-block
- [x] Registry tests include write tools + `get_my_submission`
- [x] Pytest green on remaining student surface (unit/mocks)

## Open — Phase 0 (blocking for live use)

- [ ] Replace placeholder `CANVAS_API_TOKEN` in `.env` with a real CU Boulder student token
- [ ] `uv run canvas-mcp-server --test`
- [ ] Smoke: `get_my_profile`, `list_courses`, `get_my_upcoming_assignments`
- [ ] First live triage / optional calibrated auto-submit under `JACOB.md` rules

Until Phase 0 passes, treat Canvas automation as **unverified**. See [`docs/CU_ACCESS.md`](docs/CU_ACCESS.md).

## Optional later

- [ ] Wire Cursor MCP config for this repo
- [ ] Add courses to [`.jacob/calibrated-courses.md`](.jacob/calibrated-courses.md) after first Jacob-approved submits
- [ ] Further trim unused FERPA anonymization / audit surface if desired
