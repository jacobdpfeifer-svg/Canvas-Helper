# Class standings and class marks

**Status:** framed, not built. Product call 2026-09-08 reopened two mechanics the engagement audit had rejected as generic gamification. This doc is the frame and the first buildout plan. It does not authorize implementation by itself until a pass is asked to start a phase.

Research constraint: [`docs/research/engagement-mechanics-fit-audit.md`](../research/engagement-mechanics-fit-audit.md).

## What this is

Two optional visuals on top of the learn loop. Both stay hidden until the student turns competition on. Neither is a peer system, a currency, or a second scheduler.

1. **Class leaderboard.** The contestants are the student’s own courses. Past weeks of a course may appear as extra rows when the student wants to race a prior self. The board is a projection of delayed-hit state, not a ranking of how much was extracted or how often the app was opened.
2. **Class marks.** Badges that belong to a course and can be added as new named events. A mark records that a specific academic thing happened in that class. It does not award points, and it does not change `stability`.

## What this is not

Still rejected, even if the UI looks similar:

- Global or campus leaderboard. No peer population.
- Cohort board from shared student data. Local-first stays local-first.
- XP, coins, gems, or a badge for “lesson completed” / claims extracted / brief written.
- Permanent learner-type badge. [`learning-profile.md`](learning-profile.md) still forbids an identity label.
- A standing that moves `stability`, writes `habit.yaml`, or writes the learning profile.
- Shame copy when a course is last, or when a week is missing. An absent week is an absent row.

## Contest

### Who is on the board

| Row | When it appears | Hidden by default |
|-----|-----------------|-------------------|
| Live course | At least one teachable claim exists for that course | Yes — preference off |
| Past week of that course | Student turns on “race earlier weeks,” and that week has a stored snapshot with the same score | Yes |

Courses with only workflow chores do not get a row. A course with claims but no delayed hit is on the board at the bottom of its band, not omitted — hiding a weak class would make the visual a highlight reel.

### Score

One number, explainable in one clause: **share of teachable claims in that course that currently carry a delayed-hit signal** (`holding` + `durable`) / teachable claims in that course.

Not used as the rank:

- raw `durable` count (rewards a larger extracted catalog)
- brief continuity / app opens
- same-session hits
- confidence

Tie-break, shown but not a second score: more `durable` before more `holding`, then earlier next checkpoint. The clause under the row is the existing health language: “3 of 5 with a delayed-hit signal,” never “winning” and never “exam ready.”

Small courses stay readable. A class with one claim can show 1/1; the UI must say the count beside the share so a 1-claim course does not look like it beat a 12-claim course on substance. Sort by share, and always print `n/N`.

### Visual, only when asked

Default preference: `standings_visible: false`.

When off, the dock, prompt assembly, and skills do not mention rank, place, or a mark. Reading state must not flip the preference.

When on:

- Peek may show one line: the leading course and its `n/N`, plus “standings” as a control to open the board. No toast when the lead changes.
- Expanded dock shows the board: course, `n/N`, one-clause why, and any earned marks for that course.
- A control on that board hides it again. Hiding does not delete marks or snapshots.

Copy stays competition-shaped without loss framing. “CHEM leads your classes” is allowed. “You dropped” is not. A course with no delayed hit reads “no delayed-hit signal yet,” not last place as a failure.

## Class marks

A mark is a named event template plus a course. The catalog is small and authored in code. New marks are new templates, not a student-facing point shop. That is the “unique ways” buildout: each class can earn a different subset because the template keys off `kind`, checkpoint, and outcome shape already stored on `LearnItem`.

First catalog — only events the current item record can support, or that Phase 2 will append:

| Mark | Course-unique because | Earns when | Phase |
|------|----------------------|------------|-------|
| `delayed_signal` | First claim in this course to reach `holding` or `durable` | Delayed hit moved that claim off `fragile` | 1, derived |
| `held_to_checkpoint` | Durable and the pre-exam review is still scheduled or done before `checkpoint_due` | `stability == durable` and `checkpoint_due` is set | 1, derived |
| `confusable_pair` | This course’s confusable claims, not a generic streak | At least two `confusable` claims in the course both have a delayed-hit signal | 1, derived |
| `corrected_miss` | A miss in this course later became a delayed hit | Needs an append-only mark log; `last_outcome` alone cannot see the earlier miss | 2 |
| `procedural_before_exam` | Closed-book procedural attempt before the checkpoint | Procedural claim, not `start_with_example`, delayed hit, checkpoint still ahead or same day | 2 |

