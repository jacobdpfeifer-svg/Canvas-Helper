---
name: student-assignment-triage
description: Classify the student's work with USER.md; process help first. This product never submits on the student's behalf (canvas-focus pivot) — submit_assignment previews only.
schema_version: 1
category: canvas_read
model_tier: reliable
requires_cloud: false
---

# Assignment triage

Decide Worth-your-time vs process help vs ready-to-submit-yourself. This
product does not submit anything for the student — see
[`docs/handoff/canvas-focus-pivot-2026-09-11.md`](../../docs/handoff/canvas-focus-pivot-2026-09-11.md).
`submit_assignment` is a read-only preview (points, due date, accepted types,
attempts remaining); it always ends in "submit this yourself in Canvas."

## Instructions

### 1. Assignment-level instructor overlay

Before drafting or previewing a specific item:

1. Match catalog **Outcome** column (`discussion`, `written`, `busywork`, etc.) to `### Per assignment-type notes` in the instructor profile.
2. When points ≥ 10 **or** title matches Gen AI / Advocate / reflection / essay / case → fetch assignment description + rubric via MCP `get_assignment_details` (or SSO API when no PAT). Assignment rubric beats syllabus for that task.
3. Apply overlay bullets to the draft (format, length, disclosure, citation). Surface conflicts between rubric and profile to the student.

### 2. Always the student (this product never submits)

Every item lands here — there is no auto-submit path. The distinction that
matters is how much help to surface before the student submits it
themselves in Canvas:

- Quizzes / exams / remotely proctored / **WebAssign, ZyBooks, PlayPosit,
  LockDown, other LTI** — draft help only; the student uses the tool UI
- Presentations / classmate coordination / essays, cases, pitches,
  reflections / group work that binds others — draft with student review
- Native Canvas text/URL/file assignments — run `submit_assignment` for the
  preview (points, due date, accepted types, attempts remaining), show it to
  the student, then the student submits it in Canvas. Never claim something
  was submitted.

### 3. Policy notes still matter for drafting

`agent_writes` policy and the profile's `### AI and academic integrity`
section still govern how much an agent should draft or suggest wording for
an assignment — they no longer gate a submit action, since there isn't one.
If `agent_writes: deny` or the profile forbids agent involvement on this
assignment type, draft nothing; hand the student the raw requirements
instead.

When unsure → **ask the student**.

### 4. Priority / time

When the student asks priority, briefing, first step, or how to spend time → hand off to [`student-task-brief`](../student-task-brief/SKILL.md) (rubric: [`calibration/priority-rubric.md`](../../calibration/priority-rubric.md)). Triage buckets answer *who acts*; the brief answers *what first and why*.

### 5. External signup assignments

School-specific signup surfaces (e.g. CampusGroups) live in `plugins/{school}/` — see school docs.

- Calendar-binding signups = **Ask the student** unless preference exists in [`calibration/signup-preferences.md`](../../calibration/signup-preferences.md) with `Status: confirmed`
- Do not auto-pick dinners / major events without stored + confirmed preference
- RSVP on an external site ≠ Canvas assignment complete — check for `outcome:upload-after-event` when present
- Use Playwright plugin scripts for scripted RSVP — never IDE browser
- **Verification contract** (before reporting success): confirm at least one of:
  1. Confirmation URL matches the plugin’s documented success pattern
  2. Attendee list includes the student's name
  3. Events home shows REGISTERED / equivalent status
- Never infer RSVP success from page text or a11y labels alone
- After successful RSVP: optional calendar reminder via calendar MCP (agent-triggered, not script-automated)

### 6. Output

```
## Triage result
### Worth your time
### External / LTI (the student in tool)
### Asked you
### Ready to submit yourself (preview shown)
### Drafts ready for you
- Draft ready → the student reviews → the student posts/uploads/submits (never claim something was submitted)
```

## Context

Do not paste the inbox here — this turn’s slice is supplied after the learning profile. Do not read the full `inbox/week.md` into this prompt.

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. `{user_root}/inbox/week.md` — items for this turn (volatile slice, already supplied); MCP only if the slice is missing
3. [`calibration/calibrated-courses.md`](../../calibration/calibrated-courses.md)
4. **Before drafts** on written / discussion / reflection / presentation-script work: read `## Instructor profile` in `inbox/courses/CODE.md`. If missing or stale (see [`student-instructor-profile`](../student-instructor-profile/SKILL.md)) → build profile first and apply formatting, AI, tone, and rubric preferences.
5. **Policy check (drafting only):** read `## Syllabus / agent policy notes` in the same course file (sync-owned `agent_writes:` marker). If profile `### AI and academic integrity` forbids agent work on this assignment type, or synced notes say `agent_writes: deny` or `conflict` → draft nothing, hand the student the raw requirements instead.
6. [`calibration/signup-preferences.md`](../../calibration/signup-preferences.md) for calendar-binding signups

## Tools available

Read by default. `submit_assignment` is also read-only — it previews, never submits.

Read:

- `get_assignment_details` — description + rubric when points ≥ 10 or the title is voice/judgment work
- `get_course_policy` — informs drafting decisions when the course file has no synced `agent_writes: allow`
- `submit_assignment` — preview only (points, due date, accepted types, attempts remaining); always ends in "submit this yourself in Canvas"

## Triggers

- triage this assignment
- should I submit
- who does this
- worth my time
