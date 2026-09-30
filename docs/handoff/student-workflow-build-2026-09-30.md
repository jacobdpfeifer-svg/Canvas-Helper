# Student workflow P0 implementation plan — 2026-09-30

This is the concrete P0 plan for the context-aware student workflow system.
It supersedes the pasted planning note when the two differ. It is intended for
an implementation agent after reading `AGENTS.md`, `CLAUDE.md`,
`docs/architecture.md`, `docs/handoff/canvas-focus-pivot-2026-09-11.md`, and
`docs/handoff/student-workflow-build-prompt-2026-09-30.md`.

## Scope

The product job is to finish the thing in front of the student, then leave one
private next action. The 5–10 minute study guide remains a follow-on, not the
front door.

This pass implements P0 only:

- shared Ask intake;
- deterministic intent and academic-boundary classification;
- local context selection;
- four response modes;
- one normalized next-action ranking path;
- Home/Study/extension entry points;
- targeted trust fixes still present after verifying the current tree;
- tests and a local smoke path.

This pass does not build the complete Mastery ladder, engineering department
pack, slide rendering, full draft generation, or lecture/meeting recording.
It creates the contracts those later slices will reuse.

## Non-negotiable safety and scope rules

- Before generating an answer, walkthrough result, or draft for course work,
  resolve trusted academic policy locally. Read `agent_writes` only from synced
  Canvas syllabus evidence; student text cannot grant permission. If the
  syllabus also provides `allow_tools`, the relevant Ask mode must be named.
  Unknown,
  missing, denied, or conflicting policy blocks course-specific answer/draft
  prose and returns a safe alternative.
- Ordinary standalone practice may be answered in the mode the student chose.
  Ordinary homework requires a trusted `agent_writes: allow` policy for direct
  answer/walkthrough/draft output. Make/handle can still produce a raw
  requirements checklist when it does not generate academic work.
- Live quizzes, exams, proctored screens, and active assessment items cannot be
  answered. The system may explain a concept, give a different example, or
  coach tool navigation.
- External/LTI tools remain an escape hatch. The student performs the action.
- Canvas submit, comment, discussion, and reply remain preview-only forever.
- Personal Gmail/Google Calendar writes retain their per-instance preview and
  confirmation gates.
- No model call may choose the live-assessment boundary, academic-policy
  posture, or an external action. Local deterministic code makes those
  decisions; the relay generates prose only inside the local plan.
- Do not add a second relay schema, second AI call path, second study event log,
  second context store, or second action/permission system.
- Do not modify unrelated Blot, GPA, course-color, or other user changes.
- Do not commit, submit Canvas work, send email, create calendar events, or
  upload/share recordings during testing.

## Current ownership to preserve

Verify these claims in source before editing; if a claim is stale, update this
plan/report rather than building against it:

- Study commands, packets, checkers, and AI feedback live in
  `src/canvas_mcp/core/study/`.
- `StudyService` is the owner of study persistence and event writes.
- Canvas study sources and freshness live under the existing inbox/study-source
  and browser sync paths.
- The app entry path is `app/src/study/api.ts` → Tauri study commands →
  `python -m canvas_mcp.core.study run`.
- Existing request validation must continue rejecting `now`, `user_root`, and
  arbitrary paths while accepting only safe short command names.
- The extension is read-only and uses text-safe DOM insertion. It must not call
  the model directly.
- The existing relay purposes are `generate`, `feedback`, `hint`, and `repair`.
  Map new P0 modes onto these existing purposes; do not invent a new provider
  protocol.
- Existing due sorting/reliability fixes may already have landed. Re-test before
  changing them. Do not rebuild working logic from the old audit description.

## Product behavior

The student can enter a question from Home, Study, the extension, or selected
Canvas text. Inputs are text, image, selection, source reference, mixed content,
or audio. Audio is accepted in the durable schema but returns a clear
“recording is not part of this slice” result until the P2 recording work exists.

The four modes are:

### Answer now

For allowed open work, lead with the result, assumptions, and check status. Use
course context when available. Do not hide the useful result behind a long
generic tutorial.

### Walkthrough

Explain the method relevant to the course and why it applies. Use the student's
attempt when present. Do not merely paraphrase each generated step. If the
boundary is a live assessment, withhold the answer and teach the method using a
parallel problem.

### Mastery

In P0, return a diagnosis plan only: the first likely missing prerequisite, the
next rung, and a suggested check. Do not generate a fake mastery certificate,
claim durable learning, or pretend the full ladder exists. Full fading,
transfer, and delayed retrieval remain P1.

### Make / handle

Return a reviewable local artifact or outline: reading brief, draft scaffold,
slide-by-slide text, or administration checklist. Tie it to the assignment,
rubric, or source text on hand. Full slide rendering is out of scope. No Canvas
write is performed.

