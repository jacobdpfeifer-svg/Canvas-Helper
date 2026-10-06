# Report — student production stress test, 2026-10-05

Branch `phase1-productname-pivot`. Nothing was committed. There was no PAT, live SSO, OAuth, or extension install. No model was called.
Every command, exit code, and one-line result is in [`RUN-LOG.md`](./RUN-LOG.md). The plan is in [`TEST-PLAN.md`](./TEST-PLAN.md).

## 1. What ran

| Part | Command or fixture | Result |
|---|---|---|
| 1 Environment and suites | `uv pip install -e ".[google,diagrams]"`, `uv sync --group dev`, `npm install` ×2, then pytest, browser `npm test`, app `npm test`, `ruff`, `mypy`, relay pytest | **Pass after inline fixes.** At the start: pytest 834/834, browser 219/219, relay 19/19, app 63/64, `ruff src tests` 4 errors, `mypy src/` aborted. At the end: 835, 219, 64/64, 19, ruff clean, mypy clean at `--python-version 3.12` |
| 2 Two-student isolation | `probes/isolation.py` over `var/audit-user-roots/{avery-chen,blake-okonkwo}`; app-support `find -newer` | **Pass.** Blake sees 0 Avery markers in the turn, week, ledger, and study. 0 writes to the real profile |
| 3 Inbox and skill router | `probes/router.py` over the stale, dense, and Blake roots | **Pass after inline fixes.** 20/20 AGENTS.md triggers route. 15/15 skill dirs ↔ index. No invented dues. The stale `Updated:` now reaches the turn |
| 4 Study, learn loop, habit, commitment, progress | `study` CLI cycle with `--now`; `probes/learning.py` | **Pass after due-date fix.** The exam-move bar now passes on the real sync format |
| 5 GPA, suggestions, degree audit | `gpa` CLI (+ what-if), `degree_audit` CLI with the audit present/removed/stale, course-plan turn | **Pass on everything deterministic.** The requirement-satisfied sentence is model output and is not checkable without a model |
| 6 Freshness and extension boundary | browser suites; `probes/freshness.mjs` (real tick, no network); HTML-sink grep | **Pass** |
| 7 Write guards | code read; `probes/write_guards.py` with Google stubbed | **Pass.** 14/14. 0 Google calls. No mail, no event |
| 8 App surfaces | Vitest; IPC/dev-fixture read; MASTER §12 CSS grep | **Pass, limited evidence.** The dev server cannot read a `DEV_USER_ROOT` |
| 9 School plugins | `probes/plugins.mjs`; `load_school('cu-boulder')` | **Pass.** RSVP not executed |
| 10 Pivot spot-checks | see RUN-LOG Part 10 | Answered with paths |
| End-to-end day | `bash tests/fixtures/synthetic-students/probes/e2e_day.sh` | **Ran, 6/6.** The gate judgment is in §3 under D2 |

## 2. What worked

These are behaviors I saw, as a student would meet them:

- **Avery practiced offline.** Import, offer, start, and answer ran with no Canvas login.
  - The first correct answer was labeled *"First answer in this app: a baseline, not evidence of retention."*
  - A re-answer ten minutes later was `immediate_practice` with no credit.
  - The next day's correct answer was the only one that moved the item `fragile → holding`.
  - Saying "I know this" (`confidence_claimed`, or a self-grade) never moved stability.
- **GPA was right and honest.** It reported 3.67, and "what if I get a B in Statics" gave 3.37, both matching hand arithmetic.
  - A course with no letter grade, or no credit hours on file, was skipped with a stated reason, never guessed.
  - Blake got no number.
- **Degree claims were tied to the paste.** With Avery's dated paste, the audit tool said *"As of 2026-09-28 (catalog year 2025-2026) — confirm in Buff Portal before registering."*
  - With the file removed, and for Blake, it said `missing`.
  - Past 90 days it downgraded to the stale banner.
- **Canvas changes surfaced without a session.**
  - A moved midterm and edited discussion instructions were both detected.
  - An announcement delta became the digest action *"Midterm 1 is now Wednesday, Oct 14 at 7 PM."* with zero network calls.
- **Nothing reached an instructor or a classmate.** Submit, comment, and discussion tools only GET.
  - Gmail send and Calendar create/update previewed first. They refused forged or mismatched tokens, and refused a hand-edited "automatic" posture.
  - Apple Calendar refused even with a token.
- **External tools got process help.**
  - A WebAssign question in the Ask path was classified `external_tool`, with "Work a parallel example or open the tool yourself."
  - WebAssign rows in the brief carry `bucket:B … never auto`, alongside the `_SESSION.md` rule.
