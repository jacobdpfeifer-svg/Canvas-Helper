# Canvas reliability architecture

**Status:** implemented locally with audit fixes; live credentialed verification still gated on §6
**Date:** 2026-09-21

This document maps the three student pain points that matter most for this product:

1. course fragmentation and inconsistent instructor organization;
2. Canvas's displayed grade being easy to misread; and
3. incomplete or misleading upcoming-work surfaces.

The design below is intentionally independent of the current repository first. The
repo mapping comes after it. The goal is not to recreate Canvas. It is to build a
local, evidence-backed interpretation layer that makes uncertainty visible and
gives the student one dependable place to decide what to do next.

## 1. The optimized design from scratch

### 1.1 One canonical evidence graph

Use a normalized local store, not Markdown as the primary data model. Every record
must retain:

- `tenant_id`, `course_id`, Canvas object type and Canvas ID;
- `source_endpoint`, `fetched_at`, `updated_at`, and raw-field hashes;
- the effective student date, its date-override source, and timezone;
- visibility/published state and the reason a record is actionable or suppressed;
- submission state, grade state, and whether the state is authoritative, inferred,
  or unknown.

Keep raw API snapshots append-only for the last successful sync (or a bounded
history), then build projections from them. A projection may be rebuilt; raw
evidence must not be silently overwritten. This is the reliability boundary:
rendering and grade calculations never scrape the UI or infer missing facts from a
lossy text export.

The minimum entities are `Course`, `Assignment`, `AssignmentGroup`, `Submission`,
`Module`, `ModuleItem`, `CalendarEvent`, `PlannerItem`, `CourseTerm`, and
`SyncRun`. Relationships are explicit. One assignment can appear in a module, a
planner item, a calendar event, and a grade group without becoming four tasks.

### 1.2 Course normalization: make each class feel the same

Create a stable “course map” projection for every course:

- **Start here:** syllabus, instructor-published home page, and first actionable
  module item, with links and freshness labels.
- **Learn:** ordered modules and items, preserving Canvas order and lock/prerequisite
  state.
- **Do:** all actionable graded/ungraded work, normalized into one list.
- **Check:** grades, missing/unsubmitted work, and sync warnings.

Never pretend that an instructor's module structure is canonical if it is empty,
unpublished, duplicated, or incomplete. Show a fallback map with a reason, for
example: “No published modules found; organized from assignments and syllabus.”
External/LTI items remain launch-out only and are clearly marked as requiring the
student's browser.

### 1.3 Due-work reconciliation: one item, many signals

Build a deterministic reconciler keyed by `(course_id, object_type, canvas_id)`.
For each item, merge signals in this order:

1. assignment/discussion/quiz record and student-effective date;
2. submission and missing-submission state;
3. planner and To‑Do representation;
4. calendar assignment event;
5. module placement and completion requirement.

The projection must keep `seen_in` as a set, not choose one source and discard the
others. A “health” object should report source coverage, pagination truncation,
failed endpoints, duplicate conflicts, stale age, and the last successful full
sync. If sources disagree, show the disagreement and link to Canvas; do not pick a
winner silently.

Use a single upcoming-work query over the normalized projection. Include future,
overdue, missing, submitted/pending-review, ungraded, and no-date buckets. The
default view can be concise, but the underlying data cannot be “next 14 days only.”
The user should always be able to answer: “What did we inspect, what could not be
inspected, and what needs attention?”

### 1.4 Grade truth: report scenarios, not a magic number

Represent at least four numbers per course:

- **Canvas reported:** the enrollment `computed_current_score/grade`, with its
  timestamp and source;
- **graded-only estimate:** earned points/weighted groups using only graded items;
- **risk-adjusted estimate:** treat currently due-and-unsubmitted items as zero;
- **projection:** a what-if result for selected future or missing items.

For each result, show the exact inputs and a confidence state. The calculator must
handle weighted groups, group drop rules, never-drop IDs, points/percent/letter and
non-graded assignments. It must detect group weights that do not sum to 100%,
zero-point items, missing group membership, closed grading periods, hidden/unposted
grades, and assignments that Canvas's computed total may exclude. Unsupported or
ambiguous rules produce “cannot calculate reliably,” not a plausible-looking
percentage.

