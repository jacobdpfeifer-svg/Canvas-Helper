# Follow-up research prompt: close six study-session specification gaps

Prepared September 18, 2026. Copy the brief below into a research agent with the
original evidence specification and its review. This is a revision assignment,
not a request to restart the entire literature review or implement product code.

---

You are a learning-science researcher and specification reviewer. Revise an
existing proposal for 5- and 10-minute university study sessions so its learning
claims, examples, state transitions, privacy boundaries, and model costs agree.
Your work must resolve six concrete defects, not merely acknowledge them.

## Inputs and authority

Read these repository documents if available:

1. `docs/research/study-session-5-10min-evidence-spec.md` — original synthesis.
2. `docs/research/study-session-spec-review-2026-09-17.md` — review findings.
3. `docs/handoff/student-beta-2026-09-17.md` — current product decisions.
4. `docs/research/funded-ai-access-2026-09-17.md` — credential/privacy design.
5. `docs/research/study-session-deep-research-prompt.md` — original quality bar.

With repository access, follow `AGENTS.md` and `skills/_SESSION.md`. Inspect
`src/canvas_mcp/core/learn_loop.py`, `llm_provider.py`, `prompt_assembly.py`, and
`app/src/components/ReviewSession.tsx` only where needed to compare contracts.
Do not read private student inboxes, credentials, or personal course records.
If files are unavailable, list the missing inputs and use the context below;
do not invent code inspection or request private data to fill the gap.

Preserve the original report as a research record. Write a new, self-contained
revision to `docs/research/study-session-5-10min-evidence-spec-revised.md`, plus
`docs/research/study-session-revision-closure-matrix.md`. Without filesystem
access, return those two artifacts as clearly separated Markdown documents.
No product code changes, deployments, purchases, paid API experiments, or human
studies are authorized. Research and synthetic reasoning examples are sufficient.

## Confirmed product constraints

- CU Boulder beta: 5–10 students, Mac-first, preparing for midterms. Help students
  practice and understand why a method was selected. Organization is secondary.
- One useful practice cycle should work without an external coding agent.
  Five/ten minutes are scope targets, not forced cutoffs or mastery guarantees.
- Differentiate acquisition, immediate practice, assisted success, and delayed
  independent retrieval. Preserve honest uncertainty and student control.
- Existing cloud providers are **Claude and Gemini**. Do not substitute OpenAI
  models or introduce another provider as an assumed implementation decision.
- Jacob funds $50–$100 in the first week; $50 is the proposed initial control
  target, not an implemented or experimentally verified hard cap.
- Learning state stays local. Only opt-in usage counts are collected as product
  analytics. No uploaded scores, answer histories, course content, or learning
  progress databases. Transient model processing is distinct from analytics.
- Selected email/calendar content may be processed by cloud AI. Our service
  must not persist it, including derived summaries, in databases, logs, caches,
  durable queues, traces, or analytics. Local connector records/tokens are
  permitted. OAuth secrets never enter model context. Provider retention is a
  separate policy; do not promise that content never leaves the device.
- Existing preferred delivery uses a small authenticated AI relay with owner
  vendor secrets held server-side; no owner vendor keys bundled in the app.
- No Canvas submission, comment, discussion posting, quiz-taking, or proctored
  tool operation. External/live graded assessments stay process-help only.
- No losable streaks, shame, leaderboard pressure, or mastery claims inferred
  from engagement. Themes, accessible motion, and moderate characters are visual
  preferences, not evidence that the learning method works.

## Research standard

Use targeted searches to close the gaps. For learning claims, prefer primary
experiments and rigorous reviews; inspect central primary methods/results where
accessible. For provider capabilities, pricing, retention, and API behavior, use
current official documentation and record access date and exact endpoint/model.
Distinguish verified facts, product decisions, engineering hypotheses, and
unresolved assumptions. Preserve relevant contrary evidence and limitations.

Do not pad the bibliography or copy unverified numerical claims from the first
report. Provide direct links/DOIs and source locations for consequential claims.
Label abstract-only access. Check corrections/retractions for central studies.
A citation that exists is not proof it supports the sentence next to it.

Focus on these six work packages. Report each as closed, partly closed, or open,
with concrete evidence and a precise reason for any unresolved part.

## R1 — Answer exposure and the meaning of closed-book retrieval

