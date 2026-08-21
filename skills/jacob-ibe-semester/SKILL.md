---
name: jacob-ibe-semester
description: Jacob's CU Boulder IBE Fall 2026 semester context skill. Maps live Canvas courses to transfer credits and IBE goals. Use for "semester overview", "what am I taking", "transfer credits", "IBE schedule", "am I on track".
---

# Jacob IBE semester

Orient the agent to Jacob’s transfer record + Fall 2026 IBE load. Not a degree audit.

## Prerequisites

- Read [`JACOB.md`](../../JACOB.md)
- Prefer `inbox/week.md` + `inbox/courses/*` (from `npm run sync`). Use MCP `list_courses` only if PAT works.

## Steps

### 1. Confirm live enrollments

From inbox sync notes / enrolled courses list, or MCP if available. Expect Fall 2026:

- APPM 1235 Pre-Calculus for Engineers
- BCOR 1030 Communication Strategy
- CSCI 1200 Intro Computational Thinking
- ECON 2010 Principles of Microeconomics
- COEN 1500 CEAS First-Year Seminar (easy to miss on planner-only syncs)
- Calculus 1 Readiness Prep / Online Experience if present

If Canvas differs, trust Canvas for this-term work and note the delta.

### 2. Cross-check transfers

From `JACOB.md`:

- Already credited: BCOR 1025, BCOR 2202, WRTG 1150, COMM 1300, etc.
- ECON 2999TC exists but **ECON 2010 is still enrolled** — do not skip 2010
- Math transfers ≠ APPM 1350; 1235 is the prep path
- Open: RFLA100C NEED SYLLABUS

If a live course matches a credited code, flag: “possible duplicate — verify with advisor.”

### 3. Prioritize by goals

1. Entrepreneurship / startup
2. Software / data → **CSCI 1200** first for deep attention
3. Then ops/strategy, aerospace, climate

### 4. Output

```
## IBE Fall 2026 snapshot

### Live courses
…

### Transfer highlights (relevant)
…

### Advising flags
…

### Where to spend Jacob’s time this term
1. CSCI 1200 …
2. APPM 1235 exams / hard HW …
3. BCOR 1030 live presentations …
4. ECON 2010 exams …
```

## Tools

| Tool | Purpose |
|------|---------|
| `list_courses` / `get_my_enrollments` | Live schedule |
| `get_course_details` / `get_syllabus` | Policies |
| `get_my_course_grades` | Standing |
| `get_course_structure` | Module map when useful |
