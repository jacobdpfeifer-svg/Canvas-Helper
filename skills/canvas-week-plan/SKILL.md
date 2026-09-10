---
name: canvas-week-plan
description: Build a weekly plan and schedule from inbox/week.md (after sync). Triages with USER.md. Use for "what's due this week", "plan my week", "weekly check", "schedule my assignments" — not raw inbox file maintenance.
schema_version: 1
category: canvas_read
model_tier: fast
requires_cloud: false
---

# Canvas Week Plan

Generate the student’s weekly plan from the **single due-list contract** (`inbox/week.md`), then triage with [`USER.md`](../../USER.md).

Architecture: [`docs/architecture.md`](../../docs/architecture.md).

## Instructions

### 1. Load memory

After session boot: if MCP PAT works **and** inbox is still stale, you may call `get_my_upcoming_assignments` — then **write results into inbox**. Do not maintain a second informal list. Do not paste the full week file into this prompt; use the supplied inbox slice.

### 2. Gather extras

- Course notes: `inbox/courses/*.md` for the courses named in this turn's slice
- Optional MCP: grades / peer reviews / submission status when PAT is up

### 3. Triage

Use buckets from [`student-assignment-triage`](../student-assignment-triage/SKILL.md) (Worth / External / Agent / Ask). Do not restate criteria here. Do not auto-submit from this skill — hand off to that skill for native Canvas only.

### 4. Priority order (required)

Apply [`student-task-brief`](../student-task-brief/SKILL.md) + [`calibration/priority-rubric.md`](../../calibration/priority-rubric.md):

- Rank open inbox rows **P0–P3**
- Emit full briefing cards for **Top 3** using the shared card in [`student-task-brief`](../student-task-brief/SKILL.md) (Check / Walkthrough / If-then / Format used). Do not restate format, spacing, or diagram rules here — obey the Teach-hint in this turn's slice.
- Batch same-platform LTI; list deferred P3 briefly
- End with one **Do first** sentence. If the slice starts with `Open with:`, ask that check before the new Top-3. If `## Practice` names one overdue item, that clause comes first and replaces a stale Open with.
- When you emit Top 3, write the focus handoff and any learn items exactly as task-brief section 6 specifies (`teach_hint write-focus` / `learn_loop add`). That write is the save if the student asked to pin focus.
- Pre-reading: one pass, then close the source and retrieve. Do not “note 3 takeaways” while the text is open.
- Quiz / exam: extract claims and schedule them until the checkpoint. Cramming the night before is the illusion of mastery, not the plan.
- If `## Due reviews` is in the slice, those checks outrank a new passive reading of the same material. Workflow items (signup, calendar, busywork) stay on the do-loop — do not store them as learn items.
- If `## Practice` or `## Coverage` is in the slice, say that one line in the plan. `in_the_gap` means nothing is due — the gap is the practice. `unextracted` means a quiz is listed and no claims exist yet; do not call that rest. If Practice names one overdue item, start there and do not backfill. Do not add a brief-continuity count, a score, or a second due-list. Brief continuity is not learning evidence.
- If a review-budget line is present, say it once. The student may still study past it. A trail line is not a streak and not learning evidence unless it is the chain sentence for a delayed hit. Do not invent a check to feed the trail. A path or a kept commitment is not a delayed hit. If a commitment or check-in line is present, offer that one action and do not mark it kept.

### 5. Format reply

If the student says “quiz me”, “quiz me instead”, “walk me through”, or “just show me”, record it before rewriting the card (same command as task-brief section 7):

```bash
python -m canvas_mcp.core.teach_hint reply --text "<their words>"
```

A direct reformat request is a start-bias signal only. It does not skip retrieval or the scheduled check. Do not treat palette/route success, silence, time-on-page, or “that felt helpful” as a learning signal. Autonomy / chunk_size / check_depth stay prior-only until a skill has an equally explicit control for those fields.

Do not ask whether the framing felt helpful. If a check felt easy, say ease is a weak signal and keep the scheduled review.

### 6. Output

Note **source** (`inbox` from sso-session-api / MCP / merge). Include:

Quick stats → Worth your time → External/LTI → Agent can handle → Ask → By course → **Focus briefing (Top 3 + batch + Do first)**. If the slice has `## Due reviews` or `Open with:`, that closed-book check is first.

## Goal lens

Flag team/pitch/project/build work that matches career priorities in `USER.md` early.

## Context

Do not paste the inbox here — this turn’s slice is supplied after the learning profile. Do not read the full `inbox/week.md` into this prompt.

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. `{user_root}/inbox/week.md` — due-list rows for this turn (volatile slice, already supplied)
3. Read `calibration/calibrated-courses.md`
4. Read `calibration/priority-rubric.md`
5. Courses = `{active_courses}` from the supplied slice / MCP `list_courses` — never a hard-coded roster
6. Learning profile is already in the stable prefix ([schema](../../docs/design/learning-profile.md)) — priors, not fixed labels. Do not re-paste `USER.md`.
7. Optional: `inbox/courses/*.md` for courses in this turn's slice

## Tools available

Read only. No submit tools from this skill.

- `get_my_upcoming_assignments` — only if PAT works and the inbox is still stale; write results into inbox, do not keep a second list
- Grades / peer reviews / submission status — optional read when PAT is up
- Do not auto-submit — hand off native Canvas submit to `student-assignment-triage`

## Triggers

- what's due this week
- plan my week
- weekly check
- schedule my assignments