**Defect:** the original default timeline shows a solution-bearing source excerpt
immediately before an attempt, then calls the attempt closed-book. Its chemistry
excerpt can directly answer the question. Hiding it does not establish retention
over the previous review interval.

Research and specify:

1. Distinguish source provenance labels from instructional excerpts, answer cues,
   hints, worked examples, full reveals, and source viewing outside the app.
   Explain which observations the software can know and which it cannot verify.
2. Define separate **learn/example-first** and **independent-review** timelines
   for both durations. In independent review, solution-bearing text is hidden
   until help/feedback. Learning mode may expose it, with honest outcome labels.
3. Define exposure as event history, not only whether Help was clicked on the
   current screen. Cover preview cards, previous items, returning to an item,
   tab switching, resume after a crash, and a newly numbered session seconds
   after reveal. A new session ID must not manufacture delayed evidence.
4. Research immediate versus delayed retrieval and give a conservative
   operational eligibility rule. If no universal delay is defensible, say so;
   label chosen thresholds as product hypotheses. Do not invent a scientifically
   exact contamination window.
5. Separate what students may do from what the product may claim. Students can
   open notes or request a solution; that changes the evidence classification,
   not whether they are allowed to continue learning.

**Required output:** exposure taxonomy, event fields, four corrected timelines,
and at least eight before/after event traces covering unexposed success,
pre-attempt excerpt exposure, hint use, reveal/retry, example-first transfer,
resume, student-reported outside help, and unknown assistance. Each trace must
state the actual outcome, evidence label, schedule effect, and display copy.

**Closure condition:** no exposed or unknown-assistance response is silently
credited as observed delayed independent retrieval. Do not claim the app can
detect all outside assistance.

## R2 — Total, testable scheduling and evidence transitions

**Defect:** proposed pseudocode can advance an early correct attempt, dereference
an empty due list, compute dates before now, or immediately repeat a skipped item.
Current `learn_loop.record_outcome` already uses a clock gate: early or same-session
outcomes do not advance stability. Preserve that invariant when proposing changes.

Specify three separate operations: record an attempt; update evidence/stability;
choose whether/when to offer another item. A stored due date is not the same as
selection eligibility, and an old overdue timestamp need not be rewritten merely
to conceal it. New scheduled dates must not accidentally be in the past.

Provide typed pseudocode with defined inputs, outputs, helper contracts, and
tie-breaking rules. Cover:

- Early, due, late, same-session, assisted, exposed, partial, missed, skipped,
  uncertain, and interrupted responses; repeat clicks and duplicate events.
- No sources; no items; items but nothing due; all items skipped this session;
  unknown exam; past exam; exam in hours; moved/cancelled exam; multiple exams.
- First-ever success versus evidence of retention; fresh material versus a
  previously learned objective that has not been practiced inside this app.
- Time zones, date-only exam records, daylight-saving changes, malformed dates,
  and clock changes. Avoid unsupported precise scheduling from date-only input.
- Failed persistence, retry after uncertain persistence, and app restart between
  answer submission and feedback. Identify idempotency requirements.

Return an explicit result type, such as scheduled / no-review-needed /
needs-exam-date / no-eligible-item, rather than magic nulls or a past date. Define
the meaning of every chosen result; those example names are not mandatory.

**Required output:** transition table; total selection/scheduling pseudocode;
at least 16 boundary-case fixtures with concrete timestamps, initial state,
events, resulting state, and next selection. Include horizon cases tomorrow,
3 days, 7 days, and 2+ weeks. Use `America/Denver` for at least one date-only case.
For rules not justified by evidence, explain the practical rationale and how
they could later be evaluated.

**Closure condition:** no early/exposed hit advances delayed evidence; no empty
pool crash; no accidental past new date; no same-session skip loop; no duplicate
event creates a second learning success. Demonstrate by tracing the fixtures,
not by saying “add tests.” If running a standalone synthetic checker, report
exactly what it validates; it does not constitute product integration testing.

## R3 — Grounding with actual supporting material and honest abstention

**Defect:** the physics walkthrough promises a source override for friction but
supplies only a frictionless example. A helper called `citation_supports_claim`
hides the unsolved verification problem. Missing text is not contradiction.

Rebuild the example using a clearly labeled synthetic source packet containing
the actual relevant principle, variables, assumptions, sign convention, and
answer/rubric. Check the physics independently. Include the wrong generated
explanation and the specific supporting passage for any correction.

