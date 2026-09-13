# Decision: bounded GPA + course-planning scope — 2026-09-13

Signed by Jacob in conversation on 2026-09-13. Amends the CLAUDE.md "Out of
scope" line ("Degree audit engines") from a blanket ban to a bounded feature,
for the reasons recorded below. Does not touch or reopen anything in the
canvas-focus pivot (`canvas-focus-pivot-2026-09-11.md`) — read-only /
preview-only posture toward other people is unchanged.

## What was asked

GPA calculation, and next-semester course suggestions driven by declared
major, stated interests, and target years-to-graduation — plus research into
how human guidance counselors/academic advisors actually do this, so the
agent behavior mirrors real advising practice rather than a demo heuristic.

## Research summary (2026-09-13 session)

**How advisors actually decide** (general pattern across sources — CU
Boulder's process is the same shape via Buff Portal):
1. Check prerequisites/corequisites/placement for the courses under
   consideration — this comes from the syllabus/catalog, not the transcript.
2. Check remaining degree requirements — gen-ed blocks, major/minor blocks,
   concentration — against a specific **catalog year**, because requirements
   change year to year and a student is bound to the catalog they entered
   under (or one they've since moved to).
3. Sequence courses that build on each other conceptually, not just by
   prerequisite chain.
4. Weigh pacing against a graduation-timeline goal (on-time, early, or
   extended) and course availability (not every course is offered every
   term).
5. Flag GPA risk (e.g., loading up on historically-hard courses in one term)
   against the student's own goals (grad school GPA floor, scholarship GPA
   floor, academic-probation avoidance).

**The authoritative source for #2 is not Canvas.** CU Boulder's real degree
audit runs in Buff Portal (their DegreeWorks-style tool), a separate system
from Canvas with its own login, backed by the registrar's SIS — major
declarations, catalog year, credit hours, and the requirement-block logic
all live there, not in Canvas. Canvas has courses, assignments, and grades;
it has no concept of "your major requires 3 more upper-division CS credits."
This is *why* "degree audit engines" was originally written off wholesale —
building one from Canvas data alone would mean silently guessing at
requirements the product cannot actually see, which is a bad failure mode
for something that influences a student's graduation timeline.

## What changes

The scope amendment is: build the parts that are honestly answerable from
data this product has (or the student can cheaply hand it), and make the
parts that depend on the SIS's authoritative requirements **explicitly
sourced to a dated import from Buff Portal**, never silently inferred.
Concretely, two tiers:

### Tier 1 — buildable now from existing truth path

- **GPA calculator.** Inputs: Canvas course grades (already synced via
  `browser/scripts/sync-week.mjs` → `{user_root}/inbox`) plus a small
  student-maintained `{user_root}/calibration/credit-hours.yaml` (course
  code → credit hours — Canvas doesn't carry credit hours, the SIS does, and
  it's a handful of numbers per term, not worth a new scraper for). Computes
  current-term and cumulative GPA; supports a local "what-if" (change a grade
  or add a hypothetical course) without touching any Canvas or SIS system —
  pure local arithmetic, same category as the existing read-only GPA
  calculators in Better Canvas/Gesso referenced in the 2026-09-11 pivot.
- **Interest- and prerequisite-aware course *suggestions* (not a checklist).**
  Uses the student's declared major/interests from `USER.md`, prerequisite
  language already extracted from syllabi by `skills/student-instructor-profile`,
  and course descriptions available via the Canvas course catalog API. This
  surfaces "here's what looks relevant and appears prereq-eligible" — it is
  advisory, not a substitute for a requirement check.

### Tier 2 — requires a dated, student-provided import (not a live scrape)

- **Remaining-requirements-aware planning.** Needs the actual requirement
  blocks and catalog year. Source: the student runs their own DegreeWorks/
  Buff Portal audit (as they already do today) and hands the agent that
  export/paste once per term — `{user_root}/inbox/degree-audit.md`, dated,
  with an explicit staleness banner. The agent never logs into Buff Portal,
  never scrapes it, and never asserts a requirement is satisfied beyond what
  that dated import says. Every recommendation that touches "does this count
  toward my degree" cites the import date and tells the student to confirm
  in Buff Portal before registering — same posture as the syllabus-sourced
  instructor profile, and consistent with truth-path step 5 (systems outside
  Canvas stay student-operated, agent-drafts).
- **Graduation-timeline pacing** (credits/term needed to hit a target term)
  is Tier 2 because "credits still needed" depends on the Tier-2 import.

## Guardrails (apply to both tiers)

- Never auto-register, add/drop, or submit anything to Buff Portal, the SIS,
  or Canvas registration — this is planning/advisory output only, same
  preview-first posture as the rest of the product.
- Every degree-requirement claim is dated and sourced to the last student
  import; never presented as live or authoritative.
- No new scraper for Buff Portal/DegreeWorks. If a student wants tighter
  automation here later, that's a new, separate scope decision (their own
  SSO target, their own consent flow) — not an extension of this feature.
- GPA "what-if" math stays local-only; it does not write anywhere.

## Implementation plan

### Phase 1 — GPA engine (Tier 1)

- `src/canvas_mcp/core/gpa.py`: pure function(s) over already-synced grade
  data (`{user_root}/inbox/courses/*.md` or the underlying JSON cache) plus
  `{user_root}/calibration/credit-hours.yaml` (`{course_code: credits}`,
  student-edited, template ships empty with a comment on where to find
  credit hours in Buff Portal). Compute: per-course grade → grade points →
  current-term GPA, cumulative GPA (needs a small
  `{user_root}/calibration/completed-terms.yaml` history since Canvas only
  holds the current/recent terms the student is enrolled in). "What-if"
  variant takes a local override map, never touches synced files.
- Standard 4.0 scale mapping lives in `schools/{slug}.yaml` (tenant-specific
  — grading scales differ by school) with a sane US-default fallback.
- Surface: new `## GPA` section in the daily/weekly brief (reuses
  `student-task-brief`'s existing surfacing pattern, same fix noted in the
  canvas-focus pivot item 3) plus a standalone `gpa` skill_router intent for
  "what's my GPA" / "what if I get a B in X."
- Tests: `tests/core/test_gpa.py` — grade-scale mapping, missing-credit-hours
  handling (skip + surface inline in the GPA output so the student adds the
  code to `credit-hours.yaml` — `inbox/tool-gaps.md` stays reserved for
  missing Bucket-A connectors per `student-canvas-browser`, not student data
  gaps, so it doesn't apply here), what-if math.

### Phase 2 — course suggestions (Tier 1)

- New skill `skills/student-course-plan/SKILL.md`, modeled on
  `student-course-arc`: reads `USER.md` (major, interests, target grad term
  if stated), `inbox/courses/*` instructor/prereq profiles, and the Canvas
  course-catalog endpoints (`/api/v1/accounts/:id/courses` or department
  listing, whichever the tenant exposes) for course descriptions.
- Output: a ranked, *advisory* list with the reasoning shown (interest match,
  prereq language found in the target course's syllabus/description, no
  claim about degree-requirement credit). Explicitly labeled as suggestions
  to bring to a real advisor/Buff Portal, not a plan of record.
- No new MCP write tool — this is read + synthesize, same shape as existing
  triage skills.

### Phase 3 — degree-audit import (Tier 2, only after Phase 1–2 ship and the student wants it)

- Format for `{user_root}/inbox/degree-audit.md`: student pastes their Buff
  Portal/DegreeWorks audit text (or uploads the PDF export, parsed once);
  file front-matter records `imported_on` and `catalog_year`. A staleness
  check (e.g., >90 days) downgrades any requirement claim in output to
  "as of {date}, confirm in Buff Portal."
- `student-course-plan` gains a second mode that cross-references this file
  when present; without it, the skill stays Tier-1-only and says so.
- No parser is built against Buff Portal's live HTML/DOM — only against
  whatever flat text/PDF the student hands over, so there's nothing to break
  when the SIS changes its UI.

### Sequencing

Phase 1 first (self-contained, highest value, lowest risk — it's arithmetic
over data already in the truth path). Phase 1b (registration-prep / floors /
advisor questions) ships with or immediately after Phase 1 — process help
only, no SIS writes. Phase 2 next. Phase 3 only on explicit future request
since it introduces a new per-term manual-import workflow the student has to
actually keep up with — template + parser now exist so Tier-2 mode is available
when the student pastes an audit.

## What agents must not do

- Do not infer degree/major requirement blocks from Canvas data alone —
  Canvas does not carry them. Any "you need N more credits in X" claim must
  trace to a dated `{user_root}/inbox/degree-audit.md` import.
- Do not build a Buff Portal / DegreeWorks scraper or login flow.
- Do not add a registration/add-drop execution path — planning output only.
- Do not treat this doc as authorizing RateMyProfessors, Handshake, Azure
  hosting, educator grading, or LTI automation — those stay out of scope
  per CLAUDE.md, unchanged by this amendment.
