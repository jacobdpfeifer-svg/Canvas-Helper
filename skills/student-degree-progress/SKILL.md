---
name: student-degree-progress
description: Semester context skill. Maps live Canvas enrollments to transfer notes and career goals from USER.md. Use for "semester overview", "what am I taking", "transfer credits", "am I on track".
schema_version: 1
category: canvas_read
model_tier: reliable
requires_cloud: false
---

# Semester progress

Orient the agent to the student’s transfer notes + this-term enrollments. Not a degree audit.

## Instructions

### 1. Confirm live enrollments (`{active_courses}`)

Resolve the active set from (in order):

1. MCP `list_courses` (or `get_my_enrollments`) when available
2. Else course codes/titles from the supplied inbox slice + filenames under `inbox/courses/*.md`

Do **not** hardcode a term roster in this skill. If Canvas differs from notes in `USER.md`, trust Canvas for this-term work and note the delta. Do not read the full `inbox/week.md` into this prompt.

### 2. Cross-check transfers

From `USER.md` transfer / credit notes only:

- Flag when a live course code also appears as already credited
- Flag open advising items the student recorded
- Never invent transfer mappings not present in `USER.md`

If a live course matches a credited code, flag: “possible duplicate — verify with advisor.”

### 3. Prioritize by goals

Rank deep-attention courses using career priorities and “Worth by default” / throwaway lists in `USER.md` + `calibration/priority-rubric.md`. Do not name courses here.

### 4. Output

```
## Term snapshot

### Live courses
…(from {active_courses})…

### Transfer highlights (relevant)
…(from USER.md)…

### Advising flags
…

### Where to spend the student’s time this term
1. … (goal-fit from USER.md)
2. …
```

## Context

Do not paste the inbox here — this turn’s slice is supplied after the learning profile. Do not read the full `inbox/week.md` into this prompt.

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. Transfer / credit notes and career priorities in `USER.md` — learning profile is already in the stable prefix; do not re-paste it
3. `{user_root}/inbox/week.md` + `inbox/courses/*` (from `npm run sync`) — course codes from the supplied slice and course filenames, not a second due-list
4. `calibration/priority-rubric.md` for goal-fit ranking

## Tools available

Read only. No submit tools from this skill.

- `list_courses` / `get_my_enrollments` — live schedule
- `get_course_details` / `get_syllabus` — policies
- `get_my_course_grades` — standing
- `get_course_structure` — module map when useful

## Triggers

- semester overview
- what am I taking
- transfer credits
- am I on track