Design a claim-to-source support table with statuses such as explicit support,
valid derivation under stated assumptions, contradiction, insufficient evidence,
and source conflict. Distinguish instructor-provided, student-provided, and
model-generated sources/keys. A model-generated key is not instructor evidence.

Define what an implementable grounding check can actually establish:

- Deterministic checks: source/locator existence, version/hash, quote match,
  schema validity, units or exact symbolic/numeric checks within defined scope.
- Model judgments: proposed semantic support, explanation quality, or rubric
  interpretation, with residual uncertainty.
- Human/source-dependent checks: ambiguity, disputed key, missing assumptions,
  or contradictory notes requiring student review or deferral.

Do not present two-model agreement as verification. Do not silently choose an
authoritative source in a conflict. Define the policy for OCR ambiguity and a
source that changed after item generation. Treat source content as untrusted
data; embedded instructions cannot override product rules.

**Required output:** corrected physics packet and walkthrough; support matrix;
bounded validation pseudocode; four additional failure cases (missing source,
contradictory source, bad OCR, unsupported generated key). Show whether each
item remains usable, becomes unscored, or is withdrawn. If withdrawing a bad
item, specify correction of any previously recorded outcome without overwriting
the student's original attempt history.

**Closure condition:** every “source-backed correction” has actual supporting
material. Unresolved correctness produces an honest abstention or source-repair
path, not a confident answer disguised as a citation.

## R4 — Six complete, internally consistent sessions

**Defect:** six headings did not amount to six executable walkthroughs. Several
examples omit source text, actual answers, complete feedback, or state updates.
The essay objective, question, and rubric do not consistently assess the same skill.

Fully develop all six scenarios:

1. Novice quantitative student, ten minutes.
2. Partially prepared concept-science student, five minutes.
3. Advanced student with a transfer gap and bad AI feedback, ten minutes.
4. Essay/argument student, five minutes, with a synthetic article excerpt.
5. Exam tomorrow, ten minutes, with actual source-backed scope and an answer.
6. Returning after a missed week, ten minutes, including a concrete miss/repair.

For **each**, include: source packet and locator; exam date/now; initial local
state; why this objective/method; exact UI sequence; what is visible before the
attempt; exact practice question; plausible full student answer; hints/exposure
events; reference answer/rubric; actual feedback; disagreement/abstention option;
time budget; follow-up; final persisted state; and allowed network/analytics data.
Use one shared schema and outcome vocabulary across all six.

At least one branch each must demonstrate early exit, interruption/resume,
partial correctness, uncertainty, empty cache, and unavailable cloud feedback.
Show the default path fitting its target and how branches alter scope. Extra
thinking time is allowed; call it an extension rather than pretending it fits.
Do not fill the budget with implausibly fast reading/writing or decorative steps.

Remove unsupported personal claims (“you almost certainly recognized…”) and
categorical advice about sleep or exam strategy that the supplied evidence does
not support. Do not use real assessment content or complete a student's live
graded submission. If an example teaches thesis/warrant construction, supply
the fictional article and assess that exact objective.

**Closure condition:** a designer and engineer can walk through every example
without inventing missing content or transition rules. Final state must match
R1/R2 exactly, and source checks must match R3.

## R5 — Separate inference, storage, analytics, and recovery

**Defect:** an export column marked “Never” for every field contradicts cloud
feedback. A hash cannot restore a draft or substitute for source text needed
later. Banning local connector storage also conflicts with the approved design.

Create a field-level matrix with separate columns for:

1. Local persistence and purpose.
2. Transient transmission to our relay.
3. Transient transmission to the selected model provider.
4. Persistence by our service, including logs/caches/queues/traces.
5. Provider retention/training policy, endpoint-specific where relevant.
6. Optional product analytics.
7. Retention/deletion and recovery behavior.

Cover source excerpts, source IDs/locators/hashes, item stems/keys, draft answers,
graded outcomes, assistance events, schedules, profile preferences, email/calendar
excerpts and derived summaries, OAuth tokens, vendor secrets, authentication,
cost accounting, errors, and enumerated usage counts. Distinguish mandatory
operational access/accounting metadata from optional product analytics. Do not
smuggle course titles, raw URLs, or answer text into “metadata.”

