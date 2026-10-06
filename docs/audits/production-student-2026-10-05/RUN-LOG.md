# Run log — student production stress test, 2026-10-05

Repo root = `Canvas Competition/` (iCloud checkout). Branch `phase1-productname-pivot`.
All Python runs had `KAIROS_LLM_API_KEY=` and `KAIROS_LLM_WRITE_API_KEY=`
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
| 0.4 | `grep -oE '^[A-Z_]+=' .env` + count of non-empty `KAIROS_LLM_API_KEY` | root | — | 0 | key names only; LLM key blank (count 0). Values not read |

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
| 2.7 | `… make_root.py blake-okonkwo --out "$HOME/Library/Application Support/Kairos/x"` | root | — | 1 | refused: `refusing to write under the real app-support root` |
| 2.8 | `… make_root.py avery-chen --week stale --out var/audit-user-roots/avery-stale` and `--week dense --out …/avery-dense` | root | — | 0 | stale and dense roots built |
| 2.9 | `git status --short` | root | — | 0 | `var/` absent; `tests/fixtures/synthetic-students/` untracked (committable) |

## Part 2 — two-student isolation

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P2.1 | `study import --path …/study-packet.json`, `offer`, `start`, `submit` (seed Avery study events) | root | `--user-root var/audit-user-roots/avery-chen` | 0 | 13 events in `study/events.jsonl` |
| P2.2 | `probes/isolation.py var/audit-user-roots/avery-chen var/audit-user-roots/blake-okonkwo` (sets `DEV_USER_ROOT` to each in turn; appends one Avery ledger row) | root | avery → blake | 0 | Avery markers present in turn, week, ledger, and study. **Blake: 0 markers in all five views.** PASS |
| P2.3 | `study status` | root | `--user-root …/blake-okonkwo` | 0 | packets `[]`, courses `[]`, 0 items, 0 open attempts |
| P2.4 | `find "$HOME/Library/Application Support/Kairos" -newer <audit-start-marker> \| wc -l` | root | — | 0 | **0**: nothing written to the real profile |

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

## Part 4 — study, learn loop, habit, commitment, progress

All runs below used `PYTHONPATH=src`, the `.venv/bin/python` interpreter, and blank LLM keys.

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P4.1 | `study --user-root var/audit-user-roots/avery-chen --now 2026-10-05T15:00:00Z import --path …/study-packet.json` | root | avery-chen | 0 | `{"ok":true,"packet_id":"AVERY-ODE","items":1,"sources":2}` |
| P4.2 | `study … offer --minutes 5` | root | avery-chen | 0 | offer AV-1, "First encounter: this answer sets a baseline" |
| P4.3 | `study … start --item AV-1` then `submit --fields '{"product":"-6"}' --self-outcome correct` | root | avery-chen | 0 | outcome `correct`, grader `deterministic`, evidence **`baseline_response`**; next independent check no earlier than 2026-10-06T15:00Z |
| P4.4 | the same item again at `--now 2026-10-05T15:10:00Z` | root | avery-chen | 0 | `correct immediate_practice`, stability `fragile`, hits 0 |
| P4.5 | the same item at `--now 2026-10-06T16:00:00Z` | root | avery-chen | 0 | `correct delayed_independent_retrieval`, stability **`holding`**, hits 1 |
| P4.6 | read `study/reducer.py` evidence ladder | — | — | — | `student_self` (self-grade on an abstained checker) → always `unverified_response`. A confidence claim cannot become delayed credit |
| P4.7 | `cp -R avery-chen avery-learn; probes/learning.py var/audit-user-roots/avery-learn` | root | avery-learn | 1 | 10/11 ok. A confidence hit before the check leaves stability unchanged. A same-session hit leaves it unchanged. Reconcile remaps ISO `2026-10-12 → 2026-10-14`. An ambiguous move is skipped with a reason. Habit lines never name a count. No rank/leaderboard field. Commitment add→resolve leaves `auth/` and the ledger untouched. A legacy delayed hit leaves study stability unchanged. **FAIL: reconcile with the checkpoint written in sync's format (`due Oct 16, 7:00 PM MDT`) → `updated=0, remaps=[], skipped=[]` — silent, not an honest refusal** |
| P4.8 | `grep commitment_started\|commitment_kept` over `src app/src app/src-tauri/src` | root | — | 0 | Only declared in `progress.WORKFLOW_KINDS`. No writer. Commitment statuses are `open/met/not_met/dropped` |

