---
name: student-task-brief
description: Goal-oriented priority, briefing, and first step for the student's Canvas work. Use for "priority", "brief me", "what should I do first", "optimize my time", "what matters", or a single-assignment deep dive.
schema_version: 1
category: canvas_read
model_tier: fast
requires_cloud: false
---

# Task brief

Compute **priority**, a high-level **briefing**, and an outcome-shaped **first step**. Optimize the student’s time against [`USER.md`](../../USER.md) career goals — do not invent a second due-list.

Architecture: [`docs/architecture.md`](../../docs/architecture.md). Rubric: [`calibration/priority-rubric.md`](../../calibration/priority-rubric.md).

## Instructions

### 1. Classify each open item

From title, type, Notes (incl. sync outcome hints), points, due, and course defaults in `USER.md`:

| Outcome class | Typical signals |
|---------------|-----------------|
| Signup / calendar | sign up, dinner, workshop, calendar_event |
| LTI | WebAssign, ZyBooks, PlayPosit, external/LTI note |
| Quiz / proctored | quiz, exam, proctored, LockDown |
| Pre-reading | pre reading, pre-class, reading |
| Lab / build | lab, pre lab, coding build, project build |
| Discussion | discussion_topic, discussion, advocate ideas |
| Written HW | written hw, essay, gen ai assignment |
| Tiny native busywork | low points, syllabus video, training, playlist |

Ambiguous → **Ask** the student (one question); do not invent the outcome.

### 2. Score P0–P3

Follow [`calibration/priority-rubric.md`](../../calibration/priority-rubric.md). Use goal fit and Worth-by-default courses from `USER.md` (entrepreneurship / career lens for team/pitch when listed).

### 3. Assume first step from outcome

Classify each open item as `workflow` (do-loop only) or teachable (`declarative`, `confusable`, `procedural`, `list`). Do not invent learn items for signups, calendar, or paste-submit busywork.

| Outcome class | Kind | Assumed first step |
|---------------|------|--------------------|
| Signup / calendar | workflow | Open Canvas link → pick slot → add to calendar. No learn item. |
| LTI (WebAssign/ZyBooks/PlayPosit) | procedural if practice, else workflow | Open tool → one varied attempt → feedback. The student operates the tool. |
| Quiz / proctored | declarative / confusable | Extract claims that feed the checkpoint. Write learn items and schedule them across days until the exam. Do not emit a study checklist or a night-before cram as the learning action. The student still takes the quiz in the UI. Low-shame tone. |
| Pre-reading | declarative | One pass for structure, then **close the source** and retrieve the claims. Do not note takeaways while the text is open. |
| Lab / build | procedural | One attempt at a varied instance, then immediate correction. Not “recall the definition of the lab.” |
| Discussion | workflow (voice) | Confirm instructor profile → tone/citation prefs → draft 3 voice bullets for the student to edit. |
| Written HW | declarative or procedural | Open the prompt, then generate the method with the source closed. Elaborate once: why this method. |
| Tiny native busywork | workflow | Agent drafts answer; the student paste/submit if calibrated. No learn item. |

Never auto-drive LTI/proctored UIs. Native auto-submit only via `student-assignment-triage` when every `USER.md` criterion passes.

Cramming the night before is the illusion of mastery, not the plan. If studying feels easy, say so in one clause: ease is a weak signal; the check is still scheduled.

### 4. Emit briefing cards

This is the shared card contract. [`canvas-week-plan`](../canvas-week-plan/SKILL.md) and [`student-course-arc`](../student-course-arc/SKILL.md) use it; do not keep a second copy of the science.

Obey the **Teach-hint** in this turn's slice. It already chose format, the course `prior_knowledge` override, whether to surface a due check, whether to attach a diagram, and whether to interleave. Do not re-derive those.

