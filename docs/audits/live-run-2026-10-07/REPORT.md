# Live exam-day run — audit (2026-10-07)

First end-to-end run of Kairos against a real CU Boulder Canvas account on an exam day
(APPM 1235 Exam 2, 6:45–8:15 PM MDT). The question asked of the system:
*"Give me context for tonight's exam and how to prepare; then quiz me."*

Scope exercised: SSO session check → `npm run sync` → learn_loop reconcile → freshness tick
(20 tokenized feeds) → study service (`canvas-sources`, `canvas-import`, `offer`, `start`,
`submit`, `ask-create`) → app `buildExamPlan` (the Exam Prep screen's planner) → test suites.

Personal grades, section, and raw evidence are **not** in this file. They live in
`{user_root}/audit/live-run-2026-10-07/` (sync log, ask responses, exam materials,
pre-run study backup).

## 1. Verdict

The **data plane is healthy**: the sync completed 10/10 courses with `fresh_complete`. The
freshness tick polled 20 feeds with 0 errors, and the dashboard's skip-cost for Exam 2 was
accurate and useful.

The **exam-prep plane failed the student**. Every source of "what's on the exam" was in
reach (syllabus core topics, the Exam 2 announcement, a study guide, a review set, and an
answer key), but none of it reached a student-facing answer:

| Surface | What it produced for "Exam 2 tonight" |
|---|---|
| Exam Prep screen (`buildExamPlan`) | Study "Written HW 10" (post-exam material) + "Written HW 1" today; "Review everything" **tomorrow, after the exam** |
| Study `offer` (quiz me) | "Sources exist but no practice item is ready" — 73 sources imported, 0 items |
| Study `ask` | No course matched; "Prose was not generated"; generic next step |
| `week.md` / dashboard | "Exam 2 due 8:15 PM" — that is the exam **end** time; start was 6:45 |
| Freshness digest | Exam reminder detected, but the body was cut at ~300 chars, dropping what to bring and the formula policy |

Existing tests: **Node 303/303 pass; Python 839 pass, 1 fail** (unrelated regression, D21).
None of the defects below are caught by the suite.

## 2. Run timeline and performance

| Step | Wall time | Result |
|---|---|---|
| `check-session` (headless) | 7.3 s | `loggedIn: true` |
| `npm run sync` | 125 s total | complete, 10 courses; ~95 s Canvas, ~25 s spent on a failed Python mirror build (D9) |
| Peak RSS (sync) | 342 MB | — |
| `learn_loop reconcile` (in sync) | — | **failed** (D9) |
| `learn_loop reconcile` (manual, `PYTHONPATH=src`) | 1.0 s | 0 updated, 2 skipped as ambiguous (D10) |
| `npm run freshness` | 48.8 s | 20 feeds, 0 errors, 11 new events (≈2.4 s/feed — likely sequential) |
| Study CLI per call | ~1.0 s | process start dominates |
| `canvas-import` APPM | 0.9 s | **failed** on syllabus length (D5); 0.9 s without syllabus |
| Module file fetch (probe, in-page `fetch`) | ~1.4 s/PDF | works |
| Module file fetch (probe, `page.request.get`) | 30 s timeout | **hangs** (see D20) |

State before the run: `week.md` last updated **2026-09-22** (15 days stale). `inbox/freshness/` did
not exist (freshness had never run on this profile). `focus.md` held the Sep 22 Top-3.

## 3. What worked

- **SSO → `/api/v1`** with no PAT: 12 endpoint classes requested and completed. One expected 403
  (discussions in a non-academic org course) was recorded as `unavailable_endpoints`, not a failure.
- **D1 from the 2026-10-05 audit looks fixed**: week/catalog rows now carry `<!-- due:YYYY-MM-DD -->`.
- **grade-truth `graded_only`** computed a course percent where Canvas hides totals. The dashboard's
  `next_step` skip-cost (current / if-zero / if-full / swing / share-of-final) was correct and
  is the single most decision-useful thing Kairos showed today.
- **Freshness** surfaced the instructor's "Reminder: Exam 2 tomorrow" announcement within one tick.
- **Boundaries held**: no Canvas writes. Exam and Gradescope work were labeled student-only.
  `feeds.json` and raw snapshots are 0600. Study attempts were labeled honestly
  ("immediate_practice", "your key, quoted from instructor material").
- **Study engine mechanics** (offer → start → submit → key reveal → evidence labeling) worked once
  items existed.

## 4. Defects

Severity: **P0** = gives the student wrong or empty exam-day guidance. **P1** = wrong or stale data
or a silent failure. **P2** = noise or polish.

### P0 — exam-day guidance

**D1. Exam Prep planner picks wrong topics and plans past the exam.**
`app/src/examPlan.ts` drew "Written HW 10" (due Oct 27, chapters after Exam 2) and "Written HW 1"
by seeded shuffle of assignment titles. It has no notion of exam scope. `dayKey()` uses
`toISOString()` (UTC), so an exam ending 8:15 PM MDT keys to Oct 8 and the plan adds a
"Thu, Oct 8 — Review everything" day after the exam.
*Fix:* key days in the school zone. End the plan at exam start. Draw topics only from
scope evidence (D3/D4), and when none exists, say "scope unknown — check the Exam Information page".

**D2. Exam due_at is treated as exam start.**
Canvas `due_at` for a proctored exam is the end of the window (8:15 PM). Kairos rendered "due 8:15 PM"
(week.md, catalog, dashboard), and the study service set `cutoff_at` = 7:15 PM. That is
**30 minutes after the exam started**, so cram offers would still be live mid-exam.
The real window (6:45–8:15) was in the course's Exam Information page and in the announcement.
*Fix:* for `outcome:exam` items, parse a start time from module-linked exam pages and announcements
(D3/D4). Until one is found, label the time "ends 8:15 PM — start time unknown" and set the
study cutoff conservatively (for example, due − window length, or the morning of).

**D3. Module-linked exam materials are never synced.**
APPM's Week 8 module holds *Exam 2 Study Guide.pdf*, *Exam 2 Review Practice Problems*,
*…Answers*, and the course-info module links an *Exam Information* page (times, rooms by
section, review sessions). `modules.json` was fetched, but File and Page module items are not
followed. `pages.json` is `[]` because the course pages index is closed to students, while
module-linked pages are readable. Study sources for APPM were 1 syllabus + 73 assignment stubs.
*Fix:* follow module items of type `Page` (`/api/v1/courses/:id/pages/:url`) and `File`
(`/api/v1/courses/:id/files/:id` → in-page `fetch` of `url`, which took ~1.4 s per PDF in the probe).
Extract text (pdftotext when present, else keep the file as an attachment source). Prioritise
modules whose items mention the next exam. All of this is GET-only on the student's own session.

**D4. Announcement bodies are truncated to ~300 chars.**
The Exam 2 reminder held the section list, "no recitation Thursday", the WebAssign date move,
the provided-formula policy (circle; sum/difference of cubes only), the must-know formulas,
what to bring (BuffOne card, phone with a scanning app for the Gradescope upload), and the illness
policy. `detail.preview` stopped at "…and 3.1 i…". The digest's `actions` extraction also missed
the date change.
*Fix:* store the full sanitized body for announcements (local only). Keep `preview` for UI.
Run action/date extraction on the full text.

**D5. `canvas-import` is all-or-nothing on source length.**
The APPM syllabus is 31,116 chars against a 20,000 cap, so the whole course import failed with
`validation`. The syllabus is the only synced source naming Exam 2 core topics.
*Fix:* import with the oversized source chunked or truncated and flagged (`truncated: true`),
never fail the packet.

**D6. Quiz-me dead-ends without the hosted AI.**
`ai-status: connected=false`. A successful import yields `items: 0`. `offer` returns
`no_eligible_item / action: create`, and the Exam Prep screen shows "No practice items for this
exam yet". The review set + answer key (D3) are a ready-made, instructor-provided item bank.
*Fix:* a local, deterministic path that turns paired review/answer PDFs into items, with the answer
PDF as `support_refs`. Also, `author_item` requires a verbatim quote from an **imported** source,
so a student cannot author items from exam materials Kairos never imported. D3 unblocks that too.

**D7. `ask` doesn't resolve the course or use imported study material.**
"I have my APPM 1235 Exam 2 tonight…" → `course_label: ""` and "No course source matched". With an
explicit `course_hint`, it found the Exam 2 assignment and syllabus, but for a domain question
it **did not select the imported study-guide packet** containing the exact rule. With AI off it
returned "Prose was not generated" and a generic next step. The chip shows raw UTC
(`due 2026-10-08T02:15:00Z`).
*Fix:* match course codes (`APPM 1235`) and exam labels in free text against `study-sources` and
exams. Include student/instructor packets in source selection. Render times in the school zone.
Without AI, return the selected sources themselves (locators + excerpts) rather than an empty plan.

**D8. Checkers mark correct answers incorrect.**
- Expression checker: `(-∞, 2) ∪ (2, ∞)` (the course's own notation) → **incorrect**.
  `(-inf,2)U(2,inf)` → correct.
- Numeric checker: `1/2` for key `0.5` → **incorrect**, with the note "state one value, not several
  numbers". The key's own explanation reads "= 1/2".

These write false "incorrect" evidence into stability.
*Fix:* normalise ∞/inf, ∪/U, whitespace, and interval brackets. Evaluate simple fractions
in numeric fields. When parsing is ambiguous, abstain rather than mark incorrect.

### P1 — stale, wrong, or silent

**D9. `scripts/py-mirror-run.sh` doesn't mirror `schools/`.**
`pyproject.toml` force-includes `schools`, so every fresh mirror fails `uv pip install -e .`
(`Forced include not found: …/kairos-build/schools`). Reconcile is skipped on every sync. The
failure costs ~25 s and is logged as a one-line warning buried under a traceback.
*Fix:* rsync `schools/` too, and make the sync's final JSON report `reconcile: failed`.

**D10. learn_loop reconcile leaves reviews anchored to past checkpoints.**
Both remaps were skipped as "ambiguous checkpoint move". `due` still prints "next check before
2026-09-25" (12 days past). The loop has 3 claims and **none for the course with tonight's exam**.
*Fix:* when the anchor checkpoint is past and the move is ambiguous, anchor to the next dated
checkpoint and say so. Never display a past "before" date as a future deadline.

**D11. `grades.yaml` shows `percent: null` for every course.**
It reads only `canvas_reported` (`no_computed_score`, because CU hides totals), while grade-truth
already holds a `graded_only` percent. GPA, priority, and agent consumers see nothing.
`study-sources` items also carry `score: null, submitted_at: null` for graded work.
*Fix:* write `graded_only` (labelled as such) when `canvas_reported` can't calculate. Carry
score and submission state into study-sources items.

**D12. Weak-area signal exists but no surface uses it.**
Submissions include per-core-topic exam sub-scores tied to an 80% mastery-retake policy (in the
syllabus) and a recitation-quiz trend. That is the best "what to study tonight" signal available,
and nothing reads it.
*Fix:* surface core-topic sub-scores against the syllabus mastery line in exam prep. Rank prep
topics by it.

**D13. Synthetic fixture courses are in the real profile.**
`inbox/study-sources/3101–3104.json` (CSCI 2270, MATH 2300, PHYS 1110, WRTG 3030; fetched
2026-09-19) appear in `canvas-sources` next to real courses. Some test or harness wrote to
`app-support/dev` instead of an isolated root.
*Fix:* delete them, and make the factory refuse a user root that holds a real `auth/browser`.

**D14. Staleness is not surfaced.**
Fifteen days passed between syncs, and `focus.md` (dated 2026-09-22, three items due 09-23) stayed
as-is. `sync-health` knows `stale_after_ms` = 24 h, but nothing flagged it before today's manual sync.
*Fix:* consumers must check `focus.md`'s `Updated:` against today and drop or flag it. Surface
`hard_stale` prominently.

**D15. Calendar suggestions collide and land at the deadline.**
Two 90-min blocks were proposed for the same slot (Thu 9:59–11:29 PM), each ending 30 min before
its deadline. Placement ignores other suggestions and the exam evening.
*Fix:* de-conflict suggestions against each other and against known exam windows. Prefer earlier
slots.

### P2 — noise and polish

**D16. Week table classification noise.**
- Calendar events render as "assignment" rows titled with the section name
  ("CSCI 1200 Fall 26 Section 800", twice).
- Reading Quiz 7 appears twice (assignment + planner quiz).
- An announcement-titled assignment appears ("Reminder that WebAssign 13 (3.2) Due today").
- **Exam 2 is classified `outcome:lti; bucket:B; tool:Gradescope`, not as an exam**, which is why
  downstream exam logic has to infer from the title.
- An org announcement (club tabling) appears as a due item.

**D17. Course catalog gaps.**
APPM "Modules / what's next" is `-` although modules were fetched. "Primary instructor(s)"
lists 12 course-wide staff. Sections and Canvas URL are blank. The student's section, and so
their exam room, is never derived, although `include[]=sections` returns it.

**D18. Exam detection noise in low-priority courses.**
26 "exams" in an ungraded readiness course and 17 in a Leeds org course, both listed in USER.md
as throwaway. Practice quizzes ("Practice for Exam 2") are counted as exams.

**D19. Course key mismatch in study commands.**
`offer --course 141255` and `--course "APPM 1235 Fall 2026"` both returned "No source imported".
Only the full composite label works. The app passes the right key, but agents and CLI users will
hit this.

**D20. Syllabus-PDF discovery can hang.**
`browser/scripts/lib/canvas-snapshot.mjs:32` uses `page.context().request.get(url)` for file
downloads. In the probe the same call hit the 30 s default timeout per file. In-page `fetch`
worked in ~1.4 s. `pdftotext` is not installed on this machine, so extraction is always
"unavailable", silently.

**D21. Test regression.**
`tests/core/test_verification_w5.py::test_gate1_manifests_renamed` fails after the repo-URL
commits (`24c774d`, `8ce34a4`). The asserted substring "jacob" now appears in the real repo owner
`jacobdpfeifer-svg`. Narrow the assertion to the server/package name.

## 5. Security and privacy observations

- **Probe-only cookie exposure.** During this audit, a Playwright `APIRequestContext` timeout
  printed the full request (including `canvas_session`) to stdout. This was in a scratch probe,
  not product code: product `api()` uses in-page `fetch`, and the one product `request.get`
  (D20) swallows errors without logging. Recommend a lint/grep gate: never log
  Playwright request errors verbatim, and prefer in-page `fetch` for files. The session was
  printed to a local transcript only. Signing out and back in rotates it if desired.
- `inbox/*.md` and `grades.yaml` are 0644 while raw snapshots are 0600. Single-user machine, low
  risk, but inconsistent.
- No Canvas-visible writes occurred. All Canvas reads in the probes were GETs on the student's own
  session.

## 6. Not covered by this run

Tauri app rendering (only the planner function was executed), the Chrome extension in a live tab,
voice intake, the PAT MCP server, and Gmail/Calendar connectors. Each needs its own live pass.

## 7. Recommended fix order

1. **D2 + D1**: exam time semantics and the planner's UTC/scope bugs. These are small, and they are
   wrong in a way that hurts on the day.
2. **D3 + D4**: module Pages/Files and full announcement bodies. This unblocks D6 and D7 and fixes
   D2's start-time source.
3. **D8**: checker normalisation. False negatives corrupt the evidence model.
4. **D5, D9, D11**: one-line-class fixes that turn silent failures into data.
5. **D6, D7, D12**: the actual "context for my exam / quiz me" experience, built on 1–3.
6. **D10, D13–D21**: hygiene.

## 8. Regression probes to add

Fold these into `tests/fixtures/synthetic-students/probes/`:

- Exam whose `due_at` is the window end, with the start in a module-linked page → planner and study
  cutoff end before start.
- Exam at 8:15 PM Denver → no plan day after the local exam date.
- Module with File + Page items → appear in study-sources with text.
- Announcement > 1 kB → full body stored; date-change action extracted.
- Syllabus > 20 kB → import succeeds with `truncated: true`.
- Checker: `(-∞, 2) ∪ (2, ∞)` ≡ `(-inf,2)U(2,inf)`; `1/2` ≡ `0.5`.
- `ask` free text naming "APPM 1235 Exam 2" → course and exam resolved without hints.
- Fresh mirror dir → `py-mirror-run.sh` succeeds.

## 9. Side effects of this run on the real profile

- New study packets: `canvas-141255` (73 sources, 0 items) and `appm-exam2-guide` (4 hand-imported
  study-guide sources, 3 items).
- Probe attempts: 10 submissions, several deliberately wrong to test checkers. They now count as
  practice evidence. The pre-run `study/` state is backed up at
  `{user_root}/audit/live-run-2026-10-07/study-pre-run/`.
- A new sync generation, freshness state, and `auth/feeds.json` (0600).
