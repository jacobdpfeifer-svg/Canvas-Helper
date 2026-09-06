---
name: student-degree-progress
description: Semester context skill. Maps live Canvas enrollments to transfer notes and career goals from USER.md. Use for "semester overview", "what am I taking", "transfer credits", "am I on track".
schema_version: 1
category: canvas_read
requires_cloud: false
---

# Semester progress

Orient the agent to the student’s transfer notes + this-term enrollments. Not a degree audit.

## Prerequisites

- Read [`USER.md`](../../USER.md)
- Prefer `inbox/week.md` + `inbox/courses/*` (from `npm run sync`). Call MCP `list_courses` / `get_my_enrollments` when API access works.

## Steps

### 1. Confirm live enrollments (`{active_courses}`)

Resolve the active set from (in order):

1. MCP `list_courses` (or `get_my_enrollments`) when available
2. Else course codes/titles from `inbox/week.md` + filenames under `inbox/courses/*.md`

Do **not** hardcode a term roster in this skill. If Canvas differs from notes in `USER.md`, trust Canvas for this-term work and note the delta.

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

## Tools

| Tool | Purpose |
|------|---------|
| `list_courses` / `get_my_enrollments` | Live schedule |
| `get_course_details` / `get_syllabus` | Policies |
| `get_my_course_grades` | Standing |
| `get_course_structure` | Module map when useful |
