# Decision: read-only + study-focus pivot — 2026-09-11

Signed by Jacob in conversation on 2026-09-11 (not an escalation — do not re-litigate
in a future audit pass). Supersedes any earlier framing of this repo as a general
student-agent-automation platform. Research backing this call is summarized below;
detail lives in chat history, not restated here.

## The decision

The product is a **read-only Canvas companion that helps a student plan and study**.
It is not an agent that acts on a student's behalf toward anyone else — an
instructor, a classmate, a recipient of an email, a calendar invite another person
can see. If an action would be visible to, or binding on, another person, this
product does not perform it. It only reads, summarizes, and drafts for the student
to send themselves.

Why (research, 2026-09-11 session): the two most-installed Canvas browser extensions
(BetterCampus/Better Canvas, Gesso — 1.5M+ users combined) are pure read-only UI
polish: themes, grade views, GPA calculators. None of them act on the student's
behalf. Separately, a controlled study of students using a general-purpose AI agent
(arXiv 2607.18257) found trust collapses specifically around actions that are
irreversible or visible to someone else — not around "high stakes" in the abstract —
and that acting without a preview produces delegation regret even when the action
succeeded. Both signals point the same way: read + draft is the trusted, wanted
shape; execute-on-behalf-of is not.

## What changes

1. **Delete the execution path, not just the confirmation gate, for anything
   visible to another person.**
   - `submit_assignment` (`src/canvas_mcp/tools/student_write.py`): keep the
     preview (assignment info, points, due date, attempt count) — delete the
     POST-to-Canvas branch, the upload pipeline, and the `ConfirmationGuard`
     token machinery built to protect it. The tool always ends in "submit this
     yourself in Canvas."
   - `mcp-servers/gcal/server.py`, `mcp-servers/apple-cal/server.py`:
     `create_event` / `update_event` stop writing to the real calendar. Mirror
     the pattern `mcp-servers/gmail/server.py` already uses for `send_email` —
     a hard-blocked stub, no API call, no ledger write.
   - `mcp-servers/gmail/server.py`: already correct (`send_email` is a
     no-op stub, `create_draft` never sends). No change needed — noted here so
     a future pass doesn't "fix" it back toward sending.
   - Consequence: `ConfirmationGuard` / `connector_guards.get_connector_guard`
     lose their reason to exist on the send/submit side. Leave the
     `ConfirmationGuard` class itself (it's generic, cheap, and still used
     wherever a real local write remains, e.g. `apply_labels`/permission
     changes) but do not build new send/submit-shaped gates on top of it.

2. **Do not build a RateMyProfessors integration.** Their ToS explicitly
   prohibits scraping and they've sent cease-and-desist mail to developers who
   tried. Do not spend effort here even as a "read-only" scrape — it is not
   read-only from RMP's side. Redirect the underlying need (what does this
   professor actually want) to the syllabus/rubric/assignment-instructions the
   student already has legitimate access to via `/api/v1`.

3. **Syllabus/assignment/grading extraction — already built, correction from
   2026-09-11.** This item was originally written up as "not built" and a
   spec for future work. That was wrong: `skills/student-instructor-profile`
   already does this — it synthesizes grading weights, rubric requirements,
   late-policy language, and behavior preferences from the syllabus,
   assignment rubrics, policy pages, and announcements into `## Instructor
   profile` in `{user_root}/inbox/courses/CODE.md`, with a documented source
   priority and staleness/refresh rules. It's already wired into
   `student-assignment-triage`, `canvas-discussion-facilitator`, and
   `student-course-arc`. One inconsistency found and fixed 2026-09-12: its
   "external research" step named RateMyProfessors as a weak-hint source,
   which contradicts item 2 above — removed, redirected to syllabus/rubric.

   **The real remaining gap:** this profile is pulled when an agent is
   already doing course-specific work (triage, drafting), not surfaced
   proactively in the daily check-in/brief. `student-task-brief` only reads
   it for discussion-type tone/citation prefs — a student doing, say, an
   essay due Friday does not automatically see "worth 20% of your grade,
   rubric wants X" in the daily snapshot unless something asks for it. That
   surfacing is the actual next build here, not extraction from scratch.

4. **Restyle `learn_loop`/`habit` gamification, don't rebuild it.** Keep
   spaced retrieval and the daily due-check as-is — they're already correctly
   un-gamified per their own docstrings ("not a streak," "never shames"). Any
   UI gamification layer (progress bars, mastery indicators, session
   completion) must have **no possible broken/failed state** — no streaks, no
   leaderboards, nothing that can go backward. `docs/design/class-standings.md`
   ("optional hideable class leaderboard") stays **framed, not built** — this
   decision reads as a lean toward never building it, not just deferring it.

5. **Delete `src/canvas_mcp/core/self_improve/*`** (`distill.py`, `shadow.py`,
   `promoter.py`, `cluster.py`, `drafter.py`, `logger.py`, `run.py`,
   `__init__.py`). No external demand signal for a system that rewrites its own
   prompts from its own shadow runs — it serves the system, not the student,
   and it's real complexity (skill_router request-logging dependency, four
   test files). Remove the `skill_router.py` import and the request-logging
   call site it feeds; request logging itself is not required to survive this
   cut unless something else already depends on the log file's contents (check
   before assuming it's dead).

## Addendum — 2026-09-12: comment_on_my_submission closed

The 2026-09-11 pass left `comment_on_my_submission` executing for real
(explicit scope note above). Jacob decided in conversation on 2026-09-12 to
close that inconsistency: a submission comment is visible to the instructor,
same category as `submit_assignment`, so it is now preview-only too — same
treatment, no execution path, no confirmation flow. `mark_module_item_done`
remains untouched (private, self-only, no external visibility).

## What agents must not do

- Do not re-add a send/create-event/submit/comment execution path "for
  convenience" or "since the guard already exists" — the guard existing is
  not authorization. This includes `comment_on_my_submission` (closed
  2026-09-12, see addendum above).
- Do not build RateMyProfessors scraping in any form, including a "just reads
  the page the student is already looking at" framing — the ToS violation is
  on the automated-access side, not the content side.
- Do not add streaks, leaderboards, or any mechanic with a losable state to the
  learn_loop/habit surfaces.
- Do not treat item 3 (syllabus/grading extraction) as done because this doc
  exists — it is a spec, not an implementation.
