# Test plan — student production stress test, 2026-10-05

Operative prompt: [`docs/handoff/student-production-stress-prompt-2026-10-05.md`](../../handoff/student-production-stress-prompt-2026-10-05.md).
Branch: `phase1-productname-pivot`. No commits. No PAT. No live SSO, OAuth, or extension install.

Written after reading the tree, before any suite ran. Every run below uses
`DEV_USER_ROOT=var/audit-user-roots/<id>` (gitignored, confirmed with
`git check-ignore -v var/audit-user-roots` → `.gitignore:173:var/`).
Every Python CLI runs with `KAIROS_LLM_API_KEY=` and
`KAIROS_LLM_WRITE_API_KEY=` set empty in the environment. `config.py`
calls `load_dotenv()`, and that does not override existing variables, so no
run can reach a live model. The `.env` LLM keys are already blank. Only the key
names were checked, not the values.

## What I learned from the tree that shapes the plan

- **The router is deterministic when no key is set.** `skill_router.route_skill` uses structured trigger phrases first, then embeddings (`_provider_embed` → `get_provider("fast")`, which returns `None` with a blank key), then keyword scoring. `--execute` needs a model. Routing does not.
- **Nothing in code detects a stale week.** Staleness is a skill instruction in `skills/_SESSION.md` §3. `prompt_assembly.assemble_turn` passes the inbox slice through and leaves the `Updated:` line alone. The pass bar checks whether the `Updated:` line reaches the turn, so a model *could* see it is stale.
- **Requirement-satisfied sentences come from the model, not from code.** `degree_audit.py` parses the paste and builds a dated banner. `student-course-plan/SKILL.md` tells the model when it may make Tier-2 claims. The deterministic part I can test is that the audit CLI returns `missing` with exit 1 when there is no paste, and that the assembled turn for Blake has no audit text.
- **The learn loop has two "not a hit" mechanisms.** (a) `confidence_claimed` is recorded but stability only moves on a clock-due delayed outcome. (b) `same_session` blocks stability. The `study` package has its own evidence labels. I need to check both.
- **Commitment states are `met / not_met / dropped`, and nothing marks a commitment started.** The architecture doc and the prompt say "started, kept, or released." That is a vocabulary check and a possible doc-drift finding.
- **The habit count resets to 1 after a gap.** It is stored as `streak:` in `inbox/habit.yaml`. Product rule: exposure only, and the rendered line never names the count. I will check the line, not the stored field.
- **The exam-move remap is `learn_loop.reconcile_from_inbox`.** It remaps only when exactly one checkpoint date moved per course, and otherwise reports `skipped: ambiguous`. I will test both cases.
- **GPA reads `inbox/grades.yaml` (written by sync) plus `calibration/credit-hours.yaml`.** The persona fixtures provide both.
- **The extension Canvas boundary is `app/extension-chrome/lib/canvas-read.js`.** A static grep found no `innerHTML`/`outerHTML`/`insertAdjacentHTML` in extension JS. The prompt's "`browser/scripts/lib/canvas-read`" path does not exist. The browser-side counterpart is `canvas-snapshot.mjs` / `canvas-session.mjs`, which are sync (SSO) readers, not the extension boundary.
- **`.gitignore` has `**/inbox/` and `/_**`.** Persona sources live in `tests/fixtures/synthetic-students/<id>/` with no `inbox/` segment.

## Parts

Legend for "Blocks E2E": **yes** = the end-to-end day does not start while this part is red.

### 1. Environment and suites
1. **Student goal:** none directly. This proves the tree builds before I judge behavior.
2. **Stress:** missing extras, stale assertions, and lint/type drift since the last commits (`bd84f01` Ask path, `2066899` extension).
3. **Commands:** `uv pip install -e ".[google,diagrams]"`, `uv sync --group dev` (or the existing `.venv`), `npm install` in `browser/` and `app/`, then `pytest tests/ -q`, `browser npm test`, `app npm test`, `ruff check .`, `mypy` (pyproject config), and `pytest services/relay/tests -q`.
4. **Pass bar:** every command run and logged. Every failure is either fixed inline and re-run, or recorded as a finding with the part it blocks.
5. **Blocks E2E:** only if a failure lands in a module the day uses (user_root, skill_router, prompt_assembly, study, gpa, freshness).