The UI should lead with: “Canvas says X; if the N unsubmitted items count as zero,
your estimate is Y–Z,” followed by “why these differ.” Every input links to the
course/assignment and retains the last-sync time. This directly addresses the
known Canvas behavior around calculating based only on graded assignments and the
assignment-group/drop-rule model exposed by the API.

### 1.5 Sync protocol and failure behavior

Use a staged sync transaction:

1. acquire the per-profile browser lock;
2. fetch courses and tenant timezone;
3. fetch each course's assignments with submission/all-dates, groups, modules with
   items/content details, discussions, quizzes, planner/To‑Do, calendar events,
   and missing submissions;
4. write raw responses to a staging directory;
5. validate schema, IDs, pagination, timestamps, and cross-references;
6. atomically promote the snapshot and rebuild projections;
7. publish a `SyncRun` status and notify the app.

A failed endpoint never deletes the previous successful data. The projection is
marked partial and each affected surface carries a stale/partial warning. A
successful empty response is only accepted as authoritative when the endpoint was
successfully fetched, paginated to completion, and the course/context is known.
Retries are bounded and idempotent. Pagination is mandatory; truncation is a
visible error, not a log-only warning.

### 1.6 Verification strategy

Build the reliability core as pure functions over fixtures before adding UI:

- reconciliation is invariant under source order and duplicate inputs;
- retries and partial failures preserve the previous snapshot;
- effective due-date overrides beat base dates and never confuse `lock_at` with
  `due_at`;
- submitted, graded, pending-review, late, missing, and unsubmitted states remain
  distinct;
- weighted-grade results match hand-worked fixtures, including drop rules and
  malformed weights;
- every UI claim has a source ID and freshness label;
- course isolation, profile isolation, and external-tool boundaries are enforced.

Use property-based or table-driven fixtures for DST/timezone edges, duplicate
planner/calendar rows, reassignment, date overrides, pagination gaps, partial
Canvas outages, and courses with no modules or no assignment groups. Add visual/UI
tests only after the projection contract is stable.

## 2. Mapping to this repository

### What already maps well

- SSO-cookie → `/api/v1` transport and per-profile browser locking already exist in
  `browser/scripts/lib/canvas-session.mjs`.
- `apiAllPages`, retry behavior, `studentDueAt`, and the current source-health object
  are reusable foundations.
- `sync-week.mjs` already combines planner, To‑Do, calendar, assignments, and
  discussions, and it emits truncation warnings.
- `sync-study-sources.mjs` already fetches assignments with submissions, quizzes,
  assignment groups, syllabus/pages, and writes atomically to a per-user inbox.
- `app/src-tauri/src/semester.rs` correctly keeps Canvas parsing out of React, and
  the Tauri command/IPC seam is the right place to expose read-only projections.
- The local-first user root, runtime profile identity, and “never submit/comment on
  behalf of the student” boundaries are compatible with this design.

### The important gaps

1. `study-sources/<course>.json` is a study-source/semester-line record, not a
   canonical Canvas snapshot. It drops source endpoint identity, raw submission
   detail, effective dates/overrides, module structure, sync-run status, and grade
   diagnostics.
2. `week.md` is currently a durable display/export format. Markdown parsing in
   `inbox.rs` cannot support conflict explanations, source provenance, or reliable
   grade scenarios.
3. `writeGradesYaml` stores only enrollment computed scores. It does not fetch or
   persist assignment groups, submissions, drop rules, or the inputs needed to
   explain a difference between Canvas's number and a risk-adjusted estimate.
4. `itemFromAssignment` and `applyWeightShares` are useful first-pass helpers, but
   they currently calculate shares from the fetched item set and do not model drop
   rules, malformed group weights, date overrides, grading periods, or uncertainty.
5. The semester line reads only study-source JSON and exposes `completed` as a
   boolean. It cannot distinguish submitted, graded, pending review, missing,
   suppressed, stale, or unknown.
6. The current Calendar view is for local commitments and email suggestions; it is
   not the canonical Canvas due-work surface. Its month grid must consume the
   normalized projection, while local events remain a separate event family.
7. The current sync can retain partial lists, which is good for availability but
   dangerous if promoted as complete. Staging needs to distinguish “usable partial
   cache” from “authoritative snapshot.”

