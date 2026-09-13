---
name: student-gpa
description: Local GPA estimate and what-if from Canvas grades plus student credit-hours. Use for "what's my GPA", "what if I get a B in X", term or cumulative GPA.
schema_version: 1
category: canvas_read
model_tier: fast
requires_cloud: false
---

# Local GPA estimate

Compute a **local estimate** from synced Canvas grades and student-maintained credit hours. Not the official transcript, SAP GPA, or major GPA.

## Instructions

### 1. Gather inputs

1. `{user_root}/inbox/grades.yaml` (from `npm run sync`)
2. `{user_root}/calibration/credit-hours.yaml` — fill missing codes; never invent hours
3. `{user_root}/calibration/completed-terms.yaml` — for cumulative history Canvas no longer holds
4. School `grade_scale` via `schools/{slug}.yaml` (CU Boulder ships A-/B+ edges)

Run:

```bash
python -m canvas_mcp.core.gpa --school cu-boulder
# optional what-if (local only — never writes synced files):
python -m canvas_mcp.core.gpa --school cu-boulder --what-if CSCI1300=B
```

Honor `DEV_USER_ROOT` if set.

### 2. Report

```markdown
## GPA (local estimate)

Not official transcript / SAP / major GPA — confirm in Buff Portal.

- **Term:** X.XXX (quality hours …)
- **Cumulative:** X.XXX (includes completed-terms.yaml + current)
- **Missing credit hours:** CODE, … → ask student to add to `calibration/credit-hours.yaml`
- **What-if** (if asked): …

### vs your floors (from USER.md)

- Good-standing / scholarship / grad-school floors — flag only if estimate is near or below. Never claim scholarship eligibility.
```

### 3. Rules

- Exclude P / W / I / IP / NC-style letters from quality hours
- Do not invent credit hours; skip + list missing codes
- Do not claim major GPA or grade-replacement effects unless the student recorded them in `completed-terms.yaml`
- Always say “local estimate from Canvas + your credit-hours file”

## Context

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. `USER.md` Academic floors (optional)
3. `inbox/grades.yaml` + `calibration/credit-hours.yaml` + `completed-terms.yaml`

## Tools available

Read only. Prefer the `gpa` CLI above over re-deriving arithmetic by hand.

## Triggers

- what's my GPA
- what is my GPA
- GPA estimate
- what if I get a B
- what if I get an A
- cumulative GPA
- term GPA