- **Two students stayed separate.** Blake's root stayed empty through Avery's whole morning, including a ledger row, study events, an Ask, and a commitment.

## 3. What must be fixed

### Defects

**D1 — RESOLVED.** Sync now keeps the readable local-time value and attaches an invisible canonical local-day token (`<!-- due:YYYY-MM-DD -->`). Python uses one shared parser, with a legacy display fallback keyed by `Updated:`. This fixes do-first ordering, due-by filtering, quiz spacing, checkpoint coverage, and review reconciliation.

`browser/scripts/lib/canvas-session.mjs` `formatDueForDisplay` writes the `week.md` Due column and the course `## Checkpoints` lines as `Oct 6, 11:59 PM MDT`. Every Python consumer takes the first 10 characters and parses them as ISO, and none of them warns when that fails:

| Consumer | Student impact (observed) |
|---|---|
| `teach_hint._do_first_row` / `_parse_date` (`src/canvas_mcp/core/teach_hint.py:252,468`) | "What should I do first" = the first table row. With the midterm row first, do-first became a midterm 9 days out. With ISO dates, the same rows pick the 30-point problem set (RUN-LOG P3.3) |
| `teach_hint._soonest_quiz` / `_spacing_line` | The mid-window self-check before an exam is never scheduled (the quiz date never parses) |
| `learn_loop._parse_checkpoint_dates` → `reconcile_from_inbox` (`learn_loop.py:467`) | A moved exam never remaps review dates. The post-sync call in `sync-canvas-canonical.mjs:243` returns `updated=0, skipped=[]`: silent, not an honest refusal (P4.7) |
| `learn_loop._upcoming_checkpoints` and related (`learn_loop.py:830–1038`) | The coverage clock and the due-review checkpoint match lose their dates |
| `prompt_assembly._metadata_hits` `due_on_or_before` (`prompt_assembly.py:256`) | "What's due by 2026-10-06" narrows an ISO week to the matching rows but returns the whole table for the synced format |

The implementation is in `core/dates.py`, `teach_hint.py`, `learn_loop.py`, `prompt_assembly.py`, `canvas-session.mjs`, and the canonical week adapter. Targeted coverage includes both legacy display text and sync-generated tokens.

**D2 — RESOLVED.** The exam-move remap now honors the documented contract on real sync-shaped checkpoint text. The synthetic learning probe passes after the fix.

*Re-verified 2026-10-06: only half resolved at commit `60d350b`.* Lines that carry the sync token remapped. The legacy fallback did not. `dates.parse_day` took the first `Word N` pair on the line, so in `**Midterm 1** — due Oct 16, …` it read "Midterm 1", rejected "Mid" as a month, and returned `None`. A numbered exam title in an untokened course file still remapped nothing, silently (`probes/learning.py` failed `updated=0, skipped=[]`). The committed unit test missed it because its title was a bare "Midterm" and its line also carried the token. Fixed: `parse_day` now scans every match and accepts exact month names only (`january`…`december`, three-letter forms, `sept`). New tests: `test_parse_day_skips_numbered_titles_before_the_due_day` and `test_reconcile_from_inbox_reads_legacy_display_with_numbered_title`. The probe now checks the legacy and token formats separately, and both pass (RUN-LOG R.3).

`docs/architecture.md` says reconcile "remaps `checkpoint_due`/schedule when a synced exam/quiz date moves." The parser now recognizes the sync token and the legacy display fallback, and the reconciliation test covers a moved display-form checkpoint.

**D3 — `python -m canvas_mcp…` fails in this checkout outside pytest.** *Medium for the next agent and for daemon calls from an iCloud checkout. Not a student-machine issue if the app ships its own interpreter.*

iCloud sets `UF_HIDDEN` on `.venv/lib/python3.12/site-packages/_editable_impl_canvas_mcp.pth`, and Python 3.12 skips hidden `.pth` files. So `uv run python -m canvas_mcp.core.study …` raises `ModuleNotFoundError` even though pytest works (pytest goes through `conftest.py`). Every audit CLI here ran with `PYTHONPATH=src`. This is a sibling of the native-build EPERM issue documented for `scripts/native-mirror.sh`. Proposal: have `CLAUDE.md` Commands and any Tauri dev-mode spawn set `PYTHONPATH=src`, or run from the mirror.