## 3. Recommended implementation sequence

### Phase A — contract and fixture corpus

Add a versioned JSON schema under `browser/scripts/lib` (or a small shared
`browser/scripts/lib/canvas-model.mjs`) for raw snapshot metadata, normalized
entities, `SyncRun`, and health. Create fixtures for four courses: well-structured,
fragmented, weighted-grade with drops, and outage/partial-response.

### Phase B — canonical sync without UI changes

Extend the existing SSO sync to fetch modules/content details, complete assignment
group rules, student submissions/missing state, quizzes/discussions, effective
dates, planner/To‑Do, and calendar. Write a staged snapshot plus a small SQLite
database or JSON projection. Given the repo's local-first constraints, start with
atomic JSON snapshots and a rebuildable projection; adopt SQLite only if query
volume or migration needs prove it necessary.

Do not remove `week.md` or `study-sources` yet. Generate them from the canonical
projection so existing skills and the study engine remain compatible during the
migration.

### Phase C — pure reconciler and grade engine

Add tested modules for `reconcile_due_items`, `normalize_course_map`,
`compute_grade_scenarios`, and `summarize_sync_health`. Make their output include
source IDs, timestamps, confidence, and explicit refusal reasons.

### Phase D — read-only app surfaces

Add Tauri commands and typed IPC for:

- `read_course_map(course_id)`;
- `read_work_surface(filters)`;
- `read_grade_truth(course_id)`;
- `read_sync_health()`.

Refit Home/Calendar/Plan to these projections. Keep Study sources on their current
contract until the adapter is proven. Add a course switcher and consistent sections
(`Start here`, `Learn`, `Do`, `Check`) rather than course-specific navigation.

### Phase E — hardening and migration

Run the fixture/property suite, then synthetic-profile integration tests with stale,
partial, empty, reordered, and interrupted syncs. Only after that migrate the
existing UI-round-1 fixtures and update the build record. Preserve the previous
snapshot on failure and make “last complete sync” visible everywhere a student
might make a deadline or grade decision.

## 4. Scope boundaries

This is read-only Canvas interpretation. It does not submit assignments, post
comments, mark work complete, fetch quiz questions, automate LTI/proctored tools,
or claim to replace the official gradebook. The product's promise is narrower and
more defensible: one consistent map, a reconciled due-work view, and grade
scenarios that show their evidence and uncertainty.

## 5. Contract details needed before implementation

The high-level plan is not implementation-ready until these details are fixed.

### 5.1 Snapshot layout and commit protocol

Use one directory per sync generation under the same filesystem root so promotion
is an atomic rename rather than a cross-device copy:

```text
inbox/canvas/
  raw/current/manifest.json
  raw/current/courses/<course-id>/course.json
  raw/current/courses/<course-id>/assignments.json
  raw/current/courses/<course-id>/assignment-groups.json
  raw/current/courses/<course-id>/submissions.json
  raw/current/courses/<course-id>/modules.json
  raw/current/courses/<course-id>/discussions.json
  raw/current/courses/<course-id>/quizzes.json
  raw/current/global/planner.json
  raw/current/global/todo.json
  raw/current/global/calendar-events.json
  raw/staging/<sync-id>/...
  projections/<sync-id>/...
  projections/current -> <sync-id>
  sync-runs/<sync-id>.json
```

`manifest.json` is the commit record. It contains `schema_version`, `sync_id`,
`tenant_id`, `profile_id_hash`, `started_at`, `finished_at`, requested endpoints,
completed endpoints, pagination status, file hashes, and `complete: true|false`.
Only a validated complete or explicitly usable-partial generation may be promoted;
the manifest is written last. Never use a symlink if the target platform's atomic
rename semantics are not guaranteed—write `projections/current.json` as a small
pointer record instead.

Promotion is:

1. write every file to `raw/staging/<sync-id>`;
2. fsync files and the staging directory where supported;
3. validate the manifest and cross-references;
4. rename staging to `raw/generations/<sync-id>`;
5. atomically replace the pointer to the new generation;
6. build projections from that immutable generation;
7. atomically replace the projections pointer.

If projection building fails, retain the new raw generation for diagnosis but keep
the previous projections pointer. A sync can therefore be “raw captured,
projection failed” without making the UI appear empty.