Display: on the course row, only when standings are visible. A newly earned mark does not interrupt. Opening the board is how the student sees it.

Marks are not a learner identity. The same template can be earned in CHEM and in WRIT; each earning is `{course, template_id, claim_id?}`. Revoke a derived mark when the condition stops being true (a later miss demotes the claim). Phase 2 logged marks stay as history of the event; they do not inflate the standing.

## Where state lives

Python owns the projection. The dock only reads.

| Thing | Owner | Path |
|-------|--------|------|
| Score and derived marks | `learn_loop` read of existing items | `{user_root}/inbox/learn/items.yaml` (unchanged writer: `record_outcome` / claim upsert) |
| Visibility + “race earlier weeks” | new preference, default off | `{user_root}/inbox/learn/standings.yaml` |
| Week snapshots and Phase 2 event marks | append-only, written only when a delayed hit is recorded and the preference file already exists | same file, `weeks` / `marks` lists |

Do not put this in `habit.yaml` or `learning_profile`. Do not write the ledger. Skills must not invent a review to climb the board.

`standings.yaml` shape to copy, not invent past this:

```yaml
visible: false
race_weeks: false
weeks: []      # Phase 1 may leave empty
marks: []      # Phase 2 corrected_miss / procedural_before_exam
```

## Phases

### Phase 1 — projection and the hide switch

Build the read model and the preference. No dock art beyond a single opt-in control if the shell already has a place for it; otherwise CLI-only is enough to prove the score.

Copy the payload style of `progress_payload` / `knowledge_health` in `src/canvas_mcp/core/learn_loop.py` (`progress_payload` around the per-course fragile/holding/durable tally). Do not add a rank field onto `LearnItem`.

Implement:

- `standings_payload(user_root) -> {visible, courses: [{course, delayed, teachable, share, clause, marks}]}`
- Clause uses the same “delayed-hit signal” wording as `_health_line` / `render_progress`.
- Derived marks: `delayed_signal`, `held_to_checkpoint`, `confusable_pair` only.
- `set_standings_visible(user_root, visible: bool)` writes only `visible` (and creates the file). Default read when the file is missing: `visible: false`, empty marks.
- CLI: `python -m canvas_mcp.core.learn_loop standings` and `--visible` / `--hidden`. JSON for the dock later.

Verification:

- Course with 2 holding and 2 fragile ranks above a course with 1 durable and 0 others only if share is higher; assert `n/N` is present.
- Workflow items never enter `teachable`.
- Missing file does not create a board and does not write on read.
- `record_outcome` tests still show same-session hits do not change stability; standings follow the stored stability, so a same-session hit cannot mint `delayed_signal`.
- Grep: no `exam ready`, no XP, no peer/cohort.

Anti-patterns: do not sort by `total`. Do not call this from `write_focus`. Do not increment anything in the dock.

### Phase 2 — week race and event marks

Only after Phase 1’s score is stable.

- On a delayed hit, if `standings.yaml` exists, append a week snapshot for that course (school-local week, idempotent per course per week) and append `corrected_miss` when the prior stored outcome was `miss` and this outcome is a delayed `hit`.
- `race_weeks: true` adds those snapshots as rows under the live course. Off by default even when `visible` is true.
- `procedural_before_exam` from the same delayed-hit write.

Do not snapshot on app open or on brief write.

### Phase 3 — visual board

Dock reads `--json standings`. Render only when `visible` is true. Expanded board: courses, `n/N`, clause, marks. One hide control. Peek line is optional and must stay one clause.

Follow [`ambient-dock-ui.md`](ambient-dock-ui.md): this is an expanded-dock surface, not a new window, not a toast, not a tray badge. Prompt assembly may include the board only when visible, and must say it is a class race on delayed-hit share, not mastery.

## Success

The student can hide the race and see no trace of it. When they show it, course order matches delayed-hit share, each row shows `n/N`, and marks name a class event. Brief continuity, session count, and place-on-the-board are not success metrics. `learn_loop evaluate` stays the outcome check; standings are not added to that causal window.
