# Student workflow P0 report — 2026-09-30

Finished the context-aware Ask slice. Ordinary homework answers and drafts are not gated on `agent_writes`, syllabus write policy, or an academic-integrity profile. Canvas submit, comment, and discussion stay preview-only. Live quizzes, proctored items, and external tools are not answered.

The build note at `docs/handoff/student-workflow-build-2026-09-30.md` was edited during this pass to require a trusted syllabus policy before homework prose. That file was left as written. This implementation follows the approved finish plan: missing, unknown, or denying course policy is not a reason to refuse an answer, a walkthrough, a mastery diagnosis, or a Make/handle draft.

## What shipped

A student can paste a question on Home, ask about the current study item, or choose “Ask about this” on a Canvas assignment in the extension. The study core stores one private Ask record, classifies the job and boundary locally, selects a small evidence packet, and returns one of four modes: Answer now, Walkthrough, Mastery, or Make/handle. Switching mode keeps the same question.

The reply shows, in order, the question type, the context chip, one sentence, a short explanation, assumptions and a check status, one next action, and the other modes. The chip is `course · assignment · boundary · due`. Course stays blank when the evidence is weak. The student can correct course, assignment, boundary, and due for that Ask only. A due correction that disagrees with Canvas is listed as a conflict and shown as the student’s value. A quiz or external-tool boundary cannot be downgraded into an answer.

Ordinary homework can be solved, including when the synced syllabus says `agent_writes: deny` or names an `allow_tools` list. A title that merely says “Midterm” is not a live quiz. A Canvas quiz type, a proctored flag, or an external/LTI tool blocks the item answer. Walkthrough on a live item withholds that answer and points at a parallel problem. Generating the parallel problem itself stays P1.

Mastery is a diagnosis of the first missing prerequisite and the next rung. It does not award mastery. Audio is stored as a kind and returns “Recording is not part of this slice.” A screenshot with no readable equation, diagram, axis, or table says what is missing and does not invent the figure.

Verify uses `checkers.check_field` for numeric, expression, choice, and true/false work, including the power-rule case as an expression checker. It reports the first mismatch. Unsupported checkers abstain.

The answer plan is built before any relay call and includes `next_action_candidates`. There is no `policy_status`. A connected relay may write prose only inside that plan, using `generate`, `feedback`, `hint`, and `repair`. Course ids and Canvas URLs are stripped before that call. With no relay session, the local plan is returned and the UI says prose was not generated.

When no Ask is open, Home’s subject is the one ranked open item. Opening Ask, or showing an Ask result, replaces that subject. Study packet sessions stay, and “Ask about this item” uses the same `ask-create` command. The packet “Ask for AI feedback” button stays on the study attempt. It is not a second Ask store.

## System map

| Concern | Owner |
|---|---|
| Ask records, classification, context, plans, ranking | `src/canvas_mcp/core/study/ask.py`, written only through `StudyService` |
| Commands | `ask-create`, `ask-get`, `ask-current`, `ask-correct`, `ask-mode`, `ask-rank`, `ask-pending` |
| Process | The app runs `python -m study` with cwd `src/canvas_mcp/core`, not `python -m canvas_mcp.core.study` |
| Storage | `{user_root}/study/asks/{id}.json` and `study/ask-current.json`, schema 1. Unknown schemas are rejected. No migration: the stored shape did not change. Not an event log and not app localStorage |
| Extension handoff | Native host `queue_ask` writes `{user_root}/study/ask-inbox/*.json`. Home promotes it with `ask-pending`. The extension does not call a model. If the host is down, the panel says to connect the app |
| Relay | Existing `study/ai.py` request fields only |
| Home / Study UI | `app/src/ask/AskPanel.tsx`. Open-work order in `app/src/ask/rank.ts` matches `rank_open_work` |
| Freshness next step | `pickNextStep` uses the same meaningful-points rule inside its existing 7-day pool, then the recent-missing pool |

Triage’s Worth / Agent / Ask buckets stay a classification of what kind of help an item needs. They are not this ranker. `teach_hint._do_first_row` already sorts by due date and then points. It was re-checked and left in place.

## Files changed

