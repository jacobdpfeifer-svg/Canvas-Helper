# Learning program audit — 2026-09-08

Pass under [`.cursor/skills/audit/SKILL.md`](../../.cursor/skills/audit/SKILL.md). Branch `phase1-productname-pivot`. Not committed.

After edits: `47 passed`. Re-walked 2026-09-08 against the writers, not this memo. One contract the first pass named and did not actually close is fixed below.

```bash
PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/core/test_learn_loop.py tests/core/test_habit.py tests/core/test_teach_hint.py -q
```

Rust and the IPC payload shape were not changed. `cargo check` was not run. The dock fail-quiet change is in React only; Python tests do not cover it.

---

## 1. Program map as exercised

### Due review

| Step | Role | Function |
|------|------|----------|
| Write claims | write | `learn_loop.add_item` → `{user_root}/inbox/learn/items.yaml` |
| Select due | read | `learn_loop.due_reviews` (at most two; confusable pair first) |
| Dock payload | read | `learn_loop.due_reviews_payload` via CLI `--json due` |
| Daemon | read | `daemon::run_due_reviews` → `python_json(..., ["--json", "due"])` |
| UI | read | `readDueReviews` → `ReviewSession` |
| Score | write | `learn_loop.record_outcome` via `record_review_outcome` / `--json outcome` |

**Stability writer:** `learn_loop.record_outcome` only. The dock always passes `same_session=false` for a scheduled check. The clock (`moment >= next_review_at`) decides whether that score may change stability or the schedule. A true `same_session` flag cannot invent a delayed hit. `habit.yaml` is not read here.

### Brief day

| Step | Role | Function |
|------|------|----------|
| Write brief | write | `teach_hint.write_focus` → `{user_root}/inbox/focus.md` |
| Count the day | write | `habit.record_brief_day`, called only after that write succeeds |
| Quiet line | read | `habit.streak_payload` / `render_streak_line` |
| Prompt | read | `prompt_assembly` calls `streak_payload` for teaching skills |
| Dock | read | `daemon::run_brief_streak` → `habit --json show` |

**Streak writer:** `habit.record_brief_day`. The only production caller is `teach_hint.write_focus`. `show` does not increment. A review outcome does not increment. `items.yaml` is not read here. Habit does not write the learning profile or the ledger.

The line is `Brief continuity: written today` or `Brief continuity: yesterday written`. The count stays in the JSON payload. A gap older than yesterday renders an empty line.

---

## 2. Defects fixed

### Yesterday's brief was treated as a gap

**Invariant.** A gap is not announced. The continuity window is today or yesterday. The next successful brief sets the count to 1 only after a real gap. The dock still reads yesterday's Open-with handoff.

**Where.** `_focus_is_stale` was true whenever `Updated:` was before today. `practice_surface` then emitted a recovery line and `due_reviews_payload` cleared `open_with`, including the morning after a successful brief.

**Change.** Stale now means the focus date is older than yesterday. A one-day continuity window keeps the handoff and does not show recovery.

**Lock.** `test_yesterday_brief_is_not_a_recovery_gap`. The multi-day overdue case remains `test_stale_focus_recovers_one_overdue_item`.

### A miss had two start instructions

**Invariant.** Worked-example versus retrieval-first is a start bias. A miss starts with a worked example, then retrieve. That sentence is the same on the prompt card and the dock. It does not reveal the answer.

**Where.** `why_due` said "varied attempt" while `render_due_reviews` and `ReviewSession` said "worked example."

**Change.** `why_due` owns the miss clause (`last miss — start with a worked example, then retrieve`), and only when `start_with_example` is set. A clock-due miss sets that flag. An early or same-session miss writes `last_outcome` and leaves the flag false; it must not reopen as a worked example. `teach_hint` copies that same clause when it forces `worked_example`. `ReviewSession` shows `why` once and adds only that the answer is not shown. Procedural items that were not a miss still say one varied attempt.