### 2. Two-student isolation
1. **Student goal:** Avery's data is never shown to Blake, and neither touches Jacob's real profile.
2. **Stress:** the same process reads under two `DEV_USER_ROOT` values. Avery has ledger lines and study events. Blake has only `USER.md`.
3. **Fixture:** the factory builds `var/audit-user-roots/{avery,blake}`. A Python script reads the week, the inbox slice (`prompt_assembly.assemble_turn`), the study status, and the ledger under each root. `find "$HOME/Library/Application Support/Kairos" -newer <marker>` runs before and after.
4. **Pass bar:** Blake's assembled turn and study status contain none of Avery's course codes, titles, or study item IDs. Avery's turn does contain them. No file in the real app-support path is newer than the audit start marker.
5. **Blocks E2E:** yes.

### 3. Inbox and skill router
1. **Student goal:** "plan my week", "what should I do first", and "brief me on ASEN 2001" go to the right skill and use the real due list.
2. **Stress:** a stale week (`Updated:` 2026-09-30, five days old). A dense week (MATH problem set due in under 48 h, plus overlapping writing and lab deadlines). Blake's empty inbox.
3. **Commands:** `python -m canvas_mcp.core.skill_router --json --user-root … "<trigger>"` for each AGENTS.md trigger row, then `assemble_turn` for the three triggers under each week. A script cross-checks the skill directories, the AGENTS.md index, and the `## Triggers` phrases in each SKILL.md.
4. **Pass bar:** each trigger routes to the AGENTS.md skill by the `structured` method, or else the miss is recorded. Every due date in the assembled volatile slice appears in the fixture week, with no invented rows. The stale `Updated:` value is visible in what reaches the model, or its absence is recorded as a finding. Blake's turn has an empty slice. Every skill directory has an index row, and every index row has a directory.
5. **Blocks E2E:** yes (steps 2 and 5 of the day depend on it).

### 4. Study, learn loop, habit, commitment, progress
1. **Student goal:** practice from course text offline. Saying "I know this" does not count as knowing it. Return days get a quiet continuity line. An appointment I made with myself stays mine.
2. **Stress:** a confidence-only claim; a same-session hit; an exam date moved by exactly one date (remap) and by two dates (ambiguous); a legacy learn_loop claim's hit presented as delayed study credit.
3. **Commands:** `python -m canvas_mcp.core.study --user-root … --now … {import,offer,start,submit,status,history}` with a packet from `templates/study-packets/` and Avery's synthetic course packet; `python -m canvas_mcp.core.learn_loop … {add,outcome,due,reconcile}` with frozen `now` via Python where the CLI has no `--now`; `habit show`, `habit.record_brief_day` on consecutive and gapped days; `commitment add/status/resolve`; `progress` read via Python.
4. **Pass bar:**
   - The study session starts from a fixture packet and records an outcome, with no Canvas call. Events go to `{root}/study/events.jsonl`.
   - `confidence_claimed=True` with a clock-not-due hit leaves stability unchanged. A same-session hit leaves stability unchanged.
   - The habit line never names a count. There is no leaderboard or rank anywhere in the habit payload.
   - Commitment add → resolve leaves calendar and connector files unchanged (no `auth/confirm-gcal.json`, no connector ledger rows).
   - Reconcile remaps one moved checkpoint and skips an ambiguous one with a reason.
   - The study projection does not count learn_loop items as `delayed_independent_retrieval`.
5. **Blocks E2E:** yes (step 3).

### 5. GPA, course suggestions, degree audit
1. **Student goal:** "What's my GPA, and what if I get a B?"; "what should I take next?"; "does this count toward my degree?"
2. **Stress:** a course missing from credit-hours; a what-if downgrade; the audit present, then removed; Blake with no audit and no grades.
3. **Commands:** `python -m canvas_mcp.core.gpa --user-root … [--what-if CODE=B]`; `python -m canvas_mcp.core.degree_audit --user-root …` with the file present and with it moved away; the router plus `assemble_turn` for "what should I take next" for Avery and Blake.
4. **Pass bar:** the what-if B lowers GPA when the base is A, by the arithmetic I compute by hand. A missing credit-hours entry is skipped with a reason, not invented. The audit CLI returns a dated banner with the file and exit 1 `missing` without it. Blake gets `missing`. The course-plan skill text forbids requirement claims without the import. The requirement sentence itself is model output, so it is recorded as **not deterministically checkable**.
5. **Blocks E2E:** no (the day has no GPA step), but recorded.