*Re-verified 2026-10-06: confirmed iCloud-only.* In the checkout the `.pth` file still shows `hidden` (`ls -lO`) and `python -m canvas_mcp.core.study --help` exits 1. In the native mirror (`scripts/native-mirror.sh`, `~/.cache/kairos-build`), a fresh `uv venv` + `uv pip install -e .` leaves the same `.pth` file unflagged, and the same command exits 0 with no `PYTHONPATH` (RUN-LOG R.6). A student's Mac hits this only if the brain runs from an iCloud-synced folder. Still open for this checkout.

**D4 — CI `mypy src/` cannot run once the `diagrams` extra is installed.** *Low.*

`pyproject.toml` pins `python_version = "3.10"`, and numpy's stubs use 3.12 `type` statements, so mypy aborts before checking `src/` (RUN-LOG 1.10). CI passes only because it does not install numpy. The fix needs a choice: raise `python_version`, or add `follow_imports = skip` for numpy. Left open.

**D5 — The keyword router refuses ordinary phrasings of the discussion skill.** *Low.*

"Draft my discussion post" and "help me draft a discussion reply" route to nothing (6:4 and 7:5 keyword leads fall under `KEYWORD_AMBIGUOUS_RATIO = 0.5`). The declared trigger "discussion draft" works. With an embedding key set this may resolve differently, but this audit ran without one. Adding natural trigger bullets to `canvas-discussion-facilitator` is cheap. I left it, because trigger wording is product copy.

**D6 — Ask gives no answer text without the funded relay, and ignores local course notes.** *Medium for the "useful every day" promise, not a boundary issue.*

- `study/ask.py` returns "Connect the relay when you want the model to write the sentences inside this plan" for an ordinary homework question (P10.1).
- `select_context` matches courses only through `inbox/study-sources/*.json`. Avery's hinted "APPM 2360", her `inbox/courses/APPM2360.md`, and her imported APPM packet all produced "No course source matched."
- Commit `bd84f01`'s subject ("Answer ordinary homework through a local Ask path") overstates the offline behavior.

**Observations (not defects):**

- A per-course **404** in `canvas-snapshot.mjs grab()` is set to `ok` with no `unavailable_endpoints` row, so a genuinely missing endpoint is invisible in sync health.
- Gmail `send_email` in dry-run mode (no Google service) returns `{"status":"sent","mode":"dry-run"}` and writes a `success` ledger row for a message that was never sent. Any UI reading `status` must also read `mode`.
- `SCHOOL_SLUG` from the repo `.env` overrides `{user_root}/school_slug` in `habit._school_timezone_name`. That is harmless with one school, but wrong for a second school on the same machine.

### Fixed inline (each re-run to prove it)

| File | Before → after |
|---|---|
| `.gitignore` | `var/` was not ignored → `var/` added (audit roots never reach git) |
| `app/src/views/CalendarView.test.tsx` | The test depended on the wall clock being before 2026-09-22 → `Date` pinned to 2026-09-22T12:00Z (64/64, and also under `TZ=Pacific/Auckland`) |
| `src/canvas_mcp/core/teach_hint.py` | Unused `enumerate` index (ruff B007) → plain loop, same behavior |
| `tests/core/test_teach_hint.py` | Unused `hint` (F841) → now asserted to lack the spatial diagram, which is what the test name says |
| `tests/core/test_native_messaging_host.py` | Ambiguous `l` (E741) → `line` |
| `tests/security/test_student_write_invariants.py` | Unused `get_config` import (F401) → removed |
| `src/canvas_mcp/core/study/ask.py:139` | `float(Any \| None)` mypy error from `bd84f01` → explicit `is not None and != ""`, same behavior |
| `src/canvas_mcp/core/prompt_assembly.py` | The inbox slice dropped `Updated:`, so the `_SESSION.md` ">2 days → sync" rule could not fire → the slice carries `Updated: <date>`. New test `test_inbox_slice_carries_week_updated_line` |
| `skills/student-canvas-browser/SKILL.md` | The AGENTS.md index phrase "SSO sync" did not route → trigger bullet added |

New files (no product code): `tests/fixtures/synthetic-students/**` (personas, `make_root.py` factory, `probes/*`, README) and the four `docs/audits/production-student-2026-10-05/*` files.

### Confirmed intentional (not bugs)

