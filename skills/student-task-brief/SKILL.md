---
name: student-task-brief
description: Goal-oriented priority, briefing, and first step for the student's Canvas work. Use for "priority", "brief me", "what should I do first", "optimize my time", "what matters", or a single-assignment deep dive.
schema_version: 1
category: canvas_read
requires_cloud: false
---

# Task brief

Compute **priority**, a high-level **briefing**, and an outcome-shaped **first step**. Optimize the student’s time against [`USER.md`](../../USER.md) career goals — do not invent a second due-list.

Architecture: [`docs/architecture.md`](../../docs/architecture.md). Rubric: [`calibration/priority-rubric.md`](../../calibration/priority-rubric.md).

## Prerequisites

1. Read `USER.md` and `calibration/priority-rubric.md`
2. Read [`inbox/week.md`](../../inbox/week.md) (and `inbox/courses/*` as needed)
3. If inbox missing or `Updated:` older than **2 days** → refresh via `cd browser && npm run sync` (after `open-canvas` if needed)
4. Optional: read [`inbox/focus.md`](../../inbox/focus.md) if present (dated Top 3 cache — not a competing due list)

## Triggers

- priority / what’s important / what matters
- brief me / briefing
- what should I do first / next step
- optimize my time / time box
- single-assignment deep dive

**Class-scoped asks** (e.g. “brief me on [course]”, “what’s going on in [dept]”) → hand off to [`student-course-arc`](../student-course-arc/SKILL.md), not week mode below.

## Steps

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

| Outcome class | Assumed first step |
|---------------|-------------------|
| Signup / calendar | Open Canvas link → pick slot → add to calendar |
| LTI (WebAssign/ZyBooks/PlayPosit) | Open tool → complete one unit/module chunk |
| Quiz / proctored | Build 15–30m study checklist; the student takes quiz in UI |
| Pre-reading | Open reading → skim learning outcomes → note 3 takeaways |
| Lab / build | Open lab → env check → attempt first exercise |
| Discussion | Confirm instructor profile fresh → apply tone/citation prefs → draft 3 voice bullets for the student to edit |
| Written HW | Confirm instructor profile fresh → apply AI/format prefs → open prompt/problems → work problem 1 with method shown |
| Tiny native busywork | Agent drafts answer; the student paste/submit if calibrated |

Never auto-drive LTI/proctored UIs. Native auto-submit only via `student-assignment-triage` when every `USER.md` criterion passes.

### 4. Emit briefing cards

For each item (or Top N), use this shape:

```markdown
### [P#] Course — Assignment
- Why: one line (urgency × stakes × goal)
- Outcome: what “done” means
- First step: one concrete action (from map above)
- Time box: 5 / 15 / 30 / 60+ min
- Mode: Worth | LTI (you in tool) | Agent draft | Ask
- Next after that: optional one-liner
```

### 5. Week mode (default when the student asks what’s next / optimize)

1. Rank all open `inbox/week.md` rows with the rubric
2. Show **Top 3 focus** as full cards
3. Show **batched** LTI / mechanical queue (same platform together)
4. Show **deferred P3** as a short list (title + due only)
5. Apply time rules: protect deep Worth blocks; batch LTI; don’t steal exam / Worth-course prep for busywork

### 6. Optional focus cache

When the student asks to **save** or **pin** focus (or week-plan asks to persist):

Write/overwrite [`inbox/focus.md`](../../inbox/focus.md) with today’s date, Top 3, and batch queue. Do **not** duplicate the full due table — that stays in `week.md`.

Template: dated Top-3 cache under `{user_root}/inbox/focus.md` (not a second due-list).

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
One sentence: the single first action right now.
```

## Hand-offs

- Buckets / submit policy → `student-assignment-triage`
- Full week layout → `canvas-week-plan` (should call this skill for ordered Top 3)
- Inbox refresh → `student-inbox-week` / `npm run sync`
