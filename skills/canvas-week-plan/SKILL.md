---
name: canvas-week-plan
description: Jacob's weekly planner from inbox/ (SSO→API sync) or MCP if PAT works. Triages with JACOB.md. Use for "what's due", "plan my week", "weekly check".
---

# Canvas Week Plan (Jacob IBE)

Generate Jacob’s weekly plan from the **single due-list contract** (`inbox/week.md`), then triage with [`JACOB.md`](../../JACOB.md).

Architecture: [`docs/HYBRID.md`](../../docs/HYBRID.md).

## Prerequisites

- Read `JACOB.md` and `.jacob/calibrated-courses.md`
- Courses: APPM 1235, BCOR 1030, CSCI 1200, ECON 2010, COEN 1500 (+ readiness/orientation if present)

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
| **Worth Jacob’s time** | Exams, quizzes, proctored, presentations, CSCI build, judgment writing, group coord |
| **External / LTI (Jacob in tool)** | WebAssign, ZyBooks, PlayPosit, other LTI — draft help only |
| **Agent can handle** | Native Canvas low-stakes busywork meeting every auto criterion + calibrated |
| **Ask Jacob** | Unsure / first submit in a course |

Do not auto-submit from this skill — hand off to `jacob-assignment-triage` for native Canvas only.

### 4. Output

Note **source** (`inbox` from sso-session-api / MCP / merge). Include:

Quick stats → Worth your time → External/LTI → Agent can handle → Ask → By course → Suggested order.

## Entrepreneurship lens

Flag team/pitch/project/CSCI build work early.
