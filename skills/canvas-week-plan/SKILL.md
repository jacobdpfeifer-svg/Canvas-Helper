---
name: canvas-week-plan
description: Build a weekly plan and schedule from inbox/week.md (after sync). Triages with USER.md. Use for "what's due this week", "plan my week", "weekly check", "schedule my assignments" — not raw inbox file maintenance.
schema_version: 1
category: canvas_read
requires_cloud: false
---

# Canvas Week Plan

Generate the student’s weekly plan from the **single due-list contract** (`inbox/week.md`), then triage with [`USER.md`](../../USER.md).

Architecture: [`docs/architecture.md`](../../docs/architecture.md).

## Prerequisites

- Follow [`../_SESSION.md`](../_SESSION.md)
- Read `calibration/calibrated-courses.md`
- Courses = `{active_courses}` from inbox / MCP `list_courses` — never a hard-coded roster
- Read the **Learning profile** section of `USER.md` ([schema](../../docs/design/learning-profile.md)) — priors, not fixed labels

## Steps

### 1. Load memory

After session boot: if MCP PAT works **and** inbox is still stale, you may call `get_my_upcoming_assignments` — then **write results into inbox**. Do not maintain a second informal list.

### 2. Gather extras

- Course notes: `inbox/courses/*.md`
- Optional MCP: grades / peer reviews / submission status when PAT is up

### 3. Triage

Use buckets from [`student-assignment-triage`](../student-assignment-triage/SKILL.md) (Worth / External / Agent / Ask). Do not restate criteria here. Do not auto-submit from this skill — hand off to that skill for native Canvas only.

### 4. Priority order (required)

Apply [`student-task-brief`](../student-task-brief/SKILL.md) + [`calibration/priority-rubric.md`](../../calibration/priority-rubric.md):

- Rank open inbox rows **P0–P3**
- Emit full briefing cards for **Top 3** (Why / Outcome / First step / Time box / Mode)
- Batch same-platform LTI; list deferred P3 briefly
- End with one **Do first** sentence
- Shape each card with the Learning profile:
  - `practice_format: retrieval` → open **First step** with a quick self-check question ("could you explain X before opening it?") before the walkthrough; `worked_example` → lead with the walkthrough itself.
  - `autonomy: directive` → state the next step as an instruction; `choices` → offer 2 reasonable next steps and let the student pick.
  - `chunk_size: short` → keep Top-3 in small, separately time-boxed steps (Top-3 style); `long` → it's fine to present one consolidated block for a single sit-down.
  - `check_depth: thorough` → keep a self-check even when `practice_format: worked_example`; `light` → do **not** stack an extra confirmation on top of retrieval-first.
  - On each Top-3 card, tag the format used as `Format used: retrieval|worked_example` (whichever framing you actually applied to that card's First step).

If the student asks to save focus, write `{user_root}/inbox/focus.md` from the Top 3 (not a second due-list).

### 5. Format feedback (required once per week-plan turn)

After presenting Top-3 + **Do first**, ask once:

> Was the [quiz-first / worked-example] framing helpful for the Do-first item?

Then record a **format-specific** signal (never treat palette/route success as a learning-profile signal):

```bash
# Helped → value = format used on Do-first
# Confusing → value = the opposite format
python -m canvas_mcp.core.learning_profile signal \
  --field practice_format --value <used_or_opposite> --delta 1
```

Honor `DEV_USER_ROOT` if set. Autonomy / chunk_size / check_depth stay prior-only until a skill has a real signal for those fields.

### 6. Output

Note **source** (`inbox` from sso-session-api / MCP / merge). Include:

Quick stats → Worth your time → External/LTI → Agent can handle → Ask → By course → **Focus briefing (Top 3 + batch + Do first)** → format-feedback question.

## Goal lens

Flag team/pitch/project/build work that matches career priorities in `USER.md` early.