**Lock.** `test_evidence_ladder_and_why_due` (prompt contains the miss clause once, `start: worked_example`, no varied-attempt line). `test_early_miss_without_flag_does_not_change_stability` (later due card stays retrieval, no worked-example line). `test_miss_start_bias_uses_why_due_clause`.

The first pass keyed the clause on `last_outcome == "miss"` as well as the flag, and the dock session repeated the start sentence. That left the original split in place. `test_evidence_ladder_and_why_due` did not call `render_due_reviews` on the miss, so it could not catch it.

### A failed due-load claimed nothing was scheduled

**Invariant.** Daemon or Python failure fails quiet. It must not invent a due card or leave a leftover retention list after that read fails.

**Where.** `App` caught `read_due_reviews` and then rendered `No checks scheduled`. `read_learn_progress` failure left the previous course list up.

**Change.** A failed due-load shows no peek card. A failed progress read clears the retention list. Streak still clears only if its own read fails.

**Lock.** No React test harness. Not covered by the pytest set above.

### Design doc denied the brief-continuity line

**Invariant.** The dock and prompt assembly only read the cue. Product copy may say brief continuity. It must not say learning streak.

**Where.** `docs/design/learning-profile.md` said the dock has no streak, while `Top3Sticky` reads `habit` via `read_brief_streak`.

**Change.** The doc now says the dock may read a quiet brief-continuity line, that the line is not learning evidence, and that it does not write the learning profile.

---

## 3. Checked, no defect

1. **Due payload to recorded outcome.** `daemon::run_due_reviews` argv is `--json due`. `run_record_review_outcome` passes `--id`, `--outcome`, and `--same-session` only when the flag is true. `ReviewSession` always passes `false` and sends `hit|partial|miss|skipped`. `test_json_due_payload_and_same_session_outcome`, `test_same_session_hit_does_not_advance_stability`, `test_early_miss_without_flag_does_not_change_stability`, `test_second_partial_does_not_demote_twice`, `test_skipped_does_not_write_habit`, `test_workflow_never_enters_health`.

2. **Workflow stay out of the store.** `add_item` refuses `kind=workflow`. `load_items` drops non-teachable kinds. `test_workflow_never_enters_health`.

3. **Streak increment.** Grep of `record_brief_day` callers: `write_focus` and tests. `habit --json show` is the dock read. `test_cli_show_does_not_increment`, `test_write_focus_records_day_without_ledger_or_profile`, `test_write_focus_counts_school_local_day`.

4. **Gap line.** `render_streak_line` returns `""` when `last_brief_date` is older than yesterday. `test_render_omits_when_zero_or_already_missed`. The visible line does not name the count.

5. **Empty and malformed files.** `test_malformed_items_yaml_due_is_empty`, `test_malformed_habit_yaml_show_is_quiet`. Due empty with no claims is `idle` and an empty practice line. Rest versus unextracted: `test_rest_when_claims_are_waiting_not_when_quiz_unextracted`.

6. **Four surfaces.** Why-due, same-session, brief line, and `in_the_gap` versus `unextracted` are produced by `why_due` / `render_due_reviews` / `render_practice` and restated in `student-task-brief` and `canvas-week-plan`. `student-inbox-week` writes focus only when the student asks to save it. Durable copy is "durable retrieval signal" / "not exam readiness." "you know this" appears only as a refusal.

7. **Standing grep.** No streak-freeze, badge, XP, hearts, exam-ready, grade-prediction, or quiz-generation language in `learn_loop.py`, `habit.py`, `teach_hint.py`, `ReviewSession.tsx`, `Top3Sticky.tsx`, or the three skills. The "do not invent a check" lines are refusals and were left in place.

---

## 4. Escalate

None.

---

## 5. Not built

Left alone, even where the seams are obvious: evidence-ladder visual, outcome-shaped trail, student-authored commitments, semester garden, FSRS/SM-2, streak freeze or repair, badges, and any change to what counts as a brief day. The existing one-item recovery line was not expanded; only its trigger was aligned with the continuity window.