- Canvas submit, submission comment, and discussion post/reply are preview-only, with GET only and no confirm-then-execute branch. The two PUTs that exist are self-only (`mark_module_item_done`, `mark_conversations_read`).
- Gmail send and GCal create/update execute only after a per-instance token bound to the exact content. `ALWAYS_GATED` clamps a hand-written `automatic`.
- Apple Calendar is hard-blocked, and no EventKit helper exists.
- The extension uses GET through four allow-listed paths, sends no CSRF header, and renders with `textContent` only.
- No feed URL was created or read. `auth/feeds.json` was absent in every root.
- Brief continuity is exposure only. The rendered line never names a count. The stored `streak` key is internal.
- Commitments are student-scored, local, and write no calendar, ledger, or connector state.
- Course suggestions are advisory. Requirement claims cite the dated paste only.
- CampusGroups RSVP needs a typed `--confirm` (pre-ship walk row 8). It was not run.

## 4. Structural improvements

**S1 — Completed: one due-date contract between sync and the brain.**
- Sync keeps the human-readable Due value and adds `<!-- due:YYYY-MM-DD -->`.
- Python consumers use the shared `dates.parse_day` helper; older display-only values use the surrounding `Updated:` year.
- Tests cover the browser token, do-first/due-by parsing, and moved checkpoint reconciliation.

**S2 — Fail loud when a parser drops every row.**
- *Observed:* reconcile returned `skipped=[]`, and the do-first logic fell back to row order without a note.
- *Proposal:* when a non-empty table yields zero parsed dates, return a `dates_unparsed` count and put one line in the brief ("due dates unreadable; showing table order").
- *Size:* trivial once S1 exists.

**S3 — One calendar-write path, not two.**
- *Observed:* `mcp-servers/gcal` writes through `gate_connector_write`. That path has a permissions posture, a ledger row, and `rewind`, but an in-process token that dies with the server. `core/connectors.gcal_confirm_event` has a persisted, burn-on-mismatch token, but no ledger row, no posture check, and no rewind.
- *Why it matters:* the same student action has different audit and undo guarantees depending on which surface asked.
- *Proposal:* make the MCP tool call the `core/connectors` preview/confirm pair, and add the ledger append and rewind pointer there.
- *Size:* small to needs a plan.

**S4 — The Ask context broker should read what the student already has.**
- *Observed:* D6.
- *Proposal:* let `select_context` fall back to `inbox/courses/<CODE>.md` (instructor profile, checkpoints) and to imported packets whose `course` matches the hint, with `truth_kind` labels.
- *Size:* small.

**S5 — Let the app dev server read a user root.**
- *Observed:* Part 8 could not render Avery's data. `?fixture=1` uses a hardcoded TypeScript fixture dated 2026-09-22.
- *Proposal:* a Vite dev-only middleware that answers the existing IPC commands by shelling `study … run` against `DEV_USER_ROOT`, which is the same path Tauri uses.
- *Size:* needs a plan (it touches how IPC is mocked).

**Proportionate, no change:**
- `user_root.py` (96 lines, single resolver, path-escape check).
- The study evidence ladder in `reducer.py`. It is complex, but every rung I exercised did what its label says.
- `connector_guards.py` and `permissions.ALWAYS_GATED`.
- `canvas-read.js`.
- The `degree_audit` parser plus the skill-instruction split.

The ConfirmationGuard boundary and the preview-only Canvas tools should stay exactly as they are.

## 5. Doc drift

| Doc claim | Tree |
|---|---|
| `docs/architecture.md` Commitment: "Student marks started, kept, or released" | `commitment.py` statuses are `open/met/not_met/dropped`, with no "started". `progress.WORKFLOW_KINDS` declares `commitment_started` and `commitment_kept`, but nothing writes them |
| `docs/architecture.md` Learn loop: "`sync-week.mjs` runs [reconcile] after every sync" | The call is in `sync-canvas-canonical.mjs:243`, and on synced checkpoint text it is a no-op (D2) |
| Commit `bd84f01` "Answer ordinary homework through a local Ask path" | Without the relay there is no answer prose (D6) |
| `CLAUDE.md` Commands (`uv run …`) | Fails for `python -m canvas_mcp…` in this iCloud checkout (D3) |
| `habit.py` CLI help "Brief-day streak" / "Print the current streak"; payload key `streak`; UI prop `streakLine` | Product rule and module docstring: "not a learning streak." The rendered copy is correct; the internal names drift |
| `AGENTS.md` skill index "SSO sync" | Was not a declared trigger. **Fixed** in `student-canvas-browser/SKILL.md` |
| Stress prompt: "`browser/scripts/lib/canvas-read` boundaries" | No such module. The read boundary is `app/extension-chrome/lib/canvas-read.js`; sync reads through `canvas-session.mjs` / `canvas-snapshot.mjs` |
| `docs/architecture.md` MASTER status "steps 3–8 open" | Consistent with the CSS: tokens and glass discipline are present, while raw px radii and stage recomposition remain |
