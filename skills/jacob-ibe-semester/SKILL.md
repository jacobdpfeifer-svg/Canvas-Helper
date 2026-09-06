---
name: jacob-ibe-semester
description: Jacob's CU Boulder IBE Fall 2026 semester context skill. Maps live Canvas courses to transfer credits and IBE goals. Use for "semester overview", "what am I taking", "transfer credits", "IBE schedule", "am I on track".
---

# Jacob IBE semester

Orient the agent to Jacob’s transfer record + Fall 2026 IBE load. Use the **Degree audit snapshot** in `JACOB.md` for program remaining-requirements context. Do not invent CU degree-audit decisions beyond that snapshot.

## Prerequisites

- Read [`JACOB.md`](../../JACOB.md) (Identity + **Degree audit snapshot** + transfer map)
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

### 2. Cross-check transfers + audit snapshot

From `JACOB.md`:

- Already credited / applied: BCOR 1025, BCOR 2202 (1.5 applied / 2.5 excess), WRTG 1150, Arts & Humanities TCs
- ECON 2999TC exists but **ECON 2010 is still enrolled** — do not skip 2010; audit still needs **ECON 2020** after
- APPM 1235 is on audit as **elective**, not gen-ed Math — Math slot is **APPM 1350**
- Still open on audit: PHYS 1110, Diversity US/Global, most BCOR/BASE, GEEN sequence, eng electives/capstone, **emphasis declare**
- Open advising: RFLA100C NEED SYLLABUS; MATH/WRTG 2999TC syllabus review if wanting specific applicability

If a live course matches a credited code, flag: “possible duplicate — verify with advisor.”

### 3. Prioritize by goals

1. Entrepreneurship / startup (emphasis goal = Tech Entrepreneurship until Jacob declares otherwise)
2. Software / data → **CSCI 1200** first for deep attention
3. Then ops/strategy, aerospace, climate

### 4. Output

```
## IBE Fall 2026 snapshot

### Live courses
…

### Program progress (from JACOB.md audit snapshot)
60 earned + 15 IP → 45 still needed toward 120; emphasis undeclared; key gaps: APPM 1350, ECON 2020, PHYS 1110, BCOR remainder, GEEN sequence…

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
