---
name: student-inbox-week
description: Maintain and repair inbox/week.md as durable Canvas due-list memory (SSO sync or paste merge). Use for "update my inbox", "merge due list", "inbox stale", "refresh week file" — not weekly scheduling or priority briefing.
schema_version: 1
category: canvas_read
requires_cloud: false
---

# the student inbox week

`{user_root}/inbox/week.md` is the agent’s **memory** of Canvas due work — not a competing truth source. Prefer filling it via SSO→REST sync. Session boot: [`../_SESSION.md`](../_SESSION.md).

## Preferred refresh

```bash
cd browser && npm run sync
```

(After `npm run open-canvas` if the session expired.)

## Manual / merge

1. Read current `{user_root}/inbox/week.md` (create from sync if missing).
2. Merge items; set `Updated:` and `Source:` (`sso-session-api` | `manual paste` | `mcp`).
3. Flag WebAssign / ZyBooks / PlayPosit / proctored in Notes.
4. Update `inbox/courses/CODE.md` for deep notes when useful (sync also refreshes **Assignment catalog** + **Checkpoints**).
5. Offer `canvas-week-plan`, `student-task-brief`, or `student-course-arc` (when the student names a course).
6. If the student asks to save focus: write `{user_root}/inbox/focus.md` from `student-task-brief` Top 3. Never treat focus as a competing due-list — `week.md` stays canonical.

## Rules

- Never store passwords.
- Prefer process help over submission.
- Do not invent a second due-list outside `inbox/` (`focus.md` is a dated Top-3 cache only).