Part 4: the **study-session bars pass**. The **exam-move bar fails on real sync format** (open defect). The day runs anyway, because it never calls `learn_loop.reconcile`. That judgment is recorded in REPORT.

## Part 5 — GPA, course suggestions, degree audit

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P5.1 | `python -m canvas_mcp.core.gpa --user-root var/audit-user-roots/avery-chen` | root | avery-chen | 0 | term GPA **3.67** = (3.7·4 + 4.0·3 + 3.3·3)/10, matching hand arithmetic. ASEN2501 skipped: "letter grade unavailable (percent 90.5)". `missing_credit_hours: [ASEN2501]`. Labeled "local estimate … not official" |
| P5.2 | `… --what-if ASEN2401=B` | root | avery-chen | 0 | what-if **3.37** = (14.8 + 9.0 + 9.9)/10. Lower, as expected |
| P5.3 | `… --what-if "ASEN 2501=A-"` | root | avery-chen | 0 | still 3.67. The skip reason becomes "missing credit hours" (hours never invented) |
| P5.4 | `… gpa --user-root var/audit-user-roots/blake-okonkwo` | root | blake | 0 | term `null`, no rows. No invented GPA |
| P5.5 | `python -m canvas_mcp.core.degree_audit --user-root …/avery-chen` | root | avery-chen | 0 | banner "As of 2026-09-28 (catalog year 2025-2026) — confirm in Buff Portal before registering", remaining 96, sections complete/in_progress/unmet |
| P5.6 | the same with `inbox/degree-audit.md` moved away | root | avery-chen | 1 | `{"error":"missing"}` |
| P5.7 | the same for Blake | root | blake | 1 | `{"error":"missing"}` |
| P5.8 | `load_degree_audit(today=2027-01-15)` | root | avery-chen | 0 | `stale: True`, "As of 2026-09-28 (stale — >90 days), confirm every requirement claim…" |
| P5.9 | route + `assemble_turn("what should I take next")` for Avery and Blake | root | each | 0 | both → `student-course-plan`. The skill body contains "Never infer requirements from Canvas alone". No audit text is pre-injected for either (the skill tells the model to run the CLI). **The requirement-satisfied sentence is model output and cannot be checked without a model** |

Part 5: **pass** on everything deterministic.

## Part 6 — freshness and the extension read boundary

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P6.1 | `npm test` (browser; includes `freshness`, `extension`, `canvas-reliability`) | browser/ | unset | 0 | 219/219 (see 1.6) |
| P6.2 | read `canvas-snapshot.mjs` `grab()` and tests "records a tab hidden from students…" / "still fails a throttled 403" | — | — | — | A 403 `{"status":"unauthorized"}` → `unavailable_endpoints`. A throttle 403 still fails. **A per-course 404 is set to ok with no record** (observation) |
| P6.3 | `cp -R avery-chen avery-fresh; DEV_USER_ROOT=… node probes/freshness.mjs` | root | avery-fresh | 0 | 11/11. `due_changed` 10-13→10-15. `instructions_edited` ("…and reply to two classmates"). First sync emits nothing. A fixture extension delta goes through the real `runFreshnessTick`: `deltas_processed 1`, network calls 0. The dashboard digest extracts "Midterm 1 is now Wednesday, Oct 14 at 7 PM." No `auth/feeds.json` is created. `canvasGet` sends `{method:"GET",credentials,headers:{Accept},redirect}`, with no CSRF header and no body. Submissions, discussion entries, conversations, and `..` paths are refused before fetch. A non-Canvas base is refused |
| P6.4 | `grep -rn "innerHTML\|outerHTML\|insertAdjacentHTML\|srcdoc\|DOMParser\|dangerouslySetInnerHTML" app/extension-chrome app/src` | root | — | 1 | no matches outside tooling. The extension renders with `textContent` (dashboard.js 6, panel.js 9 uses) |
| P6.5 | `grep "fetch(" app/extension-chrome` (excluding `tools/`) | root | — | 1 | none. `sw.js` reaches Canvas only through `lib/canvas-read.js` |
| P6.6 | dashboard `agent_can_do` | — | avery-fresh | — | `[]` (only calendar suggestions are eligible; none queued) |