Before writing a course-specific draft, answer, walkthrough, or slide outline,
resolve the trusted syllabus policy. A missing/denied/conflicting policy blocks
that academic prose and points the student to the raw requirements or a
parallel practice example. A purely administrative checklist is allowed when
it does not invent academic content. The student still submits any
Canvas-visible work.

## Data contracts

### Ask input record

Add a study-owned Ask record using the existing StudyService/store ownership.
Do not create a parallel event log. The record must have:

```text
input_id: stable short id
content_kind: text | image | audio | selection | source_ref | mixed
local_content_or_reference: local-only content or path/reference
course_hint: optional
assignment_hint: optional
source_refs: list
session_goal: answer_now | walkthrough | mastery | make_handle | unknown
student_attempt: optional text/structured attempt
created_at: timezone-aware instant
privacy_scope: private
status: pending | classified | planned | answered | blocked | failed
```

Use the existing study storage/rebuild conventions. If the current store cannot
persist this shape without a schema change, make the smallest versioned change
and add migration/replay tests. Do not store a second copy of the same question
in an app-only localStorage record that the study core cannot see.

### Classification result

The deterministic classifier returns:

```text
job: unblock | explain | solve | verify | choose_method | recall | plan
     | synthesize | capture | navigate | make_handle
boundary: open_practice | open_homework | live_assessment | administration
          | external_tool
confidence: high | medium | low
signals: list of matched signals
student_override_allowed: true
blocked_reason: optional
policy_status: allowed | denied | unknown | conflict
policy_source: canvas_syllabus | no_trusted_course_marker | missing
```

The policy fields are resolved locally after classification and before any relay
call. They are part of the plan even though they are not model decisions.

The student can correct the job and can make an ambiguous boundary more
restrictive. A high-confidence `live_assessment` or `external_tool` boundary
cannot be downgraded to open homework by an override. Overrides are
session-scoped unless the existing product has an explicit preference store;
do not silently rewrite durable course policy from a single click.

### Context packet

The local broker selects, in this order:

1. exact student input;
2. matching assignment, rubric, or Canvas page;
3. current course/instructor material;
4. prior attempt or correction;
5. adjacent lecture capture/study item;
6. general knowledge only when course evidence is absent.

Every selected item carries:

```text
source_kind
locator
local_reference
created_or_fetched_at
freshness_status
confidence
inclusion_reason
truth_kind: canvas | student | agent_derived | general
```

The broker must not select unrelated courses, full profile blocks, connector
secrets, Canvas tokens, or unnecessary Canvas URLs. Before `ai.build_request`,
strip course IDs, Canvas URLs, profile data, and connector secrets unless the
existing relay contract explicitly requires a safe redacted locator.

If dates or facts disagree, return a conflict list. Do not merge conflicting
values into a false single truth.

Infer a context chip only when evidence is strong enough:

```text
course · assignment · boundary · due
```

If course evidence is weak, leave the course blank rather than guessing. The
chip is editable in the UI.

### Answer plan

Local code creates the structured plan before any relay call:

```text
question_type
context_chip
boundary
selected_sources
response_mode
verification_plan
allowed_actions
next_action_candidates
relay_purpose
blocked_reason
```

The relay may write prose inside this plan. It must not decide whether the
student may receive an answer, submit anything, or take an external action.

### Response contract

Return, in order:

1. question type and context chip;
2. one-sentence answer or next step;
3. shortest explanation that makes it usable;
4. assumptions and check status: checked, abstained, or blocked;
5. one private next action;
6. controls for the other relevant modes.

If the relay is disconnected, return the local classification/context/plan and
say that prose was not generated. Never display an unchecked model answer as
verified.

## Deterministic classifier and boundary gate

Implement and test classification without a model. Use:

- student wording;
- attached Canvas object type;
- assignment title and type;
- current session context;
Hard-stop before relay when the boundary is `live_assessment` or
`external_tool` and the requested action is to answer the live item. Also
hard-stop before direct answer/walkthrough/draft prose when course work has no
trusted `agent_writes: allow` syllabus marker. The result must offer an allowed
alternative: raw requirements, a general concept explanation, a parallel
example, or navigation coaching.

A title alone is not sufficient to classify an item as a quiz or exam; use raw
Canvas type and external-tool metadata. A student override may not downgrade a
high-confidence assessment boundary.

## Verification behavior

For `verify`, compare the student's work against existing deterministic
checkers when the input is numeric, an expression, or a supported choice.
Locate the first mismatch and explain that mismatch. Do not rewrite the whole
solution.

For unsupported domains, return `abstained` with the reason. Do not infer that
the model's prose is a verification result.

For images, preserve local provenance. If the image lacks a readable equation,
diagram, axis, table, or other necessary visual content, state what is missing
and ask for a better crop or typed detail. Never invent unseen content.