```markdown
### [P#] Course — Assignment
- Why: one line (urgency × stakes × goal). If the catalog names the next checkpoint, one clause: this is the move that checkpoint will ask.
- Outcome: what “done” means
- Check: one question they answer before opening the file
- Walkthrough: 2–4 steps, only when format is worked_example (or the hint says worked_example)
- If-then: If it's after [anchor], open [link] and do [micro-step] for [time box]
- Obstacle: only if the student names the cue that usually steals the start ("If I open the other tab, then close it and do only the Check"). Do not invent one. Silence is not a signal.
- Time box: 5 / 15 / 30 / 60+ min
- Mode: Worth | LTI (you in tool) | Agent draft | Ask
- Format used: retrieval | worked_example
- Next: optional one-liner
```

How to fill the card from the hint:

- `format` is **start order only**. Retrieval is required either way. `format: retrieval` → Check first; show a faded example only on a miss. `worked_example` (default; also every novice / missing prior) → short Walkthrough (define terms first), then the student generates the answer with the source closed.
- Quiz / proctored: the learning action is the scheduled retrievals, not a checklist. Walkthrough first only when the hint says `worked_example` or the item says `start: worked_example`. The student still takes the quiz in the tool. Low-shame tone.
- Pre-reading: Check is “close it and recall,” not “note 3 takeaways.”
- Elaborate once on a teachable card: why / how this connects to something they already have (career goals in `USER.md` are allowed; do not invent emotional stories).
- `interleave: yes` → mix confusable problem types in one block (“one of each kind, not all of type A then all of type B”). Do not interleave unrelated readings.
- `diagram:` other than `no` → the PNG is the encode step ([`student-concept-visual`](../student-concept-visual/SKILL.md)). Then the student labels or regenerates the relation from memory. Never because they are a “visual learner.”
- If the slice has `## Due reviews` or `spacing` says to surface a due review, ask those checks before a new passive reading. Do not lecture the research. One clause if the Check is hard: missing it is the practice.
- If the slice has `## Practice` and the line is the gap, say that one clause and stop. Do not invent a check to keep brief continuity. That line is not learning evidence. If it says claims are not extracted, that is not rest — extract claims; do not congratulate. If the Practice line names one overdue item, say that clause and start there; do not backfill the rest or mention a missed brief count.
- If the slice has a review-budget line, say that one clause. The student may still study past the budget. It is not an energy limit and not a score.
- If the slice has `You kept the chain of work alive this week.` or `## Trail`, say the chain sentence only when it is present. A path or a kept commitment is not a delayed hit. Do not invent a check to feed the trail. Do not celebrate a gap or name a missed count.
- If a counterfactual pair is present (`If you do this check now` / `If you start`), say that pair once. Do not turn it into a lecture or an exam prediction.
- If the slice has a commitment or `Check-in:` / `Still open:` line, offer that one action. Do not mark it kept. Do not treat it as a grade. Release is recovery, not failure.
- If the slice has `## Coverage`, say the one line for the soonest checkpoint. `due_now` means the checks, then rest. `in_the_gap` means nothing is due. `unextracted` means a quiz is on the list and no claims exist yet. Do not turn the counts into a score or say they are behind.
- After they answer a Check, say whether the method is right and what to fix. Do not fill the blank. Do not grade them. “I know this” without a successful delayed retrieval is not mastery.
- `autonomy: directive` → one If-then. `choices` → two If-then options. `chunk_size: short` → time box ≤15–30m; `long` → a longer sit-down is fine. `check_depth: thorough` → keep a Check even on a worked example; `light` → do not stack an extra confirmation on retrieval-first. Neither skips the scheduled check.

### 5. Week mode (default when the student asks what’s next / optimize)

1. Rank all open `inbox/week.md` rows with the rubric
2. Show **Top 3 focus** as full cards
3. Show **batched** LTI / mechanical queue (same platform together)
4. Show **deferred P3** as a short list (title + due only)
5. Apply time rules: protect deep Worth blocks; batch LTI; don’t steal exam / Worth-course prep for busywork

### 6. Focus handoff (required when you emit Top 3)

