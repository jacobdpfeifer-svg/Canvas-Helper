# Run log — student production stress test, 2026-10-05

Repo root = `Canvas Competition/` (iCloud checkout). Branch `phase1-productname-pivot`.
All Python runs had `PRODUCTNAME_LLM_API_KEY=` and `PRODUCTNAME_LLM_WRITE_API_KEY=`
exported empty (no live model). An audit start marker was touched in the session
scratchpad before any run. The final isolation check compares the real
app-support tree against it.

Format: `command` — cwd — DEV_USER_ROOT — exit — result.

## Phase 0 — setup

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| 0.1 | `git branch --show-current` | root | — | 0 | `phase1-productname-pivot` |
| 0.2 | `git check-ignore -v var/audit-user-roots/x` (before) | root | — | 1 | not ignored → appended `var/` to `.gitignore` |
| 0.3 | `git check-ignore -v var/audit-user-roots` (after) | root | — | 0 | `.gitignore:173:var/` |
| 0.4 | `grep -oE '^[A-Z_]+=' .env` + count of non-empty `PRODUCTNAME_LLM_API_KEY` | root | — | 0 | key names only; LLM key blank (count 0). Values not read |

## Phase 1 — environments and suites (Part 1)

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| 1.1 | `uv pip install -e ".[google,diagrams]"` | root | — | 0 | both extras installed (existing `.venv`, Python 3.12.14) |
| 1.2 | `uv sync --group dev --all-extras --inexact` | root | — | 0 | lockfile versions; urllib3 2.8.0→2.7.0 (locked) |
| 1.3 | `npm install --no-audit --no-fund` | browser/ | — | 0 | ok (install-scripts warning only) |
| 1.4 | `npm install --no-audit --no-fund` | app/ | — | 0 | ok (install-scripts warning only) |
| 1.5 | `uv run python -m pytest tests/ -q` | root | unset | 0 | **834 passed, 19 skipped** |
| 1.6 | `npm test` | browser/ | unset | 0 | **219/219 pass** |
| 1.7 | `npm test` | app/ | unset | 1 | **1 failed / 64**: `CalendarView.test.tsx`: fixture due 2026-09-22 is now in the past (wall-clock dependent) |
| 1.8 | `uv run ruff check .` | root | — | 1 | 62 errors: 58 in `docs/research/fixtures/study_session_reference.py` (outside CI's `ruff check src/ tests/` scope), 4 in `src/`+`tests/` |
| 1.9 | `uv run mypy` | root | — | 2 | `Missing target module` — pyproject has no `files=`; CI runs `mypy src/` |
| 1.10 | `uv run mypy src/` | root | — | 2 | `numpy/__init__.pyi:737: Type statement is only supported in Python 3.12` — config pins `python_version = "3.10"`; the `diagrams` extra pulls numpy stubs that need 3.12. Aborts before checking src |
| 1.11 | `uv run mypy <13 stressed core modules + study/>` | root | — | 1 | 1 error: `study/ask.py:139` `float(Any \| None)` (from `bd84f01`) |
| 1.12 | `uv run python -m pytest services/relay/tests -q` | root | — | 0 | **19 passed** (no funded credential needed) |
| 1.13 | fix: `CalendarView.test.tsx` pins `Date` to 2026-09-22T12:00Z via `vi.useFakeTimers({toFake:["Date"]})` | app/ | — | — | test reads as its fixture intends |
| 1.14 | `vitest run` (re-run) | app/ | — | 0 | **64/64**; also `TZ=Pacific/Auckland` single-file run passes |
| 1.15 | fix: 4 lint errors (`teach_hint.py` unused loop index; `test_teach_hint.py` unused `hint` → now asserted not to contain the spatial diagram, matching the test name; `test_native_messaging_host.py` `l`→`line`; `test_student_write_invariants.py` unused import) | root | — | — | — |
| 1.16 | `uv run ruff check src/ tests/` | root | — | 0 | All checks passed |
| 1.17 | `pytest` on the three touched test files | root | — | 0 | 45 passed |
| 1.18 | fix: `study/ask.py:139` narrowing → `points is not None and points != ""` (same behavior) | root | — | — | — |
| 1.19 | `uv run mypy --python-version 3.12 src/` | root | — | 0 | **Success: no issues found in 68 source files** |
| 1.20 | `pytest tests/core/test_study_ask.py -q` | root | — | 0 | 17 passed |

Part 1: **pass** after inline fixes. The CI `mypy src/` config conflict
(3.10 target vs numpy stubs when the `diagrams` extra is installed) is logged in
REPORT as a finding. Fixing it needs a config choice.

## Phase 2 — synthetic students

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| 2.1 | WebFetch `colorado.edu/aerospace/academics/undergraduates/curriculum` | — | — | — | Sophomore-fall AES codes, titles, and credits (Fall 2024 plan). Recorded in `avery-chen/SOURCES.md` |
| 2.2 | WebFetch `catalog.colorado.edu/courses-a-z/{asen,appm}/` and `/search/?P=…` | — | — | — | **skipped**: course blocks render client-side, so the fetch returned navigation only. Descriptions are generic and labeled as such |
| 2.3 | wrote `tests/fixtures/synthetic-students/{avery-chen,blake-okonkwo}/`, `make_root.py`, `README.md` | root | — | — | Avery: USER, 3 weeks (normal/stale/dense), 4 courses, grades, credit-hours (ASEN2501 deliberately missing), dated fake audit, study packet. Blake: USER.md only |
| 2.4 | `uv run python …/make_root.py avery-chen` | root | — | **1** | `ModuleNotFoundError: canvas_mcp.core`. The `.venv` is in iCloud. iCloud sets `UF_HIDDEN` on `_editable_impl_canvas_mcp.pth`, and Python 3.12 skips hidden `.pth` files. pytest still works through `conftest.py`. **From here on every CLI runs with `PYTHONPATH=src .venv/bin/python`** |
| 2.5 | `PYTHONPATH=src .venv/bin/python …/make_root.py avery-chen` | root | — | 0 | `var/audit-user-roots/avery-chen` |
| 2.6 | `… make_root.py blake-okonkwo` | root | — | 0 | `var/audit-user-roots/blake-okonkwo` (USER.md + empty ledger + standard subdirs) |
| 2.7 | `… make_root.py blake-okonkwo --out "$HOME/Library/Application Support/ProductName/x"` | root | — | 1 | refused: `refusing to write under the real app-support root` |
| 2.8 | `… make_root.py avery-chen --week stale --out var/audit-user-roots/avery-stale` and `--week dense --out …/avery-dense` | root | — | 0 | stale and dense roots built |
| 2.9 | `git status --short` | root | — | 0 | `var/` absent; `tests/fixtures/synthetic-students/` untracked (committable) |

## Part 2 — two-student isolation

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P2.1 | `study import --path …/study-packet.json`, `offer`, `start`, `submit` (seed Avery study events) | root | `--user-root var/audit-user-roots/avery-chen` | 0 | 13 events in `study/events.jsonl` |
| P2.2 | `probes/isolation.py var/audit-user-roots/avery-chen var/audit-user-roots/blake-okonkwo` (sets `DEV_USER_ROOT` to each in turn; appends one Avery ledger row) | root | avery → blake | 0 | Avery markers present in turn, week, ledger, and study. **Blake: 0 markers in all five views.** PASS |
| P2.3 | `study status` | root | `--user-root …/blake-okonkwo` | 0 | packets `[]`, courses `[]`, 0 items, 0 open attempts |
| P2.4 | `find "$HOME/Library/Application Support/ProductName" -newer <audit-start-marker> \| wc -l` | root | — | 0 | **0**: nothing written to the real profile |

Part 2: **pass**.

## Part 3 — inbox and skill router

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P3.1 | `probes/router.py var/audit-user-roots/avery-stale …/avery-dense …/blake-okonkwo` | root | per-root arg | 1 | 18/20 AGENTS.md triggers routed (16 `structured`, 2 `keyword`). **MISS "SSO sync"**: the AGENTS.md index phrase is not in `student-canvas-browser`'s triggers. **MISS "draft a reply for the thermodynamics discussion"**: keyword fallback refuses a 6:4 lead. Skill dirs ↔ index: 15/15 match. No invented due dates. **`Updated:` line never reaches the turn** (`updated_line_in_turn=False` for the stale week) |
| P3.2 | `assemble_turn` volatile dump, stale root | root | avery-stale | 0 | The slice has rows only. `Updated: 2026-09-30` is dropped, so `_SESSION.md` §3 (">2 days → sync") cannot be applied by the model, which is told not to read the full week file |
| P3.3 | `render_teach_hint` do_first: dense week (display dates) vs the same rows with ISO dates vs midterm row moved first | root | avery-dense | 0 | display → `ASEN 2401 Lab 2 pre-lab (WebAssign)` (table row 1); ISO → `APPM 2360 Problem Set 6`; midterm first → **`ASEN 2402 Midterm 1` (9 days out)**. `teach_hint._parse_date` only reads ISO, but sync writes `Oct 6, 11:59 PM MDT` → do-first falls back to table order. **Defect → REPORT (not fixed inline: cross-module due-format contract)** |
| P3.4 | fix: `prompt_assembly.select_inbox_slice` / `_render_rows` carries the week's `Updated:` line into the slice; added `test_inbox_slice_carries_week_updated_line` | root | — | — | — |
| P3.5 | fix: `skills/student-canvas-browser/SKILL.md` adds trigger bullet `SSO sync` (the AGENTS.md index phrase) | root | — | — | — |
| P3.6 | `pytest tests/core/test_prompt_assembly.py tests/core/test_skill_router.py tests/core/test_teach_hint.py tests/core/test_brain_w2.py -q` | root | — | 0 | 39 passed (before the new test); 26 passed for the two files after adding it |
| P3.7 | `probes/router.py` (index phrase `discussion draft` gated; natural variants reported as `info`) | root | stale/dense/blake | 0 | 20/20 index triggers ok. `updated_line_in_turn=True` on stale and dense. Blake: 0 dues. **PASS**. Info: "draft my discussion post" and "help me draft a discussion reply" are still refused as ambiguous |

Part 3: **pass** after inline fixes. The do-first ordering defect stays open in REPORT.