- `src/canvas_mcp/core/study/ask.py`
- `tests/core/test_study_ask.py`
- `app/src/ask/AskPanel.tsx`, `AskPanel.test.tsx`
- `app/src/views/HomeView.tsx`, `HomeView.test.tsx`
- `app/src/views/StudyView.test.tsx`
- `app/src/study/types.ts`, `format.ts`, `format.test.ts`
- `app/src/test/fakeStudy.ts`
- `app/src/spatial.css`
- `app/extension-chrome/sw.js`, `panel.js`, `lib/format.js`
- `browser/scripts/lib/freshness-dashboard.mjs`
- `browser/tests/freshness.test.mjs`, `extension-format.test.mjs`

## Trust audit

Changed, each with a regression test:

- Extension due lines and Study `fmtWhen` now include a local timezone name and the IANA zone. Home already did.
- Freshness `pickNextStep` drops completed items and, inside its existing pool, prefers items worth at least 10 points, then the soonest due, then higher points. A 5-point item due sooner no longer beats a 10-point item.

Left as already correct:

- Submitted, graded, and pending-review rows stay out of open lists. Late work stays visible on purpose.
- A normal `online_upload` assignment is not labeled a calendar feed or tool gap.
- Canonical `week.md` is an explicit 7-day window (`WEEK_TABLE_DAYS`). The adapter’s unused 14-day default is not the sync path and is not a silent 30-day list.
- Course-file meta parsing already refuses a value that is the next field label or a following heading.
- The 2026-09-21 reliability fixes (missing submissions, carry-forward, late versus completed, path confinement) were not touched.

## Tests

Baseline before these edits: `tests/core/test_study_ask.py` — 16 passed.

Final:

| Command | Result |
|---|---|
| `uv run python -m pytest tests/ -q` | 827 passed, 20 skipped |
| `cd browser && npm test` | 219 passed |
| `cd app && npm test` | 63 passed, 1 failed |
| `cd app && npm run build` | passed |

The app failure is `CalendarView`: it looks for a heading “Homework 1” whose fixture starts `2026-09-22`, and `nextEvent` only keeps items from the start of today. Today is 2026-09-30, so the subject is “Nothing scheduled.” Calendar code was not part of this slice.

Ask, rank, Home, Study, and `fmtWhen` tests passed, including chip correction, Home replacing the ranked subject while Ask is open, and Study “Ask about this item” calling `ask-create` with the seeded stem.

Covered fixtures: power-rule calculus with student policy text ignored, first-mismatch verify, numeric and choice checkers, unsupported checker abstention, screenshot with no readable diagram, reading brief, admin checklist, draft with a denying `agent_writes` line and no policy field, quiz and proctored refusal, online-upload homework that is answered, Canvas-versus-note due conflict, student due override that does not rewrite the course file, weak context with a blank course, extension inbox promotion, and rank with a completed row dropped.

## UI smoke

The Vite dev server on `127.0.0.1:1420` was up. Home showed Ask. Opening Ask replaced the empty-course line with the question form. Pasting `Find the derivative of x^2` and submitting reached the study bridge, which answered `missing or wrong X-Study-Token`. No relay credentials, Canvas write, email, or calendar write was used.

The click-through of chip correction, mode switch, quiz refusal, thin screenshot, and extension promotion was done in Vitest and pytest, not in that shell.

## Limitations

- Deterministic checking covers the existing numeric, expression, choice, and true/false checkers, plus the power rule as an expression. Other subjects abstain.
- Relay prose is optional. With no relay session the plan is still returned.
- Walkthrough on a live item withholds the item answer. It does not generate a new parallel problem. That is P1.
- Mastery does not fade examples, schedule a delayed check, or pick a department skill.
- Recording, meeting consent, and cross-platform “what changed” explanations are P2.
- The extension sends Canvas `submission_types` and quiz or external-tool metadata. It does not infer a quiz from the title, and it sends a course hint only when a non-numeric course label is already on the assignment.
- The extension can read a text selection only when the Canvas content script answers. Otherwise it sends the assignment text it already loaded.

## Deferred

P1: engineering department pack, instructor-method retrieval beyond synced sources, full Mastery ladder, saved corrections that schedule review, parallel problems, richer checkers, full artifact and slide rendering. The first Mastery skill is unknown until a later slice can read a real course inbox.

P2: local recording and post-session notes, meeting consent, audio classification, cross-platform correlation, proactive change explanations.

No blocking product question. The build note and this report disagree on whether homework answers require `agent_writes`. This slice does not require it.