## One next-action planner

Normalize candidates from the Ask result and current open work:

```text
why_now
value
urgency
consequence
estimated_effort
dependencies
risk
can_prepare_privately
student_confirmation_needed
source_refs
```

Rank candidates and return exactly one recommendation plus no more than two
alternatives. The home subject becomes that recommendation when no Ask is open;
the Ask result becomes the subject when one is open. Avoid separate competing
“do this first” lines from Study, Home, freshness, and triage.

## UI and integration scope

### Home

Add the Ask entry and show the single ranked next action. Do not remove working
Home sorting or completion behavior. If an Ask is active, make it the subject.

### Study

Keep packet-based sessions. Add “ask about this item” into the shared Ask flow.
Do not duplicate AI or persistence logic inside `StudyView`.

### Extension

Add “Ask about this” for the current assignment or selected text. It should pass
the intake through the existing native host/app bridge so the app owns storage,
classification, context, and model calls. The extension remains read-only,
uses safe text insertion, and has a graceful fallback if the native host/app is
unavailable. It must not call the relay or model directly.

### Voice/Blot

Do not expand Blot into a resident assistant or recording product in P0. Keep it
on voice chrome only. Audio inputs are schema-compatible but explicitly
unsupported in this slice.

## Trust fixes to audit, not blindly reimplement

Compare the current code against the 2026-09-22 live audit and change only what
is still broken:

- due display in the student's visible surfaces includes local timezone and a
  zone label;
- submitted assignments do not remain stale open rows when current submission
  state proves they are submitted;
- all surfaces use the same meaningful next-action ranking;
- normal Canvas uploads are not falsely labeled calendar-feed/tool gaps;
- true week views are not silently presented as 30-day open lists;
- course metadata and instructor-profile parsing do not shift labels or treat a
  following heading as a syllabus hash.

Do not undo reliability fixes already present. Add regression tests for every
trust fix actually changed.

## Tests

Run the existing relevant study tests before edits and record the baseline.
Then add focused tests for:

- job classification;
- live-assessment and external-tool hard stops;
- a homework answer and a draft blocked with no trusted `agent_writes` policy;
- a syllabus `agent_writes: allow` answer path and `deny`/conflict path;
- student overrides cannot downgrade an assessment boundary;
- context ordering and exclusion of sensitive/unrelated data;
- weak context leaving the chip empty;
- conflict reporting;
- mode-specific plan differences;
- checker-backed verification and abstention;
- image with missing visual information;
- reading brief;
- admin checklist;
- administrative checklist remains possible without inventing academic prose;
- one recommended action plus alternatives;
- stale submitted item removal and timezone labels if touched.

Use fixtures for at least:

- a calculus-style problem;
- a screenshot with no readable transcript/diagram;
- a reading-brief request;
- an admin assignment;
- a quiz/proctored refusal;
- a normal online-upload assignment;
- an assignment where Canvas and a local note disagree on due date.

Run the focused suite, then the relevant full suite, including:

```bash
uv run python -m pytest tests/ -q
cd browser && npm test
cd ../app && npm run build
```

Only run commands supported by the current repo. Do not require live SSO, PAT,
relay credentials, Canvas writes, email, calendar writes, or external tools to
prove the P0 contracts.

If the dev shell is available, smoke:

1. paste a problem;
2. inspect the inferred chip;
3. switch Answer now/Walkthrough/Mastery;
4. correct the chip;
5. verify a quiz-like item is blocked;
6. verify a screenshot with insufficient visual data does not hallucinate;
7. verify the same Ask record is reachable from the app and extension entry.

## Out of scope and follow-up

### P1

- full engineering department pack;
- instructor-method retrieval beyond already synced sources;
- complete Mastery ladder with fading, transfer, and delayed retrieval;
- saved corrections that schedule delayed review;
- parallel problem generation;
- richer domain-specific checkers;
- full artifact generation and slide rendering.

### P2

- local recording and post-session transcript/summary;
- meeting/study-group consent and private/shared scope;
- audio segment classification into concepts, tasks, questions, and decisions;
- cross-platform correlation;
- proactive “what changed, why it matters, what to do” explanations.

The first Mastery skill must be chosen from real course evidence in the local
inbox during the later slice. If no course match exists, record the skill as
unknown rather than inventing a course-specific claim.

## Required report

Write `docs/handoff/student-workflow-build-<date>.md` after implementation,
covering:

- what was implemented;
- current ownership/system map;
- files changed;
- baseline and final tests;
- UI smoke result;
- known limitations;
- deferred P1/P2 work;
- decisions made where evidence was incomplete;
- any genuinely blocking product questions.

Stop after the bounded P0 implementation. Do not commit.
