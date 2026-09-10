# Engagement mechanics fit audit

**Status:** the remaining slice is implemented: outcome trail, semester garden, one opt-in commitment, counterfactual next step, and review budget. They are projections and one student-authored appointment. They do not change delayed-hit stability, the brief-day rule, or the actuator ledger.  
**Date:** 2026-09-08

## Executive summary

I read `src/canvas_mcp/core/learn_loop.py`, `teach_hint.py`, and `learning_profile.py` in full, along with the architecture and the `canvas-week-plan` / `student-task-brief` skill contracts. The existing product already has the important learning loop: teachable claims are separated from workflow chores; reviews are exam-relative; intervals expand and are capped by the checkpoint; and stability advances only after a delayed hit. `teach_hint` changes the opening order, not whether retrieval occurs. `learning_profile` stores initiation priors and explicit format signals, not a learner identity.

I also checked current implementations and research across Duolingo, Anki/FSRS, Beeminder, Forest, and retrieval/spacing literature. The strongest fit is not a conventional gamification layer. It is a **truthful progress-and-initiation layer** around the existing loop:

1. show the student what durable progress means and why today’s action matters;
2. lower the cost of beginning the next course-relevant action;
3. protect recovery after missed days without pretending that activity equals learning;
4. optionally add a student-authored commitment for deadline-risk work.

The main rejection remains a daily streak based on opening the app or completing arbitrary work. The current buildout is narrower: `canvas_mcp.core.habit` records a consecutive local-day **brief streak** only when `write_focus` succeeds, renders a quiet line, and does not shame or interrupt after a gap. That is defensible as an initiation cue, but it is not evidence of learning and should not be allowed to drift into one.

## Buildout audit: what exists now

The implementation has moved beyond the original research-only snapshot. The current buildout includes:

- **Learn-loop progress:** `learn_loop.py` exposes a per-course progress tally and the dock reads at most two due reviews. Student-scored outcomes remain separate from the brief habit.
- **Evidence and explanation surfaces:** `learn_loop.py` now exposes evidence-rung / missing-evidence text, a one-clause `why_due` explanation, knowledge-health counts, and a coverage/practice surface. These are the concrete buildout of the evidence-ladder and “Why this now?” recommendations.
- **Retrieval session:** the dock can surface due claims and record `hit`, `partial`, `miss`, or `skipped`; same-session success does not advance stability.
- **Brief continuity:** `habit.py` persists `inbox/habit.yaml`, counts a day only after `write_focus`, uses the school-local day boundary, is idempotent within a day, and suppresses the line after a gap until the next brief. It does not write the learning profile or ledger. Product copy is `Brief continuity: written today` / `Brief continuity: yesterday written`; the stored count is not shown.
- **Local evaluation:** `learn_loop evaluate` prints delayed reviews still open, delayed-hit retrieval signals, overdue week rows, and deadline surprises. `--record` / `--compare` are explicit. The brief count is an `exposure` field only. A single window is not treated as causal.
- **Why and recovery:** due Today rows use the existing `why` clause. A stale focus handoff does not replay `Open with:`; if an open week row is overdue, one recovery clause names that item and does not ask for a backlog. The cue is read-only from the dock/prompt assembly and is not a guilt interrupt. Skill guidance says not to invent checks to maintain brief continuity, and that the line is not learning evidence.
- **Durable-recall view:** the peek shows `health.line` whenever claims exist. Retention copy says “durable retrieval signal,” not exam readiness.

### Audit verdict

The buildout is aligned with the strongest recommendation. Product copy now says brief continuity, not a day count to protect. The internal field is still `streak`; that word must not return to the dock or skill line. Do not add freezes, repair currency, escalating reminders, or streak-based learning claims.

A later product call reopened two mechanics the first pass rejected as generic gamification: an optional, hideable class leaderboard, and class-scoped badges. Those are framed in [`docs/design/class-standings.md`](../design/class-standings.md). They are not a license for peer boards, shared student data, XP, or badges for lessons completed.

The outcome-shaped trail, the semester garden, and the one-commitment appointment are implemented as projections beside the brief-continuity cue. The brief-continuity cue is still not that trail.

## What was read and researched

### Repository