Write `inbox/focus.md` every time you emit Top 3. It is the practice handoff the next session and the dock read — not a second due-list. `week.md` stays canonical.

```bash
python -m canvas_mcp.core.teach_hint write-focus \
  --open-with "<the Do-first Check, closed-book>" \
  --format retrieval|worked_example \
  --item "COURSE — Assignment — due <due> — Check: <same question>"
```

Pass `--obstacle "<their words>"` only when the student names the cue that usually blocks the start. Omit it to keep a previous obstacle. Pass `--clear-obstacle` only if they ask to drop it. Do not invent an obstacle from a skipped brief.

Repeat `--item` for each Top-3 card (at most three). Honor `DEV_USER_ROOT` if set.

When you brief a quiz, exam, or concept that feeds a checkpoint, write one learn item per claim (not a fake card for a signup). First review is about a day later, sooner if the checkpoint is inside three days. Do not invent an ease factor.

```bash
python -m canvas_mcp.core.learn_loop add \
  --course "<course>" \
  --claim "<closed-book claim>" \
  --kind declarative|confusable|procedural|list \
  --assignment-id "<id if known>" \
  --checkpoint-due YYYY-MM-DD
```

Refuse `kind=workflow` — those stay on the do-loop. If a retrieval just happened and it was this same sitting as the example, record `--same-session` so stability does not advance. After a scheduled check, omit that flag:

```bash
python -m canvas_mcp.core.learn_loop outcome \
  --id "<id printed by add>" \
  --outcome hit|miss|partial|skipped
```

If that command prints a delta (`fragile → holding` or `holding → durable`), say that one clause about this claim only. Do not praise a same-session hit, a miss, or a skip. Do not keep a running score.

If the student asked to save or pin focus, this write already is that cache. Do not also copy the full due table.

### 7. Format reply

If the student says “quiz me”, “quiz me instead”, “walk me through”, or “just show me”, record that before rewriting the card. That sets **start order** for this turn. It does not skip retrieval or the scheduled check. Do not ask whether the framing “felt helpful” — fluency is a weak signal. Silence, route success, and time-on-page are not signals.

```bash
python -m canvas_mcp.core.teach_hint reply --text "<their words>"
```

Then rewrite the Do-first card in the format the command prints. Do not also call `learning_profile signal` for the same reply. Do not write learn-item outcomes through `record_signal`.

## Context

Do not paste the inbox here — this turn’s slice is supplied after the learning profile. Do not read the full `inbox/week.md` into this prompt.

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. `{user_root}/inbox/week.md` — due-list rows for this turn (volatile slice, already supplied)
3. Read `calibration/priority-rubric.md`
4. Optional: read `{user_root}/inbox/focus.md` if present (dated Top 3 cache — not a competing due list)

## Tools available

Read only. No submit tools from this skill.

Native auto-submit only via `student-assignment-triage` when every `USER.md` criterion passes.

## Triggers

- priority / what’s important / what matters
- brief me / briefing
- what should I do first / next step
- optimize my time / time box
- single-assignment deep dive

**Class-scoped asks** (e.g. “brief me on [course]”, “what’s going on in [dept]”) → hand off to [`student-course-arc`](../student-course-arc/SKILL.md), not week mode below.

## Output (week mode)

```markdown
## Focus briefing (source: inbox …)
### Top 3
…cards…
### Batched next
…
### Deferred (P3)
…
### Do first
One sentence: the single first action right now. If `## Due reviews` or `Open with:` is in the slice, that closed-book check comes before this sentence. If `## Practice` names one overdue item, that clause comes first — do not replay a stale Open with, and do not backfill. If the check felt easy, one clause: the next review is still on the schedule.
```

## Hand-offs

- Buckets / submit policy → `student-assignment-triage`
- Full week layout → `canvas-week-plan` (should call this skill for ordered Top 3)
- Inbox refresh → `student-inbox-week` / `npm run sync`
- If a course `## Weak topics` entry has a known concept key → `student-concept-visual`
