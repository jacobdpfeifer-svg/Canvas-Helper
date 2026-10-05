# Ideal test system — build spec (from the 2026-10-05 stress run)

Audience: the next agent that turns this audit into a standing harness.

Some of this already exists. The factory, the six probes, and the end-to-end day script were built during this audit (`tests/fixtures/synthetic-students/`) and ran green or produced the findings in [`REPORT.md`](./REPORT.md). Everything else here is a proposal that reuses only tools already in the repo: pytest, `node --test`, Vitest, ruff, mypy, and `uv`. It adds no new service, no new package manager, and no hosted runner.

## 1. Layout and gitignore

```text
tests/fixtures/synthetic-students/        # committed persona SOURCES (no path segment named inbox/)
  <first-last>/USER.md, week*.md, courses/, grades.yaml, credit-hours.yaml, degree-audit.md, study-packet.json, SOURCES.md
  make_root.py                            # factory (exists)
  probes/                                 # one probe per part (exist)
    isolation.py  router.py  learning.py  freshness.mjs  write_guards.py  plugins.mjs  e2e_day.sh
tests/students/                           # PROPOSED: pytest wrappers that call the probes (see §7)
var/audit-user-roots/<root>/              # live roots, rebuilt each run (gitignored)
var/audit-logs/<date>/RUN-LOG.jsonl       # PROPOSED: machine log, one row per command (gitignored)
docs/audits/<topic>-<date>/               # human-written plan, run log, report (committed)
```

Gitignore rules:

- `var/` is ignored (added 2026-10-05). Verify with `git check-ignore -v var/audit-user-roots`.
- `**/inbox/` is already ignored. That is why persona sources must never contain an `inbox/` directory. A file there would silently drop out of git. The factory maps persona files into the `inbox/` layout at run time.
- `/_**` ignores root-level underscore paths, so don't name harness directories `_something` at the repo root.
- Never commit `.env`, `browser/.auth/`, `auth/`, or anything under `~/Library/Application Support/ProductName/`.

## 2. Synthetic-student factory

**Inputs:**

- A persona directory name, auto-discovered: any `tests/fixtures/synthetic-students/*/USER.md`.
- `--week {normal|stale|dense}`.
- `--no-audit`.
- `--out` (default `var/audit-user-roots/<persona>`).

**Output:**

- A root with `canvas_mcp.core.user_root.USER_SUBDIRS` and an empty `ledger.jsonl`.
- `USER.md`, plus a `school_slug` file copied from USER.md's `School slug:` line (mirrors Rust onboarding).
- `inbox/week.md` (the chosen week), `inbox/courses/*.md`, `inbox/grades.yaml`, `inbox/degree-audit.md`, `calibration/credit-hours.yaml`, `fixture-packets/study-packet.json`.

**Safety:**

- Refuses any `--out` under `default_app_support_root()`. Tested; exit 1.
- Wipes and rebuilds the target.
- Never writes feed URLs, tokens, or `auth/*` files.

**Week selection:** `stale` = same rows, `Updated:` more than 2 days before the run date. `dense` = at least 4 deadlines inside 48 h. Due cells must use sync's real display format (`formatDueForDisplay`), never hand-written ISO. That choice is what exposed D1.

**Adding a third persona:**

1. Copy `templates/USER.md` into `tests/fixtures/synthetic-students/<first-last>/USER.md`, keeping every heading.
2. Add only the files the persona needs. Record any public-catalog URL in `SOURCES.md`.
3. Use fictional names, made-up four-digit Canvas IDs, and `canvas.example.invalid` URLs. Never use a real IdentiKey, course ID, or feed URL.
4. Add the persona's leak markers to `probes/isolation.py` `AVERY_MARKERS` (or generalize the list into a per-persona `markers.txt`).

## 3. Per-part gates

Each gate is a probe exit code plus the observable named. All of them ran on 2026-10-05.

