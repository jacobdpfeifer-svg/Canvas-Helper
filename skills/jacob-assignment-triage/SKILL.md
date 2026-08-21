---
name: jacob-assignment-triage
description: Classify Jacob's Canvas assignments using JACOB.md triage rubric; draft process help; auto-submit only when every low-stakes criterion is met. Use for "triage my work", "can you submit this", "what's busywork", "handle my homework".
---

# Jacob assignment triage

Decide what deserves Jacob’s attention versus agent process help / rare auto-submit.

## Prerequisites

- Read [`JACOB.md`](../../JACOB.md) fully
- Check [`.jacob/calibrated-courses.md`](../../.jacob/calibrated-courses.md) — if the course is not listed, **do not auto-submit**
- Student write tools enabled if submitting (`submit_assignment`)
- When unsure → **ask Jacob** (never stretch auto-submit)

## Always Jacob (stop; do not submit)

- In-person / proctored quizzes and exams
- Presentations or classmate coordination
- Essays, cases, pitches, reflections, originality-heavy work
- Group work that binds others
- Course not yet in `.jacob/calibrated-courses.md`
- CSCI 1200 work by default (worth his time) unless he explicitly marks an item busywork

## Auto-submit path (only if ALL are true)

1. Course is listed in `.jacob/calibrated-courses.md`
2. Online, individual, non-proctored (not a quiz/exam)
3. Low stakes vs goals
4. Mechanical answer already clear
5. No classmate coordination
6. Syllabus does not forbid agent writes (`get_syllabus` / course policy)
7. Log a visible **why auto** one-liner in the chat response (never hide the preview)

### Wire steps

1. `get_assignment_details` + `get_my_submission` (attempts, type, points)
2. `submit_assignment` **without** `confirmation_token` → preview (must surface points + submission types)
3. **Always show Jacob the preview text and why auto in the response** — do not hide the preview
4. If every auto criterion passed: redeem with same args + `confirmation_token`
5. Report: what was submitted, course, **why auto: …**

If any criterion fails → draft process help and ask. Do not redeem the token.

## Process-help default (most items)

For Worth-Jacob / Ask buckets:

- Outline steps, checklist, draft text/code comments
- Point to files/pages via `list_modules` / `get_page_content` / `read_course_file`
- Do **not** post discussions unless Jacob says so
- Do **not** redeem submit tokens unless auto bar passed or Jacob approved the preview

## Output

```
## Triage result

### Worth your time
…

### Asked you
…

### Auto-submitted (if any)
- … — why auto: …

### Preview shown (auto path)
…

### Drafts ready for you
…
```
