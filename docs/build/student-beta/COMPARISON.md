# Candidate A vs candidate B — comparison and integration decision

Date: 2026-09-18. Author: the integrating architect (also the author of A —
this is not an independent judgment; the independent inputs are the two
auditor reports that the B run produced, attached on branch `candidate-b`
under `docs/build/student-beta/audit-{a,b}.md`).

Evidence used: both trees checked out and their suites re-run here (A: 847
Python tests incl. relay, 11 Vitest, 8 Rust; B: 85 Python tests incl. its
relay and accounts suites, 1 Rust test). Audit A's seven confirmed core
defects were reproduced with the auditor's own probe against A, fixed, and
turned into `tests/core/test_study_audit_regressions.py` (16 tests).

## Verdict by subsystem

| Subsystem | Chosen | Why (observed) | Taken from the other side |
|---|---|---|---|
| Study authority (transitions, evidence, selection) | **A** (`core/study/{reducer,select,service}.py`) | Covers all six spec sessions, exam caps/cram, corrections replay, packet versioning, Canvas import, student authoring, AI proposals; 26 traced fixtures F01–F32 + 30 service + 16 audit regressions + 4 Canvas + 3 AI tests. B implements the same contract for one hardcoded physics scope (46 tests) and cannot serve the other five walkthroughs. | B's bounded history: `history` is now paginated newest-first; status summaries truncate drafts. B's stale-reveal concern: A's reveal always logs an exposure and serves the version snapshot the attempt started under. |
| Storage | **A** JSONL log + rebuildable projection | Durable fsync append, partial-tail vs interior-corruption distinction, staged (crash-safe) import, duplicate/conflict ids; every write path has a fault-injection test. B's SQLite is a cleaner transaction story but its projection replays the whole log per command too. | Revisit trigger recorded (DECISIONS D-12): move to SQLite if a second writer process appears. |
| Checkers | **A** packet-driven (choice / true-false / numeric / expression / none) | After audit repairs: strict single-number grammar, `2*3 ≠ 23`, unresolved support refs refused, unpermitted scopes refused, model-candidate keys cannot score. B: one hand-coded physics checker + formats — narrower and not extensible by students. | B's "state the exact format" scope copy influenced the numeric note text. |
| Native runtime / IPC | **A** `runtime.rs` + `daemon.rs` | Profile identity shared across Rust/Python/JS, bundled/dev/**broken** modes (fails closed), per-profile browser AUTH_DIR, node-direct sync, isolated `study` package (stdlib-only path proven from inside the built .app). | **B's bridge hardening adopted:** renderer requests are validated natively (`now`/`root`/`path`/`zone` refused, unknown fields refused, size-capped), 4 MB reply cap, stderr never returned to the webview, `-s` no-user-site, no PYTHONPATH on the study path. |
| Frontend | **A** workspace (Study/Plan/Sources/Settings, first-run, Canvas import, authoring, AI, connectors, themes) | Interaction tests for offer→attempt→feedback, learn mode, reveal confirmation, resume, persistence failure, empty profile, draft flush, control locking, first-run keyboard path, calendar preview→confirm. B: single-file App.tsx with one flow. | **B's real-core contract test adopted:** `StudyView.realcore.test.tsx` drives the actual Python core through the transport seam. |
| Relay | **A** `services/relay` | HTTP surface, invite→session auth, atomic reservations with concurrency race test, replay-without-redispatch, 4xx release / 5xx hold, revocation mid-flight, canary test across DB+WAL+logs, Gemini ineligible until bounded. B: "offline relay preparation", no listener. | **B's fee carve-out adopted:** `RELAY_ENVELOPE_CENTS − RELAY_FIXED_FEES_CENTS` is the inference allowance (owner: $50 inclusive of fees). |
| Connectors | **A** `core/connectors.py` | Concrete Google (installed-app flow via existing helpers) and Microsoft device-code flows for CU-managed + personal accounts; honest states (`not_configured`, `pending_auth`, `consent_required`, `expired`, `connected` only after a real read); persisted ConfirmationGuard so preview→confirm survives the per-command process model; dry-run never shown as created. B: abstract fail-closed lifecycle, no provider adapter. | — |
| Packaging | **A** `scripts/stage-runtime.sh` + `tauri.conf.json` resource map | Stages Python, Node, browser deps and Plan deps; unsigned `.app` built from the non-iCloud mirror; installed bundle verified to resolve bundled resources and to report `broken` (never system Python) when the runtime is absent. B: Python-only staging script. | — |
| Site | **A** `site/index.html` | Honest no-download state, privacy copy matching the built behavior. B's page was similar in spirit; A's copy is kept because it matches A's UI wording. | — |

## What B did better, and what happened to it

- Narrow native allowlist and request rejection → adopted (see above; `daemon::validate_study_request` + test).
- Real-core React contract test → adopted.
- Bounded IPC replies and paginated history → adopted.
- Fee carve-out → adopted.
- SQLite transactions → not adopted now; A's log store has equivalent tested guarantees for a single writer; migration trigger documented.
- Clock-repair command → not needed; A's clock check re-samples (no latch) and uses a sleep-aware clock (`CLOCK_MONOTONIC`/`CLOCK_BOOTTIME`), which also removed a real false positive found during the walkthrough (laptop sleep).
- `student_accounts.py` abstract lifecycle → superseded by concrete connectors.

## What A did wrong that B's audit caught (all fixed, all with regressions)

Permission scope and support refs were descriptive; model-candidate keys could earn delayed credit; a retried submission after a crash leaked the key without an exposure; a packet revision regraded an in-flight attempt; numeric/expression checkers accepted wrong answers; stale draft writers won; spring-DST gap normalized backwards; item ids could collide across packets; import was not crash-safe; interior log corruption was truncated; the dev bridge was unauthenticated; the renderer could move the clock; runtime fell back to system Python in bundled mode; draft saves were cancelled on unmount.

## Preservation

`candidate-a` and `candidate-b` branches (worktrees under `~/.cache/`) hold both
trees verbatim; `_candidate-b-integration/` (gitignored) holds the files B had
placed in this checkout. Nothing of B was deleted from history.