Part 6: **pass**.

## Part 7 — write guards

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P7.1 | read `src/canvas_mcp/tools/student_write.py`, `discussions.py`, `messaging.py` | — | — | — | `submit_assignment`, `comment_on_my_submission` `readOnlyHint=True`, only `"get"` requests. `post_discussion_entry`/`reply_to_discussion_entry` GET the topic only. The only PUTs are `mark_module_item_done` (self) and `mark_conversations_read` (self) |
| P7.2 | read `permissions.py` | — | — | — | `ALWAYS_GATED` contains `calendar`, `email_send`. `automatic` is clamped at load (l.206/221) and at resolve (l.285). `DEFAULT_K` has neither |
| P7.3 | `cp -R blake-okonkwo avery-guards; DEV_USER_ROOT=… probes/write_guards.py` (Google service and every send/create/update function stubbed to record) | root | avery-guards | 0 | 14/14. `send_email` without a token → preview. Forged token → "malformed". Token for different content → "does not match… Nothing was sent". A hand-written `posture: automatic` for email_send/calendar resolves to `gated` and still previews. GCal `create_event`/`update_event` → preview. Forged → blocked. App-side `connectors.gcal_confirm_event` rejects edited content and burns the token (no revert-replay). Apple `create_event` is blocked even with a token, and no `EventKitHelper` exists. 0 ledger success rows. **0 Google calls** |
| P7.4 | (first run of P7.3) | root | avery-guards | 1 | one FAIL from the probe's own substring check ("sent" matched inside the error text). Check tightened to `"status": "sent"`, re-run → pass |

Part 7: **pass**. No mail was sent and no calendar event was created.

## Part 8 — app student surfaces

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P8.1 | `npm test` (Vitest) | app/ | unset | 0 | 64/64 (after 1.13) |
| P8.2 | read `app/src/ipc.ts`, `app/src/dev/fixtures.ts` | — | — | — | Outside Tauri every IPC returns empty, or a **hardcoded** dev fixture when `?fixture=1` (TODAY 2026-09-22). **`npm run dev` cannot be pointed at `DEV_USER_ROOT`**, so no screen was rendered with Avery's data. Component tests are the evidence |
| P8.3 | `grep` `app/src/**/*.css,*.tsx` for MASTER §12 anti-patterns | root | — | — | `transition: all` 0. `repeat(3` 0. `background-clip:text` 0. `radial-gradient` 0. `backdrop-filter` only on `.glass` (voice sheet, commitment sheet, item popups, palette, legal modal) and the parked `.dock`, never on study prose. `prefers-reduced-motion` in both stylesheets. Infinite animation only on loading skeletons. Radii tokens are used 24× but raw px radii remain (999px pills, 6/8/10/12/20px). The brief-continuity line is wired as `streakLine` in `PlanView`/`Top3Sticky` (internal name only; the rendered copy is "Brief continuity: …") |

Part 8: **pass with limited evidence** (no rendered screen with fixture data).

## Part 9 — school plugins

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P9.1 | `node probes/plugins.mjs` | root | — | 0 | registry `cu-boulder/campusgroups (A, web) → plugins/cu-boulder-campusgroups`. Directories ↔ registry 1:1. `getSchoolConfig("cu-boulder")` loads |
| P9.2 | `python -c "load_school('cu-boulder')"` | root | — | 0 | `SchoolConfig cu-boulder America/Denver` |
| P9.3 | read `plugins/cu-boulder-campusgroups/rsvp-campusgroups.mjs` header | — | — | — | Preview by default. `--confirm` must be typed by the operator (pre-ship walk row 8: documented CLI escape hatch). **Not executed** |

Part 9: **pass**.

## Part 10 — pivot regression spot-checks