### 5.2 Entity identity and date overrides

The primary identity is `(tenant_id, course_id, object_type, canvas_id)`. A date
override is not a second assignment: store it as an `effective_date` child record
with `source_kind` (`base`, `student_override`, `section_override`, or `unknown`),
the raw override ID when available, and the applicable student/section context.
Retain all dates for diagnostics, but expose only the applicable date as
`effective_due_at`.

Assignments that appear in multiple module items keep one work item and an array
of `module_placements`, including module position, item position, indent, lock,
published, and completion requirement. Reassigned work keeps its assignment ID but
stores the applicable assignment/reassignment metadata; it must not duplicate the
student's task.

Identity collisions, missing IDs, invalid timestamps, and cross-course references
are validation errors. Do not synthesize a Canvas ID from a title. A row without a
stable ID may appear in a diagnostic-only `unkeyed_sources` list, never in the
actionable work projection.

### 5.3 Fetch matrix and bounded concurrency

The canonical fetch should have a declared endpoint matrix, not an open-ended
“fetch everything” loop:

| Scope | Required data | Completeness rule |
|---|---|---|
| Global | courses/enrollments, planner, To‑Do, calendar assignments/events, missing submissions | all pages; record the requested date window only for the UI query, not raw storage |
| Course | course/term, assignments with `submission` and `all_dates`, groups with rules, discussions with assignment/all dates, quiz metadata | all pages; per-course failure is isolated |
| Course structure | modules with `items` and `content_details`, plus item pages when Canvas omits inline items | all modules and all item pages; published/unpublished state retained |
| Grade detail | student-visible submissions and visibility/posting fields available to the student | absence is `unknown`, never an inferred zero |

Use a small bounded worker pool for independent course fetches, while preserving
the per-profile browser lock. One course failure must not cancel other courses, but
the manifest must list the failed course and prevent a “complete” label. Do not
run the old two full syncs after the canonical path lands; adapters consume the
canonical generation.

The raw snapshot is full-term within the API's available scope. Windowing belongs
only in `read_work_surface(filters)` and `week.md` generation. Calendar events may
be date-windowed by the API for efficiency only if the manifest records the window
and the projection does not call that snapshot a complete calendar history.

### 5.4 Grade engine rules

The grade engine must return a typed result, not just a number:

```json
{
  "status": "ok | partial | cannot_calculate",
  "scenario": "canvas_reported | graded_only | risk_adjusted | what_if",
  "percent": 87.4,
  "letter": null,
  "included_item_ids": [],
  "excluded_item_ids": [],
  "warnings": [],
  "sources": [],
  "as_of": "..."
}
```

Rules:

- `canvas_reported` is displayed verbatim with no reverse engineering.
- For points-based groups, calculate earned/possible using the same group scope;
  exclude `not_graded` and zero-point items from the denominator, while retaining
  them as explicit exclusions.
- For weighted groups, calculate each group's percentage, apply its weight, and
  apply drop rules within that group before weighting. `never_drop` wins over
  lowest/highest selection. If weights are not 100%, return `partial` with the
  observed sum and do not silently renormalize; a clearly labeled normalized
  diagnostic may be shown separately.
- `graded_only` excludes genuinely ungraded work from the denominator. It does
  not turn missing work into zero.
- `risk_adjusted` treats only actionable, due, unsubmitted work as zero. Future,
  suppressed, no-date, locked, and unknown-state items remain outside the risk
  denominator and are named in warnings.
- Hidden/unposted information is not automatically a refusal: if the student can
  see Canvas's computed total but not the underlying item, show the reported total
  and mark the local estimate `partial` or `cannot_calculate` depending on whether
  the missing input can change the denominator.
- Closed grading periods, missing group membership, unsupported grading schemes,
  conflicting submissions, and ambiguous overrides produce a warning or refusal
  with the exact affected IDs. They never yield a confident-looking percentage.

What-if inputs are local-only scenario overrides. They never write to Canvas and
must identify whether they replace a score, add a zero, or change completion state.

### 5.5 Health states and user-facing semantics

Every projection receives one of these states:

- `fresh_complete`: all required endpoints completed and validated;
- `fresh_partial`: usable data exists, but named endpoints/courses failed;
- `stale_complete`: last complete generation is older than the freshness policy;
- `stale_partial`: only an older partial generation is available;
- `empty_unverified`: no successful generation exists;
- `blocked`: authentication, profile, or validation prevents safe use.

