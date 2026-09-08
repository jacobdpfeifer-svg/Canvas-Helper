---
name: student-assignment-triage
description: Classify the student's work with USER.md; process help first; native Canvas submit only when auto criteria pass. Never auto LTI/WebAssign/ZyBooks/PlayPosit/proctored.
schema_version: 1
category: canvas_read
model_tier: reliable
requires_cloud: false
---

# Assignment triage

Decide Worth-your-time vs process help vs rare **native Canvas** auto-submit.

## Instructions

### 1. Assignment-level instructor overlay

Before drafting or auto-submitting a specific item:

1. Match catalog **Outcome** column (`discussion`, `written`, `busywork`, etc.) to `### Per assignment-type notes` in the instructor profile.
2. When points ≥ 10 **or** title matches Gen AI / Advocate / reflection / essay / case → fetch assignment description + rubric via MCP `get_assignment_details` (or SSO API when no PAT). Assignment rubric beats syllabus for that task.
3. Apply overlay bullets to the draft (format, length, disclosure, citation). Surface conflicts between rubric and profile to the student.

### 2. Always the student (do not submit)

- Quizzes / exams / remotely proctored
- **WebAssign, ZyBooks, PlayPosit, LockDown, other LTI** — draft help; the student uses the tool UI
- Presentations / classmate coordination
- Essays, cases, pitches, reflections
- Group work that binds others
- Course not in `calibration/calibrated-courses.md`
- Courses marked Worth-by-default / never-auto in `USER.md` unless the student marks the item busywork

### 3. Auto-submit (native Canvas only; ALL must be true)

1. Not external/LTI/proctored
2. Course calibrated
3. Online, individual, non-proctored, low stakes, mechanical
4. **Policy dual-check passes:**
   - `## Syllabus / agent policy notes` shows `agent_writes: allow` (synced) **or** MCP `get_course_policy` allows writes
   - Profile `### AI and academic integrity` does **not** forbid agent work on this assignment type
   - `agent_writes: deny`, `conflict`, or `malformed` → never auto
5. Show preview + **why auto** (never hide)

If PAT/MCP available: `submit_assignment` preview → show the student → redeem token only if auto bar passed.

If no PAT: do not claim submitted. For native Canvas busywork, draft the text/files and ask the student to paste/upload, **or** wait for PAT. Do not auto-click Canvas Submit in the browser unless the student explicitly approves that one item and it meets the auto bar.

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
### Auto-submitted (native, if any) — why auto:
### Drafts ready for you
- Draft ready → the student reviews → the student posts/uploads (discussions: never post without explicit approval)
```

## Context

Do not paste the inbox here — this turn’s slice is supplied after the learning profile. Do not read the full `inbox/week.md` into this prompt.

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. `{user_root}/inbox/week.md` — items for this turn (volatile slice, already supplied); MCP only if the slice is missing
3. [`calibration/calibrated-courses.md`](../../calibration/calibrated-courses.md)
4. **Before drafts** on written / discussion / reflection / presentation-script work: read `## Instructor profile` in `inbox/courses/CODE.md`. If missing or stale (see [`student-instructor-profile`](../student-instructor-profile/SKILL.md)) → build profile first and apply formatting, AI, tone, and rubric preferences.
5. **Policy dual-check** (draft + auto-submit): read `## Syllabus / agent policy notes` in the same course file (sync-owned `agent_writes:` marker). If profile `### AI and academic integrity` forbids agent work on this assignment type → never auto-submit; draft only with the student review. If synced notes say `agent_writes: deny` or `conflict` → no auto-submit regardless of profile.
6. [`calibration/signup-preferences.md`](../../calibration/signup-preferences.md) for calendar-binding signups

## Tools available

Read by default. Native Canvas submit only when every auto criterion above passes; always show preview + **why auto**.

Read:

- `get_assignment_details` — description + rubric when points ≥ 10 or the title is voice/judgment work
- `get_course_policy` — write-policy check when the course file has no synced `agent_writes: allow`

Write only after the auto bar passes and the student has seen the preview:

- `submit_assignment` — native Canvas only; never LTI / WebAssign / ZyBooks / PlayPosit / proctored

## Triggers

- triage this assignment
- should I submit
- who does this
- auto-submit
- worth my time
