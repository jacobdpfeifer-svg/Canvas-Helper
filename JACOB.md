# Jacob Pfeifer — Canvas agent profile

Personal source of truth for this fork. Load this file every session before automating Canvas work.

## Identity

- **Student:** Jacob Pfeifer
- **Institution:** University of Colorado Boulder (`canvas.colorado.edu`)
- **Program:** BS Integrated Business and Engineering (IBE), Leeds + CEAS
- **Cohort:** Incoming Fall 2026 (inaugural IBE)
- **Background:** Transfer from Rollins College (+ prior Southeastern University credits); ~business-heavy transfer record; first CU semester is mostly freshman IBE courses
- **Emphasis:** Tech Entrepreneurship / startup (primary)

## Career priorities (ranked)

1. Tech entrepreneurship / startup
2. Software / data
3. Corporate ops / strategy
4. Aerospace
5. Climate tech

Use this ranking when deciding what deserves Jacob’s deep attention versus process automation.

## Fall 2026 courses

| Course | Title | Sections | Agent default |
|--------|-------|----------|---------------|
| APPM 1235 | Pre-Calculus for Engineers | 150, 151 | Exams/quizzes always Jacob; HW process-help, ask before submit unless clearly mechanical busywork |
| BCOR 1030 | Communication Strategy | 018 / 019 / 024 | Drafts OK; live/classmate-facing presentations always Jacob |
| CSCI 1200 | Intro Computational Thinking | 800, 801 | **Worth Jacob’s time by default** (startup + software goals); rarely auto-submit |
| ECON 2010 | Principles of Microeconomics | 100, 113 | Required this term despite ECON 2999TC transfer — never skip Canvas work because of the TC |

Not on this schedule (already transferred where noted): BCOR 1025, BCOR 2202. Expected later: APPM 1350 (after 1235), etc.

## Transfer credit map (CU evaluation)

Not an official degree audit. If Canvas shows a course that also appears below as credited, flag possible duplicate for advising — do not ignore the Canvas course.

### Credited (high signal)

| Source | Source course | CU credit | Notes |
|--------|---------------|-----------|-------|
| Rollins | MGT 101 | **BCOR 2202** TB+ 4.00 RC | Org behavior / management on record |
| Rollins | BUS 236 | **BCOR 1025** TA 4.00 | Business stats done |
| SEU | ENGL1233 | **WRTG 1150** TA 3.00 | LD writing covered |
| SEU | DCOM1433 | **COMM 1300** TA 3.00 RC | Public speaking on record — still escalate live presentations |
| Rollins | BUS 233 | **ECON 2999TC** TB- 4.00 | Did **not** replace Fall 2026 ECON 2010 |
| Rollins | BUS 245 | **INBU 2999TC** TB 4.00 RC | Intl OB elective-shaped |
| Rollins | ENGW140 | **WRTG 1999TC** TA 4.00 | |
| Rollins | MAT 201 | **MATH 2999TC** TA 4.00 | Not APPM 1350 |
| SEU | ENGL1133 | **ARSC 1000** TB+ 3.00 | |
| SEU | MATH1213 | **MATH 1011** TA 3.00 | College algebra — not engineering calculus |
| SEU | HIST / ENGL / HUMS / LATN | Various HIST/ENGL/HUMN/LATN TCs | Gen-ed breadth |

### Did not transfer

| Source | Course | Outcome |
|--------|--------|---------|
| Rollins | RCC100 Profit and Purpose | NTR / remedial |
| Rollins | INT 125 Life/Financial Literacy | NON TRANSFER |
| Rollins | RFLA100C How to Change the World | **NEED SYLLABUS** / NTR — open advising item |

## Automation posture

**Primary job:** help Jacob with academic *processes* (planning, drafts, checklists, peer-review tracking, module progress, grade risk). Submitting work is exceptional.

### Always require Jacob (never auto-submit)

- In-person quizzes / exams / timed proctored assessments
- Presentations or work needing classmate coordination
- Originality / voice / judgment work (essays, cases, pitches, reflections)
- Group work that binds others
- First submission in a course until that course is listed in [`.jacob/calibrated-courses.md`](.jacob/calibrated-courses.md)
- Anything unclear → **ask Jacob**

### Auto-submit allowed only when ALL are true

- Course appears in `.jacob/calibrated-courses.md`
- Online, individual, non-proctored
- Low stakes (completion check, tiny points, clear busywork vs goals)
- Answer is mechanical / already produced with low ambiguity
- No classmate coordination
- Course syllabus policy does not forbid agent writes
- Log a visible one-line **why auto** rationale (and the submit preview) in the response — never hide the preview from Jacob

Wire protocol: `submit_assignment` is still preview → `confirmation_token` → confirm. Autonomy means the agent may redeem the token without asking Jacob when the rubric above says auto — not that the token is removed.

### Discussion / comments

- Default: draft for Jacob’s review
- Post/reply only when Jacob explicitly says to
- `comment_on_my_submission` / `mark_module_item_done`: ask unless clearly trivial completion checkbox work matching auto-submit bar

## Session checklist for the agent

1. Read this file
2. Prefer student Canvas tools (`get_my_*`, shared reads)
3. Triage upcoming work into **Worth Jacob’s time** vs **Agent can handle** vs **Ask**
4. Never take quizzes/tests for Jacob
5. Entrepreneurship lens: flag team/pitch/project work early