### 6. Freshness and the extension read boundary
1. **Student goal:** "Tell me what changed in Canvas since yesterday" without the app holding my session.
2. **Stress:** a moved due date; edited instructions; a per-course 403; a non-allow-listed path; a POST attempt.
3. **Commands:** `browser npm test` (freshness, extension, and reliability suites); a node script that runs `canvas-changes.mjs` on two snapshots derived from Avery's fixture; `npm run freshness` with `DEV_USER_ROOT` on Avery and no network (fixture deltas only, or record why it cannot); a node script calling `canvasGet` with a stub `fetchImpl` to capture the request options; a grep for HTML sinks in `app/extension-chrome`.
4. **Pass bar:** the diff names `due_moved` and an instruction edit. The 403 lands in `unavailable_endpoints`, per the existing test, re-read in code. `canvasGet` sends `method: "GET"` with no CSRF header and throws on non-allow-listed paths. No HTML sink receives Canvas strings.
5. **Blocks E2E:** no (the day reads the inbox, not the extension), but a write path here would be a P0 defect.

### 7. Write guards
1. **Student goal:** nothing is ever sent to an instructor, and my email and calendar change only when I say yes to one exact preview.
2. **Stress:** call execute with no token; call with a token for different content; check whether permission escalation can reach `automatic`.
3. **Commands:** read `src/canvas_mcp/tools/student_write.py` (and the discussion/comment tools), `mcp-servers/{gmail,gcal,apple-cal}/server.py`, `common/actuator.py`, `core/connector_guards.py`, `core/write_confirmation.py`, and `core/permissions.py`; a Python dry-run of `gate_connector_write` with a monkeypatched Google client that raises if called; the existing `test_connector_guards.py` and `test_actuator_common.py`.
4. **Pass bar:** Canvas-visible tools have no POST branch. The execute path without a confirmation fails closed, and the stub client is never called. `DEFAULT_K` has no `email_send` or `calendar` escalation. Apple Calendar never calls a helper. Gmail and GCal go through `get_connector_guard`.
5. **Blocks E2E:** yes (step 4 of the day must stay local).

### 8. App student surfaces
1. **Student goal:** a calm Home, Study, Plan, and Settings that show my data.
2. **Stress:** `DEV_USER_ROOT` reachable from `vite dev` without Tauri?
3. **Commands:** `cd app && npm test`. Read `vite.config` and the `invoke` bridge to see whether the dev server can read a user root without Tauri. Grep `app/src/**/*.css` for `transition: all`, `backdrop-filter` near study prose, and 3-up `grid-template-columns: repeat(3`.
4. **Pass bar:** Vitest green, or failures triaged. MASTER anti-patterns are checked only where CSS or TSX shows them. If the dev server cannot be pointed at a fixture root, I say so.
5. **Blocks E2E:** no.

### 9. School plugins
1. **Student goal:** CU-specific help without the product RSVPing for me.
2. **Stress:** a registry/directory mismatch; a `CONFIRM=1` RSVP path.
3. **Commands:** a node script comparing `CONNECTOR_REGISTRY` to `plugins/*`; `school-config.mjs` / `tenants.py` loading `schools/cu-boulder.yaml`; reading the RSVP script's guard (no execution).
4. **Pass bar:** the registry and directories match one-to-one, the yaml loads in both languages, and the RSVP execute path is documented as a CLI escape hatch (pre-ship walk row 8) and was not run.
5. **Blocks E2E:** no.

### 10. Pivot regression spot-checks
These are written in RUN-LOG with file paths: a study session with no PAT, freshness with no server session, whether the Ask/next-step/residue loop exists in code, preview-only tools, and the MASTER CSS status.

## End-to-end day gate

The day starts only when parts 2, 3, 4, and 7 are green. Part 1 counts as blocking only for failures in the modules the day uses. Steps: profile → dense brief → study session → local plan action → profile read → switch to Blake. Commands are recorded in RUN-LOG.
