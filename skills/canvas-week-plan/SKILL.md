---
name: canvas-week-plan
description: Weekly planner from inbox/ (SSO→API sync) or MCP if PAT works. Triages with USER.md. Use for "what's due", "plan my week", "weekly check".
schema_version: 1
category: canvas_read
requires_cloud: false
---

# Canvas Week Plan

Generate the student’s weekly plan from the **single due-list contract** (`inbox/week.md`), then triage with [`USER.md`](../../USER.md).

Architecture: [`docs/architecture.md`](../../docs/architecture.md).

## Prerequisites

- Read `USER.md` and `calibration/calibrated-courses.md`
- Courses = `{active_courses}` from `inbox/week.md` / `inbox/courses/*.md`, or MCP `list_courses` when available — never a hard-coded roster

## Steps

### 1. Load memory

1. Read [`inbox/week.md`](../../inbox/week.md).
2. If missing or `Updated:` older than **2 days**: run or ask for `cd browser && npm run sync` (SSO→`/api/v1`), then re-read. Do not stall on missing PAT.
3. If MCP PAT works **and** inbox is stale, you may also call `get_my_upcoming_assignments` — then **write results into inbox** so the next turn stays consistent. Do not maintain a second informal list.

### 2. Gather extras

- Course notes: `inbox/courses/*.md`
- Optional MCP: grades / peer reviews / submission status when PAT is up

### 3. Triage

| Bucket | Meaning |
|--------|---------|
| **Worth the student’s time** | Exams, quizzes, proctored, presentations, builds marked Worth in USER.md, judgment writing, group coord |
| **External / LTI (the student in tool)** | WebAssign, ZyBooks, PlayPosit, other LTI — draft help only |
| **Agent can handle** | Native Canvas low-stakes busywork meeting every auto criterion + calibrated |
| **Ask the student** | Unsure / first submit in a course |

Do not auto-submit from this skill — hand off to `student-assignment-triage` for native Canvas only.

### 4. Priority order (required)

Apply [`student-task-brief`](../student-task-brief/SKILL.md) + [`calibration/priority-rubric.md`](../../calibration/priority-rubric.md):

- Rank open inbox rows **P0–P3**
- Emit full briefing cards for **Top 3** (Why / Outcome / First step / Time box / Mode)
- Batch same-platform LTI; list deferred P3 briefly
- End with one **Do first** sentence

If the student asks to save focus, write [`inbox/focus.md`](../../inbox/focus.md) from the Top 3 (not a second due-list).

### 5. Output

Note **source** (`inbox` from sso-session-api / MCP / merge). Include:

Quick stats → Worth your time → External/LTI → Agent can handle → Ask → By course → **Focus briefing (Top 3 + batch + Do first)**.

## Goal lens

Flag team/pitch/project/build work that matches career priorities in `USER.md` early.
