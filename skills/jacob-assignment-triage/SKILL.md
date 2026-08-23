---
name: jacob-assignment-triage
description: Classify Jacob's work with JACOB.md; process help first; native Canvas submit only when auto criteria pass. Never auto LTI/WebAssign/ZyBooks/PlayPosit/proctored.
---

# Jacob assignment triage

Decide Worth-your-time vs process help vs rare **native Canvas** auto-submit.

## Prerequisites

- [`JACOB.md`](../../JACOB.md), [`.jacob/calibrated-courses.md`](../../.jacob/calibrated-courses.md)
- Items from `inbox/week.md` (preferred) or MCP
- **Before drafts** on written / discussion / reflection / presentation-script work: read `## Instructor profile` in `inbox/courses/CODE.md`. If missing or stale (see [`jacob-instructor-profile`](../jacob-instructor-profile/SKILL.md)) → build profile first and apply formatting, AI, tone, and rubric preferences.
- **Policy dual-check** (draft + auto-submit): read `## Syllabus / agent policy notes` in the same course file (sync-owned `agent_writes:` marker). If profile `### AI and academic integrity` forbids agent work on this assignment type → never auto-submit; draft only with Jacob review. If synced notes say `agent_writes: deny` or `conflict` → no auto-submit regardless of profile.
- When unsure → **ask Jacob**

## Assignment-level instructor overlay

Before drafting or auto-submitting a specific item:

1. Match catalog **Outcome** column (`discussion`, `written`, `busywork`, etc.) to `### Per assignment-type notes` in the instructor profile.
2. When points ≥ 10 **or** title matches Gen AI / Advocate / reflection / essay / case → fetch assignment description + rubric via MCP `get_assignment_details` (or SSO API when no PAT). Assignment rubric beats syllabus for that task.
3. Apply overlay bullets to the draft (format, length, disclosure, citation). Surface conflicts between rubric and profile to Jacob.

## Always Jacob (do not submit)

- Quizzes / exams / remotely proctored
- **WebAssign, ZyBooks, PlayPosit, LockDown, other LTI** — draft help; Jacob uses the tool UI
- Presentations / classmate coordination
- Essays, cases, pitches, reflections
- Group work that binds others
- Course not in `.jacob/calibrated-courses.md`
- CSCI 1200 by default unless Jacob marks busywork

## Auto-submit (native Canvas only; ALL must be true)

1. Not external/LTI/proctored
2. Course calibrated
3. Online, individual, non-proctored, low stakes, mechanical
4. **Policy dual-check passes:**
   - `## Syllabus / agent policy notes` shows `agent_writes: allow` (synced) **or** MCP `get_course_policy` allows writes
   - Profile `### AI and academic integrity` does **not** forbid agent work on this assignment type
   - `agent_writes: deny`, `conflict`, or `malformed` → never auto
5. Show preview + **why auto** (never hide)

### If PAT/MCP available

`submit_assignment` preview → show Jacob → redeem token only if auto bar passed.

### If no PAT

Do not claim submitted. For native Canvas busywork, draft the text/files and ask Jacob to paste/upload, **or** wait for PAT. Do not auto-click Canvas Submit in the browser unless Jacob explicitly approves that one item and it meets the auto bar.

## Priority / time

When Jacob asks priority, briefing, first step, or how to spend time → hand off to [`jacob-task-brief`](../jacob-task-brief/SKILL.md) (rubric: [`.jacob/priority-rubric.md`](../../.jacob/priority-rubric.md)). Triage buckets answer *who acts*; the brief answers *what first and why*.

## External signup assignments (CampusGroups, calendar-binding)

- Calendar-binding signups = **Ask Jacob** unless preference exists in [`.jacob/signup-preferences.md`](../../.jacob/signup-preferences.md) with `Status: confirmed`
- IBE has no dedicated major dinner — do not auto-pick without stored + confirmed preference
- RSVP on CampusGroups ≠ Canvas assignment complete — check for `outcome:upload-after-event` (e.g. post-dinner selfie)
- Use Playwright `npm run rsvp-campusgroups` / `rsvp-dinner` — never IDE browser for scripted RSVP
- **Verification contract** (before reporting success): confirm at least one of:
  1. Confirmation URL contains `type=rsvp&type_id={eventId}`
  2. Attendee list includes Jacob's name
  3. `/home/events` shows REGISTERED status
- Never infer RSVP success from page text or a11y labels alone
- After successful RSVP: optional Google Calendar reminder via calendar MCP (agent-triggered, not script-automated)

## Output

```
## Triage result
### Worth your time
### External / LTI (Jacob in tool)
### Asked you
### Auto-submitted (native, if any) — why auto:
### Drafts ready for you
- Draft ready → Jacob reviews → Jacob posts/uploads (discussions: never post without explicit approval)
```