| Part | Gate (automated) | Blocks the day |
|---|---|---|
| 1 Suites | `pytest tests/ -q`, `browser npm test`, `app npm test`, `ruff check src/ tests/`, `mypy --python-version 3.12 src/`, `pytest services/relay/tests -q` all exit 0 | Only when a failing file is under `core/{user_root,skill_router,prompt_assembly,study,teach_hint}`, `browser/scripts/lib/freshness*`, or `app/src/views` |
| 2 Isolation | `probes/isolation.py A B` exit 0 (B shows 0 of A's markers in the turn, week, ledger, and study) **and** `find <app-support> -newer <marker>` = 0 | yes |
| 3 Router | `probes/router.py <stale> <dense> <empty>` exit 0: every AGENTS.md index trigger routes to its skill; skill dirs ↔ index match; no due date in the slice is absent from the fixture; `Updated:` present in the turn | yes |
| 4 Learning | `probes/learning.py <copy>` exit 0, plus the `study` CLI cycle: first answer `baseline_response`, same-day re-answer `immediate_practice`, next-day `delayed_independent_retrieval` + stability up | yes for the study rows. The reconcile row is currently red (D1/D2) and is reported, not blocking, until S1 lands |
| 5 GPA/audit | `gpa` term = hand value; what-if moves in the expected direction; `degree_audit` exit 0 with the paste, 1 without it, stale banner at +90 days | no |
| 6 Freshness | `node probes/freshness.mjs` exit 0 (due_changed, instructions_edited, a real tick with 0 network calls, canvasGet GET-only / no CSRF / refuses write paths) | no, but any regression in the canvasGet checks is P0 |
| 7 Write guards | `probes/write_guards.py` exit 0 with Google stubbed (0 calls, 0 success ledger rows) | yes |
| 9 Plugins | `node probes/plugins.mjs` exit 0 | no |

**Bars dropped, and why:**

- *"A requirement-satisfied sentence appears only with the paste."* That sentence is model output. Without a model the harness can only check the inputs (the audit CLI and the skill text), which it does.
- *"The model treats a stale week as stale."* Same reason. The harness checks that `Updated:` reaches the turn.
- *"Home/Study/Plan/Settings render Avery's data."* `npm run dev` cannot read a user root today (S5). Vitest is the automated evidence until a dev-only IPC bridge exists.
- *Part 8 MASTER visual acceptance (§15).* It is a human judgment. Keep only the greppable anti-patterns: `transition: all`, `repeat(3`, `background-clip: text`, `radial-gradient`, and `backdrop-filter` outside `.glass` / `.dock`.

## 4. When the end-to-end day may start

Only after the Part 2, 3, and 7 gates exit 0, and the Part 4 study rows pass. A red Part 1 blocks only when the failure is in one of the day's modules (see the table).

The runner checks the gates in order and writes `SKIP e2e: <part> red` instead of running the day. The day itself is `probes/e2e_day.sh`. It builds its own `e2e-*` roots, so it never depends on state left by earlier probes.

## 5. Human-only, recorded as skips

These are never invoked by the harness:

- CU IdentiKey/MFA (`npm run open-canvas`).
- Live Google or Microsoft OAuth consent.
- Extension install on a real Chrome profile.
- A second device or Canvas account.
- A real mail send or calendar write.

Each appears in the run log as `SKIP human-only: <item> → docs/handoff/pre-ship-human-walk.md row N`. The harness keeps them from hanging:

- Probes must stub the edge: a `fetchImpl` that throws, a Google service stub that records calls, and a `--now` clock.
- Any CLI that could open a browser (`open-canvas`, `check-session`, `rsvp-*`) is on a deny list in the runner.
- Every command runs under `timeout 300`.

## 6. Re-run from a clean checkout (no Jacob, no PAT)

```bash
git switch phase1-productname-pivot
uv sync --group dev --all-extras --inexact          # or: uv pip install -e ".[google,diagrams]"
(cd browser && npm install) && (cd app && npm install)
export PYTHONPATH=src PRODUCTNAME_LLM_API_KEY= PRODUCTNAME_LLM_WRITE_API_KEY=   # PYTHONPATH: see REPORT D3
PY=.venv/bin/python; F=tests/fixtures/synthetic-students; R=var/audit-user-roots

# Part 1
$PY -m pytest tests/ -q && (cd browser && npm test) && (cd app && npm test) \
  && $PY -m ruff check src/ tests/ && $PY -m mypy --python-version 3.12 src/ \
  && $PY -m pytest services/relay/tests -q
# Roots
$PY $F/make_root.py avery-chen && $PY $F/make_root.py blake-okonkwo
$PY $F/make_root.py avery-chen --week stale --out $R/avery-stale
$PY $F/make_root.py avery-chen --week dense --out $R/avery-dense
# Parts 2–9
$PY $F/probes/isolation.py $R/avery-chen $R/blake-okonkwo
$PY $F/probes/router.py $R/avery-stale $R/avery-dense $R/blake-okonkwo
rm -rf $R/avery-learn && cp -R $R/avery-chen $R/avery-learn && $PY $F/probes/learning.py $R/avery-learn
rm -rf $R/avery-fresh && cp -R $R/avery-chen $R/avery-fresh && DEV_USER_ROOT="$PWD/$R/avery-fresh" node $F/probes/freshness.mjs
rm -rf $R/guards && cp -R $R/blake-okonkwo $R/guards && DEV_USER_ROOT="$PWD/$R/guards" $PY $F/probes/write_guards.py
node $F/probes/plugins.mjs
# Day
bash $F/probes/e2e_day.sh
```

Expected today: everything exits 0 except `learning.py`, which exits 1 on the single `[sync format] reconcile` row (D1/D2). When S1 lands, that row turns green with no probe change.

## 7. Proving a regression on one part

Every probe is self-contained. Rebuild only the root it needs with the factory, then run that one probe. For example, after touching `prompt_assembly.py`:

```bash
$PY $F/make_root.py avery-chen --week stale --out $R/avery-stale && $PY $F/probes/router.py $R/avery-stale
```

To keep this from depending on an agent remembering, the next step is a thin pytest wrapper per probe in `tests/students/test_<part>.py`:

- Each wrapper builds roots in `tmp_path` through `make_root.build(...)` instead of `var/`.
- It runs the probe's `main()` (or `subprocess` for the `.mjs` and `.sh` files).
- It asserts exit 0. The reconcile row is `xfail(strict=True)` pointing at D1, so the fix is noticed when it lands.

Then `pytest tests/students -k router` proves one part, CI runs them all with the existing `ruff check src/ tests/` + pytest job, and no new CI service is needed.

## 8. Self-audit of this spec

- Every gate in §3 ran on 2026-10-05 with its command in RUN-LOG. None needs a login.
- The human-only items in §5 are the prompt's hard stops plus `pre-ship-human-walk.md`. None is automated.
- I removed one idea while writing: a hosted dashboard for run history. The repo has no such service, and `var/audit-logs/*.jsonl` plus the committed RUN-LOG are enough.
- §7's pytest wrappers and §5's runner deny list are proposals. Neither exists yet.
