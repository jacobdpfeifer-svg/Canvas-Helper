# Requirements / acceptance map

Status: implemented+tested (T), implemented, verified in a running dev build (D), blocked(external), not-started. "T" names the test.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| R-RT1 | Runs from an installed bundle with no repo / system Python / npm | implemented; installed-app test **pending runtime staging** | `runtime.rs`; unsigned `.app` built via mirror; bundled binary reports `Bundled` with an explicit interpreter and `Broken` (fails closed) without one; bundled study path proven stdlib-only from inside the .app. `scripts/stage-runtime.sh` prepared; python-build-standalone/Node tarballs not downloaded (owner action). |
| R-RT2 | One profile identity across Rust/Python/JS; profiles isolated | T | `runtime::tests`, `test_two_profiles_do_not_share_study_state`, `test_two_profiles_keep_separate_tokens`; per-profile browser AUTH_DIR (`browser/tests`) |
| R-ST1 | Import permitted sources; honest recovery for empty/unsupported | T + D | `test_s5_*`, `test_f12_f13_*`, packet validation tests; browser walkthrough (missing_source → Sources) |
| R-ST2 | Offer with one-sentence source-backed "why"; learn/review/practice | T + D | `test_s1_*`, `test_f23_*`, `StudyView.test.tsx`; walkthrough |
| R-ST3 | Real typed answer; draft recovery; resume keeps attempt id/start/exposure | T + D | `test_f25_*`, `test_reload_offers_the_unfinished_attempt_first`, Vitest resume + flush tests, real-core test; reload walkthrough |
| R-ST4 | Deterministic feedback in scope; abstain otherwise; self-check labeled | T | checkers tests, `test_s4_*`, audit regressions (grammar, model keys) |
| R-ST5 | Exposure logged before render; keys absent pre-submit | T | `test_reveal_logs_exposure_before_returning_key`, `test_feedback_retry_after_crash_logs_exposure`, Vitest "no cos in DOM" |
| R-ST6 | Evidence labels + transitions; early/exposed never promote; F01–F32 | T | `test_study_reducer.py` (26) |
| R-ST7 | Duplicate submissions idempotent; corrections replay preserve later work | T | `test_f19_*`, `test_f32_*`, `test_correction_replay_preserves_later_valid_work`, store duplicate/conflict tests |
| R-ST8 | Exam cutoffs, date-only, past/cancelled/unknown, moved exams | T | `test_f30_*`, `test_f22_*`, `test_f12_f13_f14_f15_*`, `test_f16_*`, `test_s5_*` |
| R-ST9 | Clock anomaly → no temporal evidence, practice allowed, no latch | T + D | `test_f29_*`, `test_clock_anomaly_marks_attempt_uncertain`; sleep false-positive found and fixed in the walkthrough |
| R-ST10 | Packet revisions cannot regrade in-flight attempts; stale sources block scoring | T | `test_packet_revision_does_not_regrade_open_attempt`, `test_stale_source_blocks_scoring` |
| R-CV1 | Canvas material → packets; sync state shown honestly; student-authored items | T + D (fixture); live sync **pending credentials** | `browser/tests/study-sources.test.mjs`, `test_study_canvas.py`, Sources walkthrough with fixture; `sync-study-sources.mjs` not run against a live account |
| R-UX1 | Stable Study/Plan/Sources/Settings; first-value onboarding | T + D | `FirstRun.test.tsx` (keyboard-only), walkthrough |
| R-UX2 | Themes + reduced motion; keyboard/focus; hidden answers not in tree; contrast | D | four presets measured ≥ 5:1 for all token pairs; focus moves to each panel heading (tests); phone-width layout has no horizontal scroll; screen-reader run **not performed** |
| R-AI1 | Relay: invite auth, server-held secrets, atomic reservations, content-free logs, revocation | T; deployment **blocked(external)** | `services/relay/tests` (19): race, replay, missing usage, 4xx/5xx, refusal/truncation/malformed, session cap, revoke mid-flight, lost result, canaries in DB+WAL+logs, HTTP |
| R-AI2 | Client: bounded dispatch, pending/recovery, provisional feedback | T | `test_study_ai.py` (3): minimal payload (no profile/course ids), replay without re-bill, quota/revocation copy |
| R-PR1 | No student content in service persistence | T (synthetic) ; live deployment **pending** | `test_no_content_persists_in_database_or_logs` |
| R-IN1 | Google Calendar connect/read/disconnect; per-action write confirm | T (guard, states); live OAuth **blocked(owner registration)** | `test_connectors.py`, `PlanEvent.test.tsx` |
| R-IN2 | Outlook email connect/read (CU-managed + personal) | T (device-code flow with fake transport); live **blocked(owner app registration)** | `test_connectors.py` |
| R-DL1 | Installer artifacts + platform matrix; signing truthful | partial | unsigned arm64 `.app` builds; dmg/Windows not built; signing not available |