The UI must distinguish “no work exists” from “no work was successfully fetched.”
An empty result with `empty_unverified` or a failed endpoint is never rendered as a
reassuring empty state. Each deadline or grade decision shows `as_of`, the health
state, and a compact “inspect in Canvas” action.

Recommended defaults are a soft stale warning after 24 hours and a stronger warning
after 72 hours, but the policy must be tenant/timezone aware and stored in the
projection rather than hard-coded in React.

### 5.6 Security, privacy, and untrusted content

Canvas titles, descriptions, syllabus text, module names, and external URLs are
data, not instructions. Keep them escaped in Markdown/HTML, sanitize or render
plain text in the React surface, and allow external navigation only for validated
`http(s)` URLs. Never include raw Canvas text in logs or sync-health errors.

Raw snapshots are sensitive student data. Keep them under the existing user root,
apply restrictive permissions where supported, exclude them from telemetry and
crash reports, and define bounded retention (for example, current plus two prior
generations). Delete through a targeted profile-data operation only; never add a
cleanup glob that could cross profiles.

### 5.7 Adapter and migration invariants

Adapters are compatibility views, not alternate truth paths. Each adapter records
the `sync_id` and projection schema it came from. Until the new readers are proven:

- `week.md`, `grades.yaml`, and schema-2 study sources continue to be generated;
- their generation failure cannot invalidate the canonical snapshot;
- old consumers never trigger a second Canvas fetch;
- a feature flag or explicit capability check controls the new UI surfaces;
- deleting or rewriting the old Markdown parser waits until all skill consumers
  have migrated.

Migration is complete only when a synthetic profile can regenerate all adapters
from an offline canonical generation and the old and new due counts are compared.

## 6. Acceptance criteria

The implementation is ready for live credentialed verification only when all of the
following are true:

1. Two consecutive identical fixture syncs produce the same normalized projection
   and stable IDs, independent of API response order.
2. A failed or truncated second sync leaves the previous current generation and
   projections readable, while the UI says `stale_partial` or `fresh_partial` and
   names the affected source.
3. A successful empty response is accepted; a failed empty response is not. Both
   cases have dedicated tests.
4. Duplicate planner/calendar/module representations produce one work item with
   `seen_in` and a surfaced disagreement when dates or completion states differ.
5. Grade fixtures cover weighted groups, drop rules, never-drop, ungraded/missing,
   zero-point, malformed weights, closed periods, hidden inputs, and what-if
   overrides; every refusal names its reason and source IDs.
6. No React component parses Canvas JSON, Markdown, or raw endpoint responses.
7. Profile isolation, URL validation, escaped untrusted text, and bounded raw-data
   retention have automated tests.
8. Home, Calendar, Plan, and Check all show the same `sync_id`/freshness state for
   the same profile, and Study remains unchanged until the adapter contract passes.

## Research basis

The design follows Canvas's documented API separation: assignment groups expose
weights and drop rules; assignments expose points, submission, all-date overrides,
and grading type; modules expose ordered items, publication, locks, and completion
state; submissions expose workflow/missing/late state; calendar and planner expose
additional representations of upcoming work. See the [Assignment Groups API](https://canvas.instructure.com/doc/api/assignment_groups.html),
[Assignments API](https://canvas.instructure.com/doc/api/assignments.html),
[Modules API](https://canvas.instructure.com/doc/api/modules.html),
[Submissions API](https://canvas.instructure.com/doc/api/submissions.html),
[Calendar Events API](https://canvas.instructure.com/doc/api/calendar_events.html),
and [Planner API](https://canvas.instructure.com/doc/api/planner.html).

Canvas's own student/observer materials document the “calculate based only on
graded assignments” choice and weighted assignment-group display; the product
should expose that distinction instead of collapsing it into one percentage. The
[Canvas Observer Guide](https://community.canvaslms.com/html/assets/Canvas_Observer_Guide.pdf)
and [Canvas Student Guide](https://community.canvaslms.com/html/assets/Canvas_Student_Guide.pdf)
are the reference points for that behavior and for the limits of the native To‑Do
surface.
