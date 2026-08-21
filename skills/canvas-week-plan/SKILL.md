---
name: canvas-week-plan
description: Jacob's weekly Canvas planner for CU Boulder IBE. Triages due work into worth-Jacob's-time vs agent-can-handle using JACOB.md. Use for "what's due", "plan my week", "weekly check".
---

# Canvas Week Plan (Jacob IBE)

Generate Jacob’s weekly plan from Canvas, then triage each item using [`JACOB.md`](../../JACOB.md).

## Prerequisites

- Read `JACOB.md` first (Fall 2026 courses, career priorities, triage rubric)
- Canvas MCP student tools available
- Courses this term: APPM 1235, BCOR 1030, CSCI 1200, ECON 2010

## Steps

### 1. Load context

Open `JACOB.md`. Apply per-course defaults (CSCI 1200 = deep attention; exams always Jacob; etc.). Check `.jacob/calibrated-courses.md` before treating anything as auto-eligible.

### 2. Gather Canvas data

1. `get_my_upcoming_assignments` (`days_ahead=7`, widen if asked)
2. `get_my_submission_status`
3. `get_my_course_grades`
4. `get_my_peer_reviews_todo`

### 3. Triage each item

Classify into:

| Bucket | Meaning |
|--------|---------|
| **Worth Jacob’s time** | Exams, quizzes, presentations, CSCI build work, judgment-heavy writing, group coord |
| **Agent can handle** | Clear low-stakes busywork meeting every auto-submit criterion in `JACOB.md` |
| **Ask Jacob** | Unsure, first submit in a course, or criteria incomplete |

Do **not** auto-submit from this skill alone — hand eligible items to `jacob-assignment-triage` or ask first.

### 4. Output format

```
## Week ahead (Jacob / IBE Fall 2026)

### Quick stats
- Due this week: N
- Worth your time: N
- Agent can handle (candidates): N
- Ask you: N
- Peer reviews pending: N

### Worth your time
- [Course] Assignment — due … — why (exam / CSCI / presentation / …)
  - Process help: …

### Agent can handle (candidates)
- [Course] Assignment — due … — why auto bar might apply
  - Next: run assignment-triage or confirm with Jacob

### Ask you
- …

### By course
#### CSCI 1200 (grade …)
…

#### APPM 1235 …
#### BCOR 1030 …
#### ECON 2010 …

### Peer reviews
…

### Suggested order (your time first)
1. …
```

### 5. Entrepreneurship lens

Flag early: team projects, pitches, demos, anything that builds toward startup / software goals (especially CSCI 1200).

## Tools

| Tool | Purpose |
|------|---------|
| `get_my_upcoming_assignments` | Due window |
| `get_my_submission_status` | Submitted vs not |
| `get_my_course_grades` | Standing |
| `get_my_peer_reviews_todo` | Peer reviews |
| `get_assignment_details` | Drill-down |
| `get_syllabus` | Policy / agent-write rules |