- **A study session from local course text, no PAT?** Yes. The P4.1–P4.5 import/offer/start/submit cycle ran from `fixture-packets/study-packet.json` with no Canvas token or session (`src/canvas_mcp/core/study/{service,reducer,checkers}.py`).
- **Freshness on fixtures with no server-side session?** Yes. The P6.3 `runFreshnessTick` processed an extension delta with `fetchImpl` throwing and 0 network calls (`browser/scripts/lib/freshness-run.mjs`). No feed secret existed or was created.
- **Does the student-workflow loop (ask → next step → residue) exist in code?** Partly.
  - **Ask:** `src/canvas_mcp/core/study/ask.py` classifies job and boundary (`classify`), selects context with source labels and freshness (`select_context`), builds a plan (`build_plan`), and returns one `next_action` (`compose_response` / `_next_action`). The app calls it through `study … run {"cmd":"ask-create"}`. WebAssign questions are classified `boundary: external_tool` with "open the tool yourself."
  - **Without the funded relay:** an ordinary homework Ask returns no answer text, only "Connect the relay when you want the model to write the sentences inside this plan" (P10.1).
  - **Residue:** `create-item` exists as a separate command, but no Ask response offers "save correction / parallel / retrieval check" as an action.
  - **Course matching:** Ask matches courses only through `inbox/study-sources/*.json` (`canvas.list_course_records`). With a hinted "APPM 2360" and Avery's imported APPM packet it reported "No course source matched".
- **Do the canvas-focus preview-only tools still have no execute path?** Yes. See P7.1: only `"get"` in submit/comment/discussion tools (`src/canvas_mcp/tools/student_write.py:330,437,467`; `discussions.py:789,840`). `tests/security/test_student_write_invariants.py` passes.
- **Which MASTER rules are in CSS?** In: material/color tokens, five themes, `--signal-*` families, role radii tokens (`--radius-stage/sheet/control/row`), `--motion-*` tokens, glass limited to temporary chrome, reduced-motion fallbacks (`app/src/styles.css`, `app/src/spatial.css`). Open (per `docs/architecture.md` "steps 3–8 open"): stage recomposition, rails/ledgers, motion verbs on state, texture, and the geometry re-audit. Raw px radii are still present (P8.3).

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| P10.1 | `echo '{"cmd":"ask-create","params":{"content":"For PS6 problem 3 … Is the origin a saddle? …","course_hint":"APPM 2360","session_goal":"answer_now"}}' \| study --user-root …/avery-chen --now 2026-10-05T15:20:00Z run` | root | avery-chen | 0 | job `explain`, boundary `open_practice`, course `None`. Context: student input + "General knowledge — No course source matched". Response: "Connect the relay…". Next action: "Use this result on the problem in front of you" |
| P10.2 | the same for "What is the answer to question 4 on the Lab 2 pre-lab in WebAssign?" with `canvas.lti=true` | root | avery-chen | 0 | job `solve`, boundary **`external_tool`**, "You operate WebAssign… yourself". Next: "Work a parallel example or open the tool yourself" |

## Phase 4 — end-to-end day (Avery, then Blake)

Gate: Parts 2, 3, and 7 are green, and so are Part 4's study bars. Part 4's reconcile bar is red, but no day step calls `learn_loop.reconcile`. The day ran.

Script (repeatable from a clean checkout, no Jacob, no PAT, no model):

```bash
bash tests/fixtures/synthetic-students/probes/e2e_day.sh
```

It builds `var/audit-user-roots/e2e-{avery,blake}` with the factory (`--week dense` for Avery). Then:

1. `load_learning_profile(root)` + USER.md identity check.
2. `route_skill("what should I do first")` → `assemble_turn` + `render_teach_hint(now=2026-10-05T15:00Z)`.
3. `study import` → `start --item AV-1` → `submit --fields '{"product":"-6"}'`.
4. `commitment add …` and `study run {"cmd":"ask-create", … "session_goal":"make_handle"}`, comparing ledger bytes and the `auth/` file count before and after.
5. `school_slug` file + USER.md slug + `habit.brief_timezone(root)`.
6. `DEV_USER_ROOT=e2e-blake`: week, study status, asks, commitments, and the inbox slice are scanned for Avery markers.

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| E.1 | `bash …/e2e_day.sh` (first run) | root | e2e-avery / e2e-blake | 1 | 5/6. Step 2 failed on the script's own filter (it counted the `do_first:` hint line as a WebAssign table row). Filter fixed to table rows |
| E.2 | `bash …/e2e_day.sh` | root | e2e-avery / e2e-blake | 0 | **6/6**. (1) profile loads. (2) `student-task-brief`, do_first **`ASEN 2401 — Lab 2 pre-lab (WebAssign)`** due Oct 6 (inside 48 h, but chosen by table order; see the do-first defect); WebAssign rows carry `bucket:B … never auto`; the `_SESSION.md` process-help rule is in the system prompt; `Updated: 2026-10-05` is in the slice. (3) `correct / deterministic / baseline_response`. (4) commitment saved; Ask job `make_handle`, next "Revise the draft, then submit it yourself if Canvas needs a file"; ledger 0→0 bytes; 0 auth files. (5) USER.md `cu-boulder`, `school_slug` `cu-boulder`, timezone America/Denver, no Blake text. (6) Blake: no week, packets `[]`, 0 asks, no commitment, 0 Avery markers |

## Closing checks

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| C.1 | `pytest tests/ -q` | root | unset | 0 | **835 passed**, 19 skipped (+1 new test) |
| C.2 | `npm test` | browser/ | unset | 0 | 219/219 |
| C.3 | `npm test` | app/ | unset | 0 | 64/64 |
| C.4 | `ruff check src/ tests/` | root | — | 0 | All checks passed (includes the new probes) |
| C.5 | `mypy --python-version 3.12 src/` | root | — | 0 | no issues in 68 files |
| C.6 | `pytest services/relay/tests -q` | root | — | 0 | 19 passed |
| C.7 | `find "$HOME/Library/Application Support/Kairos" -newer <marker> \| wc -l` | root | — | 0 | **0** |
| C.8 | `git status --short` | root | — | 0 | no `var/` paths. Changes listed in REPORT §3 |

## Re-verification — 2026-10-06

The working tree had an uncommitted 17:34 rewrite of all four audit files. It said the learning probe still failed and the end-to-end day never ran, contradicting `60d350b`. It also had untracked `avery/` and `blake/` persona folders that `make_root.py` would discover as extra personas. All of that was moved to `git stash` ("stale 2026-10-05 17:34 rewrite …") so the committed record is the one in the tree. Recover it with `git stash pop` if needed.

| # | Command | cwd | DEV_USER_ROOT | Exit | Result |
|---|---|---|---|---|---|
| R.1 | `bash …/probes/e2e_day.sh` | root | e2e-avery / e2e-blake | 0 | 6/6. do_first is now `APPM 2360 — Problem Set 6` due Oct 6, chosen by date, not table order |
| R.2 | `probes/learning.py var/audit-user-roots/avery-chen` (before fix) | root | avery-chen | 1 | **FAIL** `[sync format] … 'Oct 16, 7:00 PM MDT'`: `updated=0, remaps=[], skipped=[]`. D2 was only half fixed; see REPORT D2 |
| R.3 | same, after the `parse_day` fix | root | avery-chen | 0 | PASS. Legacy `Oct 16` remaps 10-14→10-16, and token `<!-- due:2026-10-18 -->` remaps 10-16→10-18 |
| R.4 | `isolation.py`, `router.py`, `write_guards.py`, `freshness.mjs`, `plugins.mjs` | root | avery-chen / blake-okonkwo | 0 | all PASS |
| R.5 | `pytest tests/ -q`; browser `npm test`; app `npm test`; `ruff check src tests`; `mypy --python-version 3.12 src/` | root | unset | 0 | **840 passed**, 19 skipped; 220/220; 64/64; clean; no issues in 68 files |
| R.6 | `.venv/bin/python -m canvas_mcp.core.study --help` (checkout) vs the same in the `native-mirror.sh` mirror venv | root / mirror | — | 1 / 0 | D3 confirmed iCloud-only: checkout `.pth` is `hidden`; the mirror's is not |
| R.7 | `scripts/native-mirror.sh cargo check --locked` | mirror app/src-tauri | — | 0 | Tauri shell builds (2 warnings) |