- `learn_loop.py`: `LearnItem` records course, claim, kind, checkpoint, outcome, stability, and next review. `record_outcome` ignores same-session hits for stability, treats confidence as non-evidence, expands gaps `1 → 3 → 7`, caps them before the checkpoint, and gives durable items a pre-exam review. `due_reviews` is deliberately limited to two and keeps confusable items together.
- `teach_hint.py`: chooses worked-example versus retrieval-first from course prior knowledge, profile start bias, explicit student requests, and due reviews. It also creates at most one mid-window self-check nudge.
- `learning_profile.py`: persists four initiation levers—practice format, autonomy, chunk size, and check depth. Onboarding guesses can be superseded by explicit format signals; raw route success, silence, and time-on-page are intentionally not learning signals.
- `canvas-week-plan` and `student-task-brief`: the existing habit-shaped surface is the Top-3 / “Do first” brief, focus handoff, scheduled due-review check, and now a quiet brief-continuity cue—not a daily lesson feed. Workflow stays distinct from teachable work, and LTI/proctored work remains student-operated.
- Current buildout files: `src/canvas_mcp/core/habit.py`, the `write_focus` integration in `teach_hint.py`, `app/src/components/Top3Sticky.tsx`, `app/src/App.tsx`, and the corresponding Tauri IPC/daemon paths and tests. These are implementation details to audit, not a reason to broaden the mechanic.
- Architecture/constraints: local-first, SSO → API → inbox, single-user, no hosted social graph, no educator grading, no quiz-taking automation, no auto-driving LTI tools, and no auto-submission proposal here.

### External evidence