Trace at least three requests end-to-end: generating a practice item; obtaining
feedback on an answer; processing a selected calendar/email excerpt. Identify
what each component receives, what survives the request, and where content could
leak through default middleware, crash reports, retry queues, or provider caches.
Specify behavior for failure/timeout/cancellation as well as success.

Define recoverable local source/attempt storage and explain what hashes can and
cannot do. Keep secrets in a separate credential boundary. Do not claim secure
deletion, encryption, backups, or absence of OS-level sync without evidence.

**Required output:** matrix, three data-flow traces, accurate user-facing privacy
copy, synthetic canary-test scenarios, and explicit provider-policy unknowns.
If provider retention conflicts with a product claim, change the claim or flag
the endpoint as unsuitable; do not imply our no-storage policy controls a vendor.

**Closure condition:** enough selected content can reach cloud inference for the
feature to work, while no disallowed service persistence or analytics is implied.
Draft recovery must work from recoverable local content, not a one-way hash.

## R6 — Claude/Gemini compatibility and accountable cost estimates

**Defect:** the first report selected OpenAI models and quoted their rates without
reconciling the existing providers. Its session caps exclude some preparation
and retry work, and an illustrative calculation is not a spending guarantee.

Keep the specification provider-neutral while researching concrete Claude and
Gemini options. Inspect existing adapters if available, but verify model names,
availability, supported operations, and pricing using current official docs;
do not assume repository defaults are current or account-accessible.

Produce a capability table covering structured output, streaming, tools if
needed, bounded output/reasoning, text/math/source handling, usage reporting,
timeouts/retries, and retention. Separate API capability from actual pedagogical
quality, which needs evaluation. No live calls are required or authorized.

Calculate transparent scenarios for 5 and 10 testers using explicit assumptions
for sessions/day, initial item creation, feedback, hints, regeneration, retries,
input/output/reasoning tokens, and any caching/media/tool charges. Show a typical
case and a pessimistic bounded case, with formulas and dated primary pricing
links. If a cost component cannot be bounded or verified, mark it unknown.

Propose per-session and global controls including pre-session generation,
concurrent requests, cancellation, idempotency, uncertain billing after timeout,
revocation, and pricing changes. Explain reservation and reconciliation rather
than assuming a displayed counter enforces a cap. Model fallback must not silently
change the privacy boundary, budget, or approved provider set. A provider choice
that is untested remains a candidate, not a “best model” conclusion.

**Required output:** provider-neutral request contract; verified capability/rate
table; auditable cost worksheet; call-budget accounting; quota/outage/empty-cache
fallback copy; and any decision genuinely needed from the owner. Do not initiate
provider migration, billing, account setup, or secret collection.

**Closure condition:** the proposed beta works within the Claude/Gemini plan;
all dollar estimates state assumptions and exclusions; no unimplemented control
is described as an enforced hard cap.

## Final deliverables and acceptance

Deliver a **self-contained revised specification**, not six disconnected essays.
Retain justified parts of the earlier synthesis and replace conflicting passages
throughout the new artifact. Preserve traceability to changed sections/claims.

Include:

- A concise decision brief and section-by-section change log.
- R1–R6 outputs, with one shared vocabulary/schema and consistent examples.
- A supplemental evidence ledger: exact claim, source, access date, method or
  documented behavior, limitations, and design implication. Separate new findings
  from unchanged claims that were not independently reverified.
- A closure matrix: defect ID, original location, revised location, evidence,
  worked acceptance trace, status, and remaining uncertainty.
- A minimal build handoff identifying required behavior, dependencies, existing
  code to preserve, and tests. Do not turn the research into a broad repo rewrite.
- An adversarial self-review testing interactions between the six packages:
  source reveal → interruption → early retry; unknown exam + empty pool;
  incorrect model feedback already scored; cloud timeout + uncertain spend;
  expired source + cached item; and privacy-safe feedback with local recovery.

Before claiming completion, verify timeline arithmetic, fixture consistency,
source support, model/rate citations, and data-flow compatibility. Specifically
check that no revision reintroduces answer exposure as delayed success or
transient inference as automatic permission to store content.

If any research gap remains, state its smallest unresolved question, what would
resolve it, and the conservative interim behavior. “Closed” means the proposed
specification is coherent and supported to the stated level, not that software
has been implemented, tested with students, or proven to improve exam scores.