- A 2022 review in *Nature Reviews Psychology* synthesizes spacing and retrieval practice. Learners underuse them; the authors list false beliefs, lack of awareness, or the counter-intuitive feel of effective strategies — not counterintuition alone: [Carpenter, Pan & Butler, 2022, *The science of effective learning with spacing and retrieval practice*](https://www.nature.com/articles/s44159-022-00089-1) ([DOI 10.1038/s44159-022-00089-1](https://doi.org/10.1038/s44159-022-00089-1)).
- Retrieval is not just assessment: after a correct recall of foreign-language vocabulary, repeated testing produced a large delayed-recall gain and repeated studying did not, in *Science* 319:966–968: [Karpicke & Roediger, 2008](https://doi.org/10.1126/science.1152408).
- Anki now offers FSRS alongside its legacy SuperMemo 2 scheduler, which validates adaptive scheduling as a useful reference point but does not imply this repo should replace its intentionally simpler, checkpoint-capped model: [Anki deck options](https://docs.ankiweb.net/deck-options).
- Beeminder’s current contract turns a long-term goal into a daily commitment with a self-imposed financial consequence: [standard contract](https://www.beeminder.com/contract). Its model is relevant as a commitment-device pattern, but money and punitive failure are a poor default for a high-stakes student tool.
- Forest makes focus visible as a growing personal forest: a focus timer, a visible record of sessions, and group focus: [Forest](https://www.forestapp.cc/). The useful transferable piece is visible accumulated effort tied to a real focus session; the tree layer is not intrinsically educational.
- A qualitative L@S ’22 study examines how gamification can be misused in Duolingo, including fixation on streaks that makes return frequency more salient than learning: [Hadi Mogavi, Guo, Zhang, Haq, Hui & Ma, 2022, *When Gamification Spoils Your Learning: A Qualitative Case Study of Gamification Misuse in a Language-Learning App*](https://arxiv.org/abs/2203.16175). That is a caution, not evidence that every Duolingo mechanic is ineffective.

## Ranked mechanics worth pursuing

### 1. Durable-recall progress view — shipped; validate before expanding

**What it is.** A compact “knowledge health” view that counts claims by state—fragile, holding, durable—and shows the next checkpoint-facing review. It should explicitly distinguish “sessions started,” “reviews completed,” and “delayed hits.” A durable claim is the meaningful achievement; opening the app is not.

**Why it fits.** It makes the product’s real value legible and counters the student’s natural but misleading intuition that rereading or confidence is mastery. It can reduce missed reviews without manufacturing a streak. It is directly supported by retrieval/spacing evidence and by fields already present in `LearnItem`.

**Where it lives.** Implemented as read-only aggregation in `learn_loop.py`, prompt assembly, Tauri IPC, and the expanded dock UI. No new learning model was required. A later version could add a per-course checkpoint view, but should not become a grade predictor.

**Effort.** The initial implementation is complete; further work is validation and small UX refinement rather than a new subsystem.

**Biggest risk/tension.** “Durable” is a scheduler state, not proof of transfer to an unseen exam problem. The UI must say “durable retrieval signal,” not “you know this” or “exam ready.”

### 2. Outcome-shaped progress trail, not the current brief streak — pursue second

**What it is.** A future rolling trail of meaningful events: a delayed review hit, a corrected miss, a completed pre-reading retrieval, or a started assignment micro-step. Use “you kept the chain of work alive this week” only when the event has a defined academic outcome. Missing a day creates a gap, not a broken identity. This is different from the current brief streak, which measures continuity of writing a focus handoff.

**Why it fits.** Forest’s visible accumulation and Duolingo’s salience insight can be retained without loss aversion. The existing Top-3 / focus handoff already supplies a natural unit of work, while `learn_loop` supplies a stronger unit for learning. This could reduce deadline avoidance by showing forward motion on real coursework.

**Where it lives.** A new small progress-history projection fed by existing focus and learn-loop events; do not add a daily counter to `LearnItem` and do not overload `habit.yaml`. Candidate surfaces are `Top3Sticky`, the dock, and `focus.md` rendering. It may require a new append-only event shape if existing ledger rows cannot distinguish planned, started, completed, and delayed-hit events.

**Effort.** Days for an event contract and read-only view; a phase if event provenance is inconsistent across skills.

**Biggest risk/tension.** The repo currently treats only explicit learning signals as learning evidence. Counting “completed assignment micro-step” as progress is useful for deadline control but must never promote a claim’s stability or be combined with retrieval metrics as if equivalent.

### 3. “Do first” friction reducer with bounded recovery — partially shipped; validate

**What it is.** Turn the existing Top-3 / `Open with:` handoff into a one-action launch surface: one closed-book check or one concrete workflow step, one time box, and a recovery option when the student returns late. Recovery should say what is now most valuable, not demand backfilling every missed task.

**Why it fits.** This is the closest analogue to Duolingo’s session chunking and notification timing, but it hooks into a habit that already exists rather than inventing a streak. It addresses initiation and deadline risk, which are real outcomes for this product. It also respects autonomy and chunk-size priors in `learning_profile`.

**Where it lives.** The recovery path is implemented in `learn_loop.py` / prompt assembly from stale focus and current week data, with the Top-3 and practice surfaces displaying it. The remaining question is whether the existing Top-3 interaction is sufficiently one-action; a durable “last meaningful action” event is not required unless evaluation shows recovery cannot be explained from current state.

**Effort.** Initial recovery implementation is complete; remaining work is focused UX testing and regression coverage.

**Biggest risk/tension.** A too-aggressive nudge becomes notification pressure. The system should show one next action, respect quiet hours, and avoid escalating guilt or pretending urgency when Canvas data is stale.

### 4. Student-authored checkpoint commitment — investigate as opt-in

**What it is.** Let the student define a bounded commitment such as “before Thursday 7pm, complete two 15-minute retrieval blocks for CHEM exam claims” or “open the project brief and produce the first outline.” The system displays a commitment line and offers a scheduled check-in. No money, public shame, or automatic Canvas action.

**Why it fits.** Beeminder demonstrates the useful underlying pattern: a concrete commitment can protect a future intention from present-moment avoidance. This repo already knows checkpoints and time boxes. An appointment/check-in is more compatible than a punitive contract for a solo student.

**Where it lives.** Likely a new `commitments` YAML/event model plus task-brief/dock rendering. It should reference an assignment or learn item but not alter learning stability. Existing `teach_hint` nudges are a partial precursor, though they currently store at most one mid-window self-check.

**Effort.** A few days for a narrow one-commitment model; a phase if calendar reminders, snooze semantics, and editing/recovery are included.

**Biggest risk/tension.** A commitment can become another workflow burden or an accidental auto-grading proxy. Keep the success condition observable and student-controlled—started/completed action—not “earned a grade.”

### 5. “Why this now?” checkpoint narrative — shipped; validate comprehension

**What it is.** When surfacing a review or Top-3 card, show a short causal explanation: “This claim is due because the scheduled gap elapsed,” “this assignment is ahead because it feeds the exam checkpoint,” or “this is workflow, so it is not entering the learning store.”

**Why it fits.** Effective learning strategies are counterintuitive. Explaining the reason can improve buy-in without gamified rewards. It also makes the system’s choices inspectable, which is particularly important when a student sees a difficult retrieval prompt instead of a comfortable reread.

**Where it lives.** Implemented through `learn_loop.py` (`why_due`, evidence/health rendering), prompt assembly, and the dock review surface. Existing fields were sufficient.

**Effort.** Initial implementation is complete; remaining effort is copy testing and regression coverage.

**Biggest risk/tension.** Explanations can become lectures. Keep them to one clause and never let “why” delay the actual check.

## Borderline / research before committing

### Personal-best comparison

Past-self weeks are a valid optional row on the class leaderboard, not a separate mechanic and not a peer board. Small samples and semester breaks still make a naive “best” misleading, so a week only ranks when it has the same score definition as the live class row, and a gap is an absent row, not a loss. See [`docs/design/class-standings.md`](../design/class-standings.md).

### Variable rewards

Unexpected examples, diagrams, or small narrative acknowledgements could make retrieval less monotonous. But variable-ratio reward is primarily an engagement mechanism, and the system should not randomize academic feedback or hide the reason a claim was selected. Use surprise in content examples, not in access to help or scheduling.

### Mascot/brand voice

A warm voice could reduce avoidance, but a mascot is distribution/retention infrastructure for a mass-market app. In this local single-user context, a calm and non-shaming “study companion” voice is sufficient; a character subsystem is not justified.

## Authorized after product call — optional class standings and class marks

The first pass rejected every leaderboard and every badge because the obvious versions compete on the wrong unit: peers, shared cohorts, or lessons completed. Jacob asked for a leaderboard that stays hidden until the student wants the competition visual, and for badges that belong to classes and can be built out in more than one way. Those two are now in scope, under the constraints below. The buildout plan is [`docs/design/class-standings.md`](../design/class-standings.md). Neither is implemented yet.

**What changed.** Competition is allowed when the contestants are the student’s own courses, or past weeks of those courses, and the board is off unless the student turns the visual on. Class badges are allowed when each mark names a course-specific academic event already implied by the learn loop, not a lesson counter.

**What did not change.**

- Hidden by default. Opening the dock, writing a brief, or finishing a review must not reveal the board or announce a mark.
- No peer population and no shared student data. A global board and a cohort board stay rejected.
- The score is not claim count, app opens, or brief continuity. Courses are incomparable if the board ranks raw totals.
- A badge does not move `stability`, write `learning_profile`, or write `habit.yaml`. It is a mark beside the loop, not a second progression system.
- “No permanent learner type badge” in [`docs/design/learning-profile.md`](../design/learning-profile.md) still holds. These marks are class events, not an identity label.

## Rejected mechanics

- **Daily streak based on app opens or any activity:** rewards contact frequency, conflicts with delayed-hit-only stability, and creates anxiety after an interruption. The existing brief-only streak is a deliberately limited exception, not evidence that this broader mechanic is acceptable.
- **Streak freeze / repair purchase:** solves a monetization-shaped problem that does not exist here and turns recovery into a scarce resource; use graceful recovery instead.
- **XP, coins, gems, and badges for lessons completed:** risks counting exposure, not durable recall; adds a second progression system beside `stability`. Class marks in the design doc are not this mechanic.
- **Global leaderboard:** no legitimate peer population in a local-first single-user product.
- **Cohort leaderboard from shared student data:** requires social/infrastructure/privacy scope explicitly ruled out by the current architecture and would incentivize quantity comparisons across incomparable courses. An optional private class board is not this mechanic.
- **Hearts/lives or energy limits:** punitive friction is inappropriate for high-stakes coursework and could discourage a student precisely when a miss is useful feedback.
- **Loss-aversion countdowns and escalating push notifications:** likely to improve return rate at the cost of shame, sleep, and trust; no need to recreate Duolingo’s engagement funnel.
- **Randomized loot / variable-ratio prizes:** weak connection to learning outcomes and unnecessary opacity in a tool whose scheduling should be explainable.
- **IRT-style difficulty calibration as a first move:** potentially useful for a real item bank, but this product has student-authored claims and no quiz-taking engine; it would be a large model change with unclear benefit.
- **Replacing the current scheduler with FSRS/SM-2:** Anki’s current FSRS is a valid reference, but the repo intentionally uses a simpler exam-relative delayed-hit model. A scheduler swap would erase an explicit pedagogical choice before there is evidence it is failing.
- **Skill-tree/course-map completion:** attractive visualization, but course content is not a stable authored tree and Canvas/inbox data is incomplete. It would reward catalog coverage rather than transfer.
- **Social co-study as a product dependency:** useful in some contexts, but requires accounts, presence, privacy, and synchronization outside the current local-first truth path.
- **Automatic quiz generation or quiz-taking:** explicitly out of scope and dangerously close to assessment automation, even if framed as a game.
- **Grades, points, or predicted exam scores as progress rewards:** invites false precision and crosses toward grading/assessment claims the system is not authorized to make.

## Three ideas that remain novel after the buildout

### A. The “semester garden” made of decisions, not minutes

Borrow Forest’s visible accumulation, but grow a course garden from meaningful academic transitions: a corrected misconception, a completed closed-book retrieval, a project decision recorded, or a checkpoint reached. Workflow-only items can appear as paths or markers but cannot grow a learning plant. At semester end, the garden is a private retrospective of what kinds of work actually moved forward—not a total-hours trophy.

**Likely home:** a new read-only visualization fed by ledger/learn-loop/focus events; avoid changing core state first.  
**Effort:** a phase, especially if event provenance is not yet uniform.  
**Novelty:** converts progress visualization into an explanation of *quality and decisions*, not time or login frequency.

### B. The “counterfactual next step”

For a stalled or late item, show two small futures: “If you do the 10-minute retrieval now, the next scheduled check remains before the checkpoint”; “If you only reread tonight, no delayed-hit evidence is added.” This is a behavioral-economics intervention without punishment: make the consequence of the present choice concrete, while preserving autonomy.

**Likely home:** `teach_hint` / task-brief card, derived from checkpoint and review state.  
**Effort:** hours for a deterministic text experiment; days to validate tone and avoid overclaiming.

**Novelty:** combines the product’s real scheduling state with commitment-device psychology, but keeps the decision with the student and does not use a streak or threat.

### C. The “review budget”

When several courses compete for attention, show a small, explainable daily budget for retrieval—such as “two due checks now; one checkpoint claim later”—based on the existing due-review limit and checkpoint dates. The budget is not an energy system and never blocks additional studying; it simply prevents the dock from presenting an undifferentiated wall of claims. A student can always open the full state, while the default surface protects attention and keeps the highest-value checks visible.

**Likely home:** `due_reviews`, `practice_surface`, and the dock’s review session; reuse the existing limit and course/checkpoint ordering before adding new state.  
**Effort:** hours for a text prototype; days for cross-course ordering and tests.  
**Novelty:** turns the existing attention cap into a transparent planning aid rather than a game resource.

## Cross-cutting tensions to preserve

1. **Streak salience vs. checkpoint-capped spacing.** Daily contact can be good for initiation, but daily contact must not advance stability. If any streak-like surface remains, define its unit as a meaningful, explainable event and display it separately from learning state.
2. **Short sessions vs. durable spacing.** A five-minute start is useful for initiation, but a five-minute session is not automatically a learning success. The UI should launch a bounded action and then wait for the scheduled check.
3. **Progress visibility vs. false mastery.** “Durable” is an internal scheduling state, not transfer, grades, or exam certainty. Every visualization needs calibrated labels.
4. **Automation vs. student agency.** The assistant can select, explain, time-box, and remind; the student still performs retrieval, operates LTI/proctored tools, and submits coursework.
5. **Personalization vs. proxy pollution.** `learning_profile` should continue to learn from explicit format signals, not clicks, silence, time-on-page, or app opens. Engagement telemetry must not silently become pedagogical evidence.
6. **Recovery vs. guilt.** A missed day should change the next action based on current deadlines and review state, not reset a persona, impose a repair cost, or produce escalating shame.
7. **Rich visualization vs. local-first simplicity.** A projection from existing YAML/ledger data is preferable to a hosted analytics subsystem. New durable state needs a clear recovery, migration, and privacy story.

## Recommended sequence

Landed in this pass:

1. Quiet brief-continuity copy, with the stored count kept as exposure only.
2. “Why this now?” on due Today rows; the evidence-ladder `missing` clause stays on the review card.
3. Bounded recovery of a stale `Open with:` — one overdue item, no backlog, no missed-brief count.
4. Durable-recall health on the peek, labeled as a retrieval signal. `learn_loop evaluate` is the local check for delayed reviews, delayed hits, overdue work, and deadline surprises.

Implemented in the remaining slice, still without changing stability or the brief-day rule:

5. Opt-in appointment/commitment — one open row, student-marked started/kept/released, no calendar or money.
6. Semester garden and the outcome-shaped progress trail — projections from `inbox/learn/outcomes.jsonl`, not the actuator ledger.
7. Counterfactual next step and a non-blocking review budget — deterministic text on the due payload.
7. Optional class standings and class marks — framed in [`docs/design/class-standings.md`](../design/class-standings.md), not part of the landed loop.

The success measures should be outcome-shaped: fewer overdue meaningful actions, more scheduled delayed reviews completed, more delayed hits, fewer deadline surprises, and student-reported clarity about why an action was surfaced. DAU, streak length, notification opens, and session count should not be primary metrics.

The local check is `python -m canvas_mcp.core.learn_loop evaluate`. Use a fixed before/after window over the same student and courses: compare due-review completion, delayed-hit rate, overdue work, and deadline surprises. `--record` then `--compare` diffs those four counts. Report the brief count only as an exposure/context variable. Do not infer causality from one semester, and do not treat a longer count as success if delayed reviews or on-time meaningful work do not improve.
