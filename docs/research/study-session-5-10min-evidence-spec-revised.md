# Revised specification: five- and ten-minute study sessions

Research completed 2026-09-18 against the [revision assignment](study-session-revision-research-prompt.md), using the [review](study-session-spec-review-2026-09-17.md), [beta decisions](../handoff/student-beta-2026-09-17.md), [funded-access comparison](funded-ai-access-2026-09-17.md), and [original research brief](study-session-deep-research-prompt.md). The [original synthesis](study-session-5-10min-evidence-spec.md) is preserved. This replaces the earlier revision draft, including its contradictory same-day corrections. It is research and a proposed contract, not product implementation, deployment, account verification, or a human study.

Companions: [closure matrix](study-session-revision-closure-matrix.md), [executable synthetic reference](fixtures/study_session_reference.py). The earlier [validation report](study-session-revision-validation-2026-09-18.md) describes an earlier draft; it does not validate this version.

## 0. Decision brief and changes

Build one complete, source-backed practice cycle with recoverable local work. Offer example-first learning for unfamiliar material and independent review for previously encountered material. Explain selection in one sentence. Give feedback that can abstain, record help honestly, and offer a later check. Five and ten minutes constrain scope; they do not certify a learning dose or impose a forced cutoff.

Retain retrieval, corrective feedback, spaced revisits, a minimal novice path, and a near-exam fallback. Do not infer mastery from completion, confidence, speed, a model's verdict, or one correct response. No new provider: retain Claude/Gemini candidates. No Canvas submission, discussion/comment posting, live-assessment solving, external/proctored operation, or automatic connector writes.

Evidence supports separating learning performance from later retention [E1–E5]. It does not establish the exact timing ladder, superiority of an expanding schedule, or exam gains from this app. The principal engineering change is to separate **observed answer**, **assessment confidence**, **delayed evidence**, and **next offer**. A student can keep learning without earning a delayed-evidence label.

| Previous location/problem | Replacement here |
|---|---|
| Original §1/§3 excerpt-before-review; revision's permanent exposure lock | §1–§2: attempt boundaries, cross-item exposure, finite waiting interval |
| Original §5 early advancement, empty pools, past dates; revision's contradictory writer/proposed scheduler | §3: one pure transition authority, explicit migration boundary, traced fixtures |
| Original §4.3/§5 imaginary source verifier | §4: actual physics packet, scoped numeric check, uncertainty-first validation |
| Original §4.1–4.6 incomplete or mismatched examples | §5: six complete sessions with one shared record |
| Original §6 hashes-as-content and “Never export” | §6: seven-column data matrix and three request traces |
| Original §8 OpenAI selection; revision retry arithmetic and “thinking off” assumption | §7: Claude/Gemini contract, all-dispatch accounting, conditional reasoning bounds |
| Original C15/C20/C23/C26 overclaims | §8: corrected outcome timing; withdraw incomplete effect estimate; engineering rather than universal sparse-data claim; distinguish judgments of learning from self-grading |

**Release scope:** one local deterministic practice template per supported objective type, source import, draft recovery, learn/review modes, source reveal, honest feedback, later offer. Generated prose grading can be useful but remains provisional. Novices and students with tomorrow's exam get usable paths in §5. No cache on first install means import/read/create-or-stop, never a promise of offline practice.

The owner's existing open question—whether $50–$100 includes hosting/fees—still affects allocation. Until answered, treat $50 as the total planning envelope and subtract estimated fixed charges before assigning inference allowance. Model selection and timing constants are configurable engineering choices, not reasons to stop research or ask for approval. No spending or provider migration occurs here.

## 1. Shared vocabulary and minimal local contract

### 1.1 Outcomes, grading, and evidence

Outcome: `correct | partial | incorrect | skipped | interrupted | uncertain`. Item validity is separate: `active | stale | quarantined | withdrawn`. Withdrawal never rewrites what the student originally answered.

Grader: `pending | deterministic | model_proposed | student_self | abstained`. `deterministic` means an explicitly bounded check against a supported key; it does not validate every sentence of a free-text explanation. Model and self grades remain labeled proposals and do not advance stability in this beta contract. This conservative limitation is a product decision, not a claim that all human self-assessment or model grading is useless.

| Evidence label | Meaning | Advances stability? |
|---|---|---|
| `delayed_independent_retrieval` | Correct within the checked scope; scheduled and exposure-adjusted interval elapsed before attempt start; no observed/reported help | Yes |
| `delayed_check` | Same eligibility conditions, but partial/incorrect | Can demote; never a success |
| `baseline_response` | First assessed encounter in this app, including an already knowledgeable student | No |
| `immediate_practice` | Correctness assessed, but early or insufficient interval | No |
| `acquisition_only` | Example-first mode, even if the example is subsequently hidden | No |
| `assisted_response` | Known hint/help; qualify as “assisted success” only if correct | No |
| `exposed_response` | Solution-bearing material seen during this attempt | No |
| `unknown_assistance` | Outside help reported or relevant exposure contents unknown | No |
| `unverified_response` | Model/self judgment or unavailable adequate source/key | No |
| `clock_uncertain` | Timing cannot be trusted | No |
| `no_evidence` | Skip, interruption, pending or uncertain grading | No |
| `invalidated` | A later correction invalidates the scoring basis | Remove affected credit through replay |

Copy: “Correct on this check; no help recorded here.” Never “we verified you worked unaided.” Outside help that the app neither observes nor is told about is undetectable; recorded independence is bounded by that limitation.

### 1.2 Fields and purpose

All identifiers below are local except opaque transport request IDs. All instants store UTC plus the user's IANA zone for display/calendar arithmetic.

```text
Source {id, version, locator, text_or_resolvable_local_snapshot, hash,
        provenance: instructor|student|synthetic|model_candidate,
        permission_scope, ocr_status, captured_at}
Item {id, objective_id, source_versions, stem, rubric, key, checker_scope,
      support_rows, validity, exposure_targets, predicted_duration}
State {item_id, due: Instant?, anchor: Instant?, gap_days: positive integer,
       hits: nonnegative integer, stability: fragile|holding|durable,
       cooldown: Instant?, projection_version, last_event_seq}
AttemptStarted {attempt_id, item_version, started_at, mode: learn|review,
                due_snapshot, state_revision, clock_status}
DraftSaved {attempt_id, revision, text, saved_at}
AttemptSubmitted {event_id, attempt_id, response_text, submitted_at}
Assessment {event_id, attempt_id, outcome, grader, scope, support_refs}
Exposure {event_id, affected_objective_ids, affected_item_ids, attempt_id?,
          occurred_at, sequence, kind, solution_bearing: yes|no|unknown,
          surface, artifact_version}
Correction {event_id, target_event_id, reason_code, replacement?, occurred_at}
PlanReview {event_id, item_id, requested_future_at, reason: student_choice|exam_revision}
Session {id, selected_course, visited_item_ids, requested_duration, mode}
Exam {id, course_id, objective_scope, revision,
      value: known_instant|date_only|unknown|cancelled, zone, provenance}
```

`anchor` is the latest known substantive practice or solution-bearing/help exposure for the objective as of attempt start, not “last credited success.” It moves after both credited and uncredited practice. That allows exposure to delay the next independent check without permanently locking the item. Source version and rubric are saved so a disputed assessment is reproducible. Raw text is necessary for recovery; a hash cannot replace it.

Attempt start, submission, assessment, feedback reveal, and correction are distinct ordered events. Event sequence disambiguates equal timestamps. A crash resume preserves `attempt_id`, original start, and exposure history; a fresh attempt receives a new attempt ID but inherits objective history. Session IDs are UI grouping only.

## 2. R1: exposure and four timelines

### 2.1 What is observable

| Artifact/event | Evidence treatment |
|---|---|
| Neutral provenance label | No exposure; labels must omit answer-bearing titles/filenames; use a neutral locator if a title gives away the answer |
| Instructional excerpt | Classify for each objective: yes/no/unknown; uncertainty is not treated as clean |
| Preview answer cue, worked example, full reveal | Solution-bearing, including previews before attempt creation |
| Hint | Assistance even if it does not state the complete answer; reset objective encounter time |
| Previous item's feedback | Mark every known overlapping objective; unresolved overlap gives unknown assistance for the affected candidate |
| In-app source viewer/tab | Log before rendering; a tab switch alone does not prove help |
| Outside notes, another AI, another person | Unknown to app unless reported; no surveillance or automatic accusation |
| Crash/resume/new session seconds later | Inherit on-disk history; never erase exposure by remounting |

A source display must durably log its exposure before showing an answer-bearing surface. On write failure, allow reading only with an explicit untracked-study warning and disable evidence credit until repaired. A late “I looked something up” report targets the relevant attempt, appends a correction, and rebuilds the projection; it does not delete the answer or penalize the student.

### 2.2 Eligibility interval

At attempt start, require a prior local encounter, a known due date already reached, and the **planned gap since the latest substantive encounter**, with an additional elapsed-time floor of 12 hours. The gap is measured in local calendar days; the floor is elapsed UTC time. During the attempt, any relevant help/exposure/unknown assistance makes it ineligible. The attempt must start after the gate, not merely finish after it.

Both the ladder and 12-hour floor are unvalidated product hypotheses. E1/E2 motivate temporal separation, not these numbers. Unlike the previous draft, this contract does not search all historical exposures and reject whenever any exists. It compares the most recent prior encounter against a finite interval. Showing feedback after submission does not alter the earlier attempt's evidence; it starts the interval for the **next** attempt. Another session seconds later fails the same objective-level clock check.

First-ever correct answers establish a baseline; they cannot show that an interval observed by this app was survived. Imported prior knowledge can guide selection without being fabricated as an app-observed delayed success.

### 2.3 Four scope budgets

All budgets include a small feedback/loading allowance; latency beyond that allowance removes optional work or extends elapsed duration. Reading estimates are planning assumptions, not measured beta performance. No timer submits an answer or ends reasoning.

| Timeline | Exact sequence in seconds | Total |
|---|---|---|
| T1: 5-minute learn | 0–20 purpose; 20–80 source/example; 80–170 faded step; 170–250 feedback/repair; 250–300 save and choose later check | 300 |
| T2: 5-minute review | 0–20 objective + neutral locator; 20–170 attempt; 170–240 feedback + source; 240–280 optional repair; 280–300 close | 300 |
| T3: 10-minute learn | 0–25 purpose; 25–145 example; 145–235 explain/faded step; 235–415 short isomorph; 415–535 feedback/repair; 535–600 close | 600 |
| T4: 10-minute review | 0–25 objective + locator; 25–265 attempt; 265–365 feedback; 365–515 optional repair/contrast; 515–600 close | 600 |

In T1/T3 the example is deliberately visible before practice; all same-cycle attempts remain acquisition. In T2/T4 no solution-bearing excerpt, key, accessibility description, preview, or tooltip appears before submission/help. Hidden answers must be absent from the accessible tree, not merely visually blurred.

Correct: optionally explain or compare after feedback. Partial/wrong: spend the optional block on one concrete repair. Help: use the remaining attempt time for a hint/example; mark assistance. Skip: leave the item and offer another only if time remains. Interrupted: save a draft and finish later; elapsed duration is not relabeled five minutes. Early exit after feedback is a complete cycle; before feedback it is a saved incomplete attempt. Long proofs, extended writing, and integrated exam problems need a longer block; a short session can select a method or plan the first step.

### 2.4 Eight before/after traces

Unless stated otherwise: Sep 18 09:00 Denver, prior anchor Sep 15 09:00, gap 3 days, due Sep 18 09:00, stability fragile, hits 0. Review starts 09:00, submits 09:03. Deterministic grading within the stated scope.

| Trace | Events | Incorrect earlier interpretation → revised outcome/evidence/schedule/copy |
|---|---|---|
| X1 clean | No pre-attempt help; correct | Unqualified “retained” → correct / delayed independent / holding, gap 7, due Sep 25 09:03. “Correct after the scheduled gap; no help recorded here.” |
| X2 preview | Excerpt 08:59; correct | Hidden-at-answer-time counted independent → correct / immediate practice (prior exposure resets anchor), due held; exposure during attempt instead gives exposed response. “You saw relevant material recently; this is practice.” |
| X3 hint | Hint at 09:01; correct | Help flag forgotten later → correct / assisted response; stability and due held, anchor 09:03. “Correct with a hint; revisit later without it.” |
| X4 reveal/retry | Reveal 09:01, submit 09:03; reopen 09:04 | New session clears exposure → first exposed response; next immediate practice; neither credited. “Seeing the solution is learning, not a delayed check.” |
| X5 example/transfer | Learn example at 09:00; new isomorph correct 09:07 | Different item ID treated independent → acquisition only; new item's first due Sep 19 09:07. “You applied the example; check again later.” |
| X6 resume | Draft 09:01, crash, resume 09:10, correct 09:15 | New session loses history → same original attempt; clean due answer earns delayed credit, due Sep 25 09:15. If source was shown before crash, no credit. “Draft restored with its study history.” |
| X7 outside report | Correct 09:03; at 09:04 report notes used | Earlier credit kept → original answer correct, corrected label unknown assistance; replay removes credit, restores old due and anchor 09:03. “Help noted; a later independent check will be more informative.” |
| X8 unknown | In-app source artifact cannot be classified | Unknown treated clean → correct / unknown assistance; hold. Undisclosed outside help remains undetectable and may receive a recorded independent label; copy never claims universal detection. |

## 3. R2: total state transitions and offers

### 3.1 Architecture and deliberate compatibility boundary

Three operations: (1) append an attempt/assessment event idempotently; (2) derive evidence and state from ordered committed events; (3) select an offer without changing history. One authority computes each state transition. Do not call a legacy writer and then overwrite its schedule with a second contradictory scheduler.

Direct inspection: `learn_loop.record_outcome` already checks `scheduled is not None and moment >= scheduled`, and protects stability when `same_session` is true. Preserve that invariant and its regression tests. Its current substantial-gap promotion, UTC/date arithmetic, skip rescheduling, and lack of event IDs are **not** the proposed algorithm below. The earlier revision incorrectly claimed byte-for-byte compatibility while changing those behaviors. A future implementation must explicitly add a versioned event reducer/adapter and migrate projections, or retain legacy scheduling and revise this proposal; it cannot silently claim both.

The proposal uses local counters: first eligible success → holding; a second eligible success → durable. These are internal scheduling states, not estimated mastery. Existing histories lacking exposure/assessment provenance are imported as unverified baselines, not newly certified successes. No migration occurs in this research task.

### 3.2 Result types and helper contracts

```text
RecordResult = Recorded(event_id) | Duplicate(event_id)
             | PersistenceFailed | PersistenceUnknown
Schedule = NextAt(instant > now, basis) | Held(existing: Instant?)
         | NoPreExamSlot | NeedsExamDate
Selection = Offer(item, learn|review|practice, why)
          | NoReviewNeeded(next_future_instant)
          | NoEligibleItem(reason, import|create|read|stop)
          | MissingSource | NeedsExamDate | NoPreExamSlot
```

`Held` may contain an overdue date, deliberately; only **new** `NextAt` dates must be future. `due=None` on a fresh item means unscheduled; after `NoPreExamSlot`, preserve that explicit schedule status so it is not mistaken for freshness.

Helpers: `calendar_add(t,n,zone)` adds positive integer local days at the same wall time, chooses the later fold on an ambiguous time and normalizes a nonexistent time forward through the gap. `expand(g)` is 1→3→7→14→21, thereafter 21; validate integer g in [1,21] at the boundary. `max_anchor_before(start_seq)` includes graded encounters and yes/unknown exposures before that event, even from other items sharing the objective. `clean_during` reads events from start through submission, excluding later feedback. `assessment_valid` requires the bounded deterministic check and current supported source version. Semantic model proposals cannot satisfy it.

`exam_cutoff`: for a confirmed instant, exam minus one hour; for a date-only record, **start of that date in the named zone minus one hour** as a conservative planning boundary, not a fabricated exam time. Missing/invalid zone or malformed date → unknown. Past/cancelled exams impose no cap in ordinary learning; cram returns no-pre-exam-slot for past exams and needs-date for unknown/cancelled. Choose the nearest future exam whose course/objective scope matches; ties by exam ID. A moved exam changes planning only, never evidence history. If recapping yields a past boundary, return NoPreExamSlot. A cancelled exam removes its cap; retain an existing earlier due date unless the student reschedules.

### 3.3 Typed pseudocode

The accompanying Python reference executes the core reducer and selector over already-validated typed inputs. Boundary parsing rejects malformed timestamps, missing zones, negative gaps and inconsistent event order as explicit validation errors before reduction. It models source/exposure state as supplied inputs rather than implementing an event database. Persistence and assessment validation remain explicit implementation contracts, not simulated guarantees.

```python
record(event: Event) -> RecordResult:
    # One atomic local transaction, unique event_id and unique assessment revision.
    # Duplicate identical ID: return existing acknowledgment.
    # Same ID with different bytes: reject conflict, do not overwrite.
    # Commit log + projection cursor atomically, or recover projection by pure replay.
    return append_durably_or_explicit_failure(event)

eligible(state: State, attempt: Attempt) -> bool:
    anchor = max_anchor_before(attempt.start_sequence)
    return (
        anchor is not None and state.due is not None
        and attempt.started_at >= state.due
        and attempt.started_at >= calendar_add(anchor, state.gap_days, zone)
        and attempt.started_at - anchor >= hours(12)
        and attempt.mode == review and clean_during(attempt)
        and attempt.assistance == none and attempt.clock_status == trusted
        and assessment_valid(attempt)
    )

update(state: State, attempt: Attempt) -> EvidenceUpdate:
    if already_applied(attempt.assessment_event_id): return unchanged_duplicate
    label = classify_in_order_from_section_1(attempt, eligible(state, attempt))
    if withdrawn_or_invalid_source: return unchanged_with(label)
    if outcome in [skipped, interrupted, uncertain] or grader != deterministic:
        return unchanged_with(label)
    if clock_status != trusted: return unchanged_with(clock_uncertain)
    was_eligible = eligible(state, attempt)  # BEFORE moving anchor
    state.anchor = attempt.submitted_at    # same-session practice also counts as encounter
    if state.is_fresh:
        state.gap_days = 1
        return baseline_with(schedule(attempt.submitted_at, 1, exam_cutoff))
    if not was_eligible: return hold_stability_and_due_with(label)
    if outcome == correct:
        state.hits += 1
        state.stability = holding if state.hits == 1 else durable
        state.gap_days = expand(state.gap_days)
        return schedule_days(state.gap_days)
    if outcome == partial:
        state.hits = max(0, state.hits - 1)
        state.stability = holding if state.stability == durable else fragile
        state.gap_days = 1
        return schedule_days(1)
    state.hits = 0; state.stability = fragile; state.gap_days = 1
    return schedule_hours(1 if exam_within_24h else 4)

schedule(now: Instant, delay: PositiveDuration, cutoff: Instant?) -> Schedule:
    candidate = add_duration_or_local_days(now, delay)
    if cutoff is not None:
        if cutoff <= now: return NoPreExamSlot
        candidate = min(candidate, cutoff)
    assert candidate > now
    return NextAt(candidate, repair_or_review)

select(pool: Pool, session: Session, now: Instant) -> Selection:
    if no_permitted_sources(pool): return MissingSource
    live = active_source_valid_items(pool)
    if not live: return NoEligibleItem('no usable items', create_or_import)
    if session.cram and exam_unknown: return NeedsExamDate
    if session.cram and exam_past: return NoPreExamSlot
    remaining = live minus session.visited_item_ids
    if not remaining: return NoEligibleItem('all visited or skipped', stop)
    # Compute (max(due, cooldown), id), using now for genuinely fresh items.
    # Exclude explicit NoPreExamSlot items in cram; never dereference an empty list.
    if no_remaining_offerable_statuses: return NoPreExamSlot
    item = minimum_by_offer_time_then_id(remaining)
    if item.offer_at > now: return NoReviewNeeded(item.offer_at)
    mode = learn if novice_or_requested_example else review
    if recent_exposure_or_early_repair: mode = practice  # cannot earn delayed credit
    return Offer(item, mode, source_backed_reason)
```

`PlanReview` changes a future offer date only; it cannot change the encounter anchor, grading, or earned evidence. A date earlier than the independent-evidence gate is labeled practice.

`practice` is a selection label; its attempt is recorded as learn or review with actual exposure/time gate, never automatically independent. Source reveal writes `anchor=exposure_time` and `cooldown=exposure_time+12h` for automatic offering. Student-requested practice may bypass cooldown with honest labeling. Skip adds the item to `visited_item_ids`, leaves its due date unchanged, and writes no success. On restart restore an interrupted session's visited set; deliberately starting a new session permits another choice but does not reset objective timing.

A repair offered in four hours is useful practice; the one-day evidence gap may not yet be satisfied. A near-exam cap can similarly create an earlier practice slot without qualifying for delayed credit. Selection eligibility and evidence eligibility intentionally differ.

### 3.4 Transition table

| Event | Stability / evidence | Due / next offer |
|---|---|---|
| First assessed encounter | Baseline/acquisition; no delayed credit | Schedule +1 local day if a future slot exists |
| Due, clean, valid correct | Increment hits; holding then durable | Expanded gap, capped as specified |
| Due, clean, valid partial/miss | Partial demotes one state; miss fragile | +1 day / +4h (+1h near exam) |
| Early, helped, exposed, insufficient interval | No promotion or demotion | Existing due held; anchor updated; exposure cooldown applies |
| Model/self/abstained/pending | No evidence credit | Due held; any displayed feedback still logs exposure |
| Skip | No evidence change | Due held; visited prevents loop |
| Interrupted | No fabricated score | Draft + original start restored |
| Duplicate | No second projection | Same acknowledgment, same state |
| Invalidated grading | Replay without invalid assessment | Recompute subsequent events, not a blind rollback |
| Clock anomaly | No temporal evidence | Save answer; resolve clock before making precise new dates |

Both backward and implausible forward jumps can falsify elapsed time. Compare wall and monotonic elapsed time within a process; flag discrepancies (proposed tolerance five minutes). Across restarts, local time cannot be made tamper-proof without a trusted external time source. Persist the anomaly, label uncertain, and allow practice. Do not claim a forward jump is inherently safe.

### 3.5 Concrete boundary fixtures

Times below are 2026 in America/Denver, -06:00 in September. Base B: due Sep 18 09:00, anchor Sep 15 09:00, gap 3, fragile/hits0, active source. A: starts Sep 18 09:00, submits 09:03, deterministic correct. Unless listed, exam unknown (ordinary learning uncapped). State snapshots refer to after assessment and before feedback; any later reveal is another event. “Visited” means the current session suppresses automatic repetition.

| ID | Initial + event | Resulting state and next selection |
|---|---|---|
| F01 | B + A | holding/hits1/gap7; due Sep 25 09:03; visited now; new session NoReviewNeeded |
| F02 | B but due Sep 19 09:00 + A | fragile/hits0/gap3; due unchanged; anchor Sep 18 09:03; immediate practice |
| F03 | B, excerpt Sep 18 08:59 + A | anchor reset; no delayed credit; due held; cooldown until 20:59; NoReviewNeeded until cooldown |
| F04 | B, hint 09:01 + A | assisted response; fragile, due held, anchor09:03; visited; no independent credit |
| F05 | B reveal09:01, submit09:03, new session09:04 | exposed then immediate; due held; automatic offer waits until21:01 |
| F06 | F05 state; next attempt Sep 21 09:10–09:14, no help | last substantive attempt09:03 Sep 18, >3 local days; eligible; holding/gap7/dueSep28 09:14 |
| F07 | B durable/hits2 + partial at09:03 | holding/hits1/gap1/dueSep19 09:03; next future offer |
| F08 | B holding/hits1; incorrect09:03, exam Sep 18 14:00 | fragile/hits0/gap1/due10:03; offer then as practice, not delayed evidence |
| F09 | B skip09:01, repeated skip09:03 | dueSep18 09:00 unchanged; no credit; NoEligibleItem for this session |
| F10 | Three due items skipped at09:01/09:02/09:03 | all original due dates held; NoEligibleItem(stop), no loop |
| F11 | Two items dueSep21/Sep 22, examSep21 (3-day horizon) | unchanged; NoReviewNeeded(Sep 21); explicit practice/new objective available now |
| F12 | Sources exist, no items | NoEligibleItem(create), no min(empty) |
| F13 | No sources, no items, cram, exam unknown | MissingSource first; import before date-specific triage |
| F14 | B, cram, examTBD or malformed Feb30 | NeedsExamDate; ordinary review still available |
| F15 | B, examSep10 | Cram NoPreExamSlot; ordinary A gives uncapped dueSep25 09:03 |
| F16 | B's dueSep24 09:00, exam movedSep25→Sep 21 date-only atSep18 noon | cap is Sep 20 23:00; recapped dueSep20 23:00, evidence unchanged |
| F17 | Two matched exams Sep 21/Sep 28 | select earliest relevant future exam; cancelledSep21 leavesSep28; ties exam ID; no global unrelated-course cap |
| F18 | dueOct31 20:00, anchorOct30 20:00, gap1; correctOct31 20:05; examNov5 date-only | gap3 dueNov3 20:05 MST; 73 elapsed hours across DST; NoReviewNeeded |
| F19 | B; A then retry same event ID | identical state F01; Duplicate; no second success |
| F20 | All items withdrawn | NoEligibleItem(import/create); no empty-pool crash |
| F21 | Fresh item dueNone/anchorNone; A | baseline response, fragile/hits0/gap1, dueSep19 09:03 |
| F22 | B A, examSep18 09:30 | cutoff08:30 already passed; NoPreExamSlot, no past NextAt; offer stop or ordinary post-exam learning |
| F23 | Every due item overlaps source just shown09:00 | cooldown21:00; NoReviewNeeded then; explicit assisted practice allowed |
| F24 | B start08:59, submit09:03 | immediate practice despite submission after due; hold |
| F25 | B draft09:01, crash09:02, resume09:10, submit09:15, clean | delayed independent, holding/gap7/dueSep25 09:15; same original attempt |
| F26 | B A but source missing/expired or model-only grade | unverified response; fragile/due held; source repair/unscored practice |
| F27 | Log write fails at09:03 | PersistenceFailed; no projection; unsaved warning, retry same event ID |
| F28 | Commit acknowledgment lost; restart09:05 finds event ID | Duplicate acknowledgment; replay once using saved pre-event state, never call mutable writer twice |
| F29 | Wall clock jumps forward7 days without monotonic elapsed change | clock uncertain; no delayed credit, no precise new date until resolved |
| F30 | New gap7 fromSep18 09:03; exams date-only tomorrow/3d/7d/15d | candidateSep25 09:03; cap dates respectively Sep 18 23:00 / Sep 20 23:00 / Sep 24 23:00 / Oct 2 23:00; resulting due first three caps, fourth Sep 25 09:03; earlier-than-gap offers practice |
| F31 | Late B attemptSep29 09:00–09:03, examOct15 | one eligible success, not several missed successes; holding/gap7/dueOct6 09:03 |
| F32 | A credited then help reported09:04 | append correction, replay: fragile/hits0, old due held, anchor09:03; no penalty language |

These fixtures are traced specification examples. The reference checker tests 38 synthetic assertions covering the core branches, DST, arithmetic, and exposure clearing. It does **not** test transactions, crash durability, exam parsing, correction replay, providers, or app integration. Those remain acceptance tests for implementation; do not call the whole table executed.

Daily/weekly behavior: show up to two due objectives as an initial, optional scope choice; keep all outstanding dates rather than multiplying missed sessions into a backlog debt. Tomorrow: choose one source-confirmed high-value weakness and offer practice; 3 days: one revisit plus a later check if time permits; 7 days: several spaced opportunities; 2+ weeks: expand only after eligible successes. Recheck scope/date changes locally. These are understandable defaults, not optimized prescriptions. Complex knowledge tracing is deferred for development/calibration cost, not because sparse-data inference is universally impossible.

## 4. R3: grounding with real supporting material

### 4.1 Synthetic physics packet

All text in this packet is authored for this specification, not instructor evidence or a live assessment. Source `P`, version1, locator P1–P7; implementations compute the actual hash from the saved text (no fictional hash masquerades as a verified digest).

- P1: Mechanical energy is K + gravitational potential + spring potential: K=mv²/2, Ug=mgh, Us=kx²/2.
- P2: Mechanical energy is conserved if only conservative forces do work.
- P3: Kinetic friction is non-conservative; its work depends on path length and cannot generally be represented by a potential energy of position.
- P4: For constant kinetic friction on this straight incline, Wf=−μk N d, with N=mg cosθ. The coefficient and angle remain constant throughout the total path, including spring compression.
- P5: The block begins and ends at rest. The final height is the zero reference; the release point is h=d sinθ above it. Down-slope displacement is positive; the spring lies along the incline.
- P6: Therefore m g d sinθ − μk m g cosθ d = k x²/2. Here d includes compression; it is not just the distance before contact with the spring.
- P7: m=2kg, g=9.8m/s², θ=30°, μk=.20, k=800N/m, total d=1.50m. Accept x within2% of the reference if units and work sign are correct.

Question: “Find maximum compression x and explain whether mechanical energy is conserved.”

Derivation: released gravitational energy14.70J; friction loss5.091229J; spring energy9.608771J; x=√(2×9.608771/800)=0.154982m. Reverse check: spring energy + loss =14.70J; units of both terms are joules; x<d. The standalone calculation passes. Assumptions matter: if d excluded compression, this would be a different equation.

Wrong generated explanation: “Friction is potential energy; use mgh=kx²/2+μmgx.” P3 contradicts the potential claim; P4/P6 establish both the cosθ factor and total path d. A number check alone cannot validate prose. The displayed replacement is the supplied derivation with P3/P4/P6 locators. Label its provenance “synthetic template derivation,” never “instructor-equivalent key.”

### 4.2 Support statuses and bounded validation

| Status | What is actually established | Action |
|---|---|---|
| explicit_support | Exact passage identity is deterministic; semantic applicability may remain proposed | Quote locator and distinguish matched quotation from interpretation |
| derivation_under_assumptions | A declared calculation follows under supported assumptions | Score only the checker scope; show assumptions |
| contradiction | Positive evidence against a claim, not absence of a phrase | Correct only where a validated rule establishes conflict; otherwise flag proposed contradiction |
| insufficient_evidence | Available packet cannot support a verdict | Abstain, repair source, or keep unscored practice |
| source_conflict | Relevant sources disagree or interpretation is unresolved | Display both; do not silently rank one as authoritative |

Instructor, student, model-candidate, and synthetic sources carry distinct provenance. A model-generated key may become a usable **derived** key only after an independent bounded derivation validates it against adequate material; model origin never turns into instructor authorship. Two-model agreement is not that validation.

```text
validate(item, assessment, sources) -> Usable(scope) | Proposed | Unscored | Withdrawn:
  validate schema, permissions, source existence, version and quoted locator
  if missing source or OCR ambiguity: Unscored(repair)
  if changed version: block new scoring until item/key revalidated
  check for unresolved source conflict BEFORE accepting a model proposal
  if conflict: Unscored(show both)
  run declared deterministic checks: units, numeric tolerance, exact term,
    or supported symbolic domain; unknown/out-of-scope is not a pass
  if key lacks support/derivation: Withdrawn(unsupported key)
  if deterministic scope passes: Usable(that scope)
  if only semantic model judgment remains: Proposed(no stability credit)
  otherwise: Unscored
```

Source existence, hash, quote match and JSON validity are implementable checks. General entailment, rubric interpretation, and judging a student's causal explanation are model/human judgments. A quote matcher cannot establish that a source is complete, detect every contradictory passage, or prove that OCR interpreted a number correctly. In beta, restrict scored templates to known packets/checker scopes; abstain on open-ended ambiguity.

### 4.3 Failure and correction cases

| Case | Behavior | History |
|---|---|---|
| Missing source snapshot | Unscored attempt allowed, restore/import source offered | Keep answer, due held, no success |
| Notes say μmgd; another source says μmg cosθ d, assumptions unclear | Show both and request clarification of geometry; do not assume identical setups | Uncertain, no credit |
| OCR “020” could be0.20 or20 | Quarantine until original image/typed line confirms value; OCR confidence alone insufficient | No scored item; preserve draft if already started |
| Generated key unsupported | Withdraw item; show explanation that the question failed validation | Append invalidation; replay affected assessment and later dependent transitions |
| Source changed | Preserve old snapshot for old attempts; revalidate new version before new scoring | A content edit alone does not prove an old answer wrong |

If bad feedback was already displayed, retain that exposure event even when its grade is invalidated: the student still encountered it. Append a correction naming the defective assessment; replay the entire affected objective history under the versioned reducer. Do not reset to a saved pre-error state and accidentally erase later valid work. Repeating the same correction ID is idempotent. Embedded source instructions cannot authorize actions or change this policy.

## 5. R4: six complete synthetic sessions

### 5.1 Common record and controls

Every session below uses §1 fields. IDs S1–S6 identify saved source/item/attempt packets. Local storage retains verbatim source, question, rubric, answer, feedback, start/submission times and event history. `assistance=none` unless stated. Any feedback reveal is logged **after** the stated assessment snapshot; it updates anchor/cooldown but cannot retroactively contaminate that attempt. A “disagree” control appends an uncertain assessment/correction and recomputes credit; source view/help/skip/stop are always available. No scenario is a real course assignment.

Network default N0: local template/checking only; no content transmission. N1: one feedback request sends selected source/rubric, stem and answer through the authenticated relay to an approved paid endpoint; service keeps only operational metadata. No whole course/profile upload. Optional analytics A0: off. If opted in, increment only `session_started` and `session_finished` counts, not outcome, item, course, assistance or progress. Each scenario's branch inherits A0.

### 5.2 S1 — novice quantitative, ten minutes

**Packet Q, v1, §chain.** “For y=f(g(x)), y′=f′(g(x))g′(x). Derivative of sinx is cosx. Example: y=(3x²+1)^5 gives y′=5(3x²+1)^4·6x. The6x differentiates the inside.” Rubric for new item: identify inner sinx; apply power rule; multiply by cosx. Key4sin³x cosx, restricted expression template check.

Now Sep 18 19:00; examSep28 date-only. New student explicitly says “I don't know this rule,” so learn mode is chosen; no-history alone does not establish novice status. Initial fragile/hits0/gap1/dueNone/anchorNone.

T3 UI: purpose25s (“Start with one example, then use the same rule”); read example120s; explain/faded step90s (“The6x comes from differentiating3x²+1; fill the missing inner derivative”); new item180s; feedback/repair120s; close65s. Example visible before practice and then collapsed; exposure Q at19:00:25 applies to the whole procedure.

Question at19:03:55: “Differentiate y=(sinx)^4. Name the inner function and enter the derivative.” Full response at19:06:55: “Inner function is sinx. The outer power gives4sin³x, so y′=4sin³x.” Deterministic structured fields establish partial: inner and outer right, missing cosx. Feedback: “Multiply by the derivative of the inside: cosx. Q §chain states both that derivative and the chain rule. The result is4sin³x cosx.” Repair response: “The extra factor is cosx, from the inside.” The repair is acquisition, not another delayed hit.

Assessment snapshot: partial/deterministic/acquisition_only, assistance none, fragile/hits0/gap1, dueSep19 19:06:55. Feedback at19:07:00 and repair at19:08:30 update anchor to19:08:30; automatic next offer remains the due date, but independent eligibility is no earlier thanSep19 19:08:30. Close offers that later time for an independent check, preserving the original due record. Next question: derivative of(2x+1)^7, reference14(2x+1)^6.

Interruption branch: quit at19:05 with saved draft “Inner function is sinx.” Resume retains original attempt/start/example exposure. Finish later with same grading; wall-clock session becomes longer than ten minutes. If exiting before submission, outcome interrupted/pending, no new due until an assessed baseline. Network N0; N1 optional explanation only, not required for deterministic grade. A0.

### 5.3 S2 — partly prepared concept science, five minutes

**Packet C, v1, §buffer.** “A buffer contains a weak acid HA and conjugate base A−. Small additions of strong acid consume A− to form HA. Strong base consumes HA. Buffering limits pH change within capacity; it does not mean pH7.” Item asks a bounded species selection and a separate free explanation; key F− for an HF/F− mixture receiving a small HCl addition.

Now Sep 21 09:00; examSep24 date-only. Initial fragile/hits0/gap3, dueSep21 09:00, anchorSep18 08:00. Review T2:20s objective/locator,150s attempt,70s feedback,40s optional repair,20s close. Before answer only “Predict which buffer species is consumed” and neutral locator C; no excerpt.

Question: “Choose HF or F− as the species consumed by added HCl; explain in one or two sentences.” Full answer09:02:50: “F−. It accepts H+ from HCl and forms HF, so a small addition changes pH only a little.” Deterministic correct **for the selected species only**; prose is shown as compatible with the source but is not automatically a verified causal-explanation score. Reference as packet C; no hints.

Feedback09:02:55: “F− is the keyed species. C §buffer explains its reaction with added acid. This is a delayed check of species selection; it does not establish all of buffer chemistry.” Partial/wrong branch instead names the missed species and offers one repaired sentence; no demand to guess until green.

Final assessment state: correct/deterministic/delayed_independent_retrieval(scope species selection), holding/hits1/gap7. Expanded candidateSep28 09:02:50 is capped toSep23 23:00 (date-only planning cutoff). After source reveal anchor09:02:55 Sep 21, cooldown21:02:55. A revisit before seven days is practice, not another delayed success. Early exit at09:04 after feedback preserves the complete cycle; no second question owed. Network N0, optional N1 for provisional explanation only. A0.

### 5.4 S3 — advanced transfer gap and bad AI feedback, ten minutes

Packet P1–P7 from §4, item physics-v1. Now Sep 18 20:00; examOct6 date-only. New friction item fragile/hits0/dueNone; a frictionless sibling has earlier independent successes, which do not transfer automatically. Review mode is a diagnostic baseline. “The familiar energy method now includes friction; choose which equation still applies.”

T4:25s neutral objective/locator;240s solving;100s feedback;150s repair;85s close. No packet/key before the attempt. Full answer20:04:25: “I used mgh=kx²/2. With h=.75m, x=√(29.4/800)=.1917m. Mechanical energy is conserved because the block starts and ends at rest.” Rubric: nonconservative friction, correct work term, numerical compression. Deterministic numeric field is incorrect; prose diagnosis is supported by P3/P6, shown as an explanation of the rule.

N1 returns the deliberately wrong feedback in §4. It is rejected before display by the validated template comparison; a second model is unnecessary. At20:04:35 show the saved P3/P4/P6 derivation: “Rest at both ends does not eliminate work by friction. Subtract5.091J along the full path; x=.154982m.” Student repair20:08:00: “Energy of block–spring–Earth decreases through friction. I need mgh−μmgcosθd=kx²/2, giving.155m.” This is exposed repair, not independent transfer.

Baseline assessment at20:04:25: incorrect/deterministic/baseline_response, fragile/hits0/gap1, dueSep19 20:04:25. Revealed source and repair move anchor to20:08:00; choose an independent follow-up no earlier thanSep19 20:08:00. New problem must vary a declared feature (e.g. μ=.10) and recompute the key; do not claim far transfer.

Uncertainty branch: if the actual notes do not contain incline assumptions, abstain, save response, leave due unset, and ask for source repair. If the bad answer already earned credit, apply §4.3 replay and preserve the original response and exposure. Default fits600s; unresolved dispute exits with saved work rather than an invented grade. N1 once; local fallback N0. A0.

### 5.5 S4 — essay claim and warrant, five minutes

**Packet W, v1, fictional article §1.** “Westbridge University piloted free evening buses on two routes for four weeks. Library visits on those routes rose18% against the prior month. The pilot ran during midterms; visits on routes without the new service rose12%. Routes were selected because students had requested more service. Riders reported that later buses made studying easier. The university has not measured course grades or whether new riders replaced walking trips. The transport committee must decide whether to extend the pilot before commissioning a broader evaluation.”

Synthetic practice rubric W§2: make a bounded claim supported by this article, give a warrant connecting evidence to claim, and name a limitation of the causal inference. Reference: “Continue a limited pilot while measuring outcomes: increased access and reported convenience justify further testing, but midterms and nonrandom route selection prevent attributing the entire increase to buses.” Multiple defensible claims accepted for discussion; there is no uniquely deterministic prose grade.

NowSep18 14:00; examOct2. New item; learn/application mode because the article is visible. Sequence20s purpose,60s reading article,130s writing,60s rubric/self-check,30s close=300s. Question: “Write a two-sentence claim and warrant about extending this pilot, including one limitation.” Full answer14:03:30: “The university should extend the buses because library visits rose18%. This proves buses made students study more.” Self-check after rubric: partial—claim and evidence present, warrant overstates causality, limitation absent. Feedback: “The article also reports a12% increase elsewhere during midterms. Explain why a limited extension is warranted despite uncertainty; it cannot prove the entire18% was caused by buses.”

Final: outcome partial, grader student_self, evidence unverified_response; fragile/hits0, dueNone until a deliberate planning action. Student selects “Try a new claim tomorrow14:00”: a `PlanReview` event sets dueSep19 14:00/gap1, with no learning credit. Article/rubric exposure anchor14:03:30; eligibility is irrelevant until a supported assessment method exists. Next task applies the same rubric to another supplied paragraph, not memorization of this answer.

Cloud unavailable branch is the default usable fallback: source + rubric + student's own labeled check, no fabricated model verdict. N0; optional N1 returns a proposed rubric interpretation only. Student can disagree and keep both interpretations locally. A0. Extended essay drafting is explicitly a longer task.

### 5.6 S5 — exam tomorrow, ten minutes, including empty cache

**Packet M, v1, fictional instructor practice guide §scope:** “Practice test scope: chain-rule derivatives and identifying buffer responses. No spring-energy questions.” §rule: chain rule as Q; derivative of2x+1 is2; outer derivative ofu^7 is7u^6. Key for y=(2x+1)^7 is14(2x+1)^6. These are synthetic scope statements, not inferred from assignment points.

NowSep18 18:00; examSep19 10:00 (confirmed instant). Profile has no cache, no attempts. UI0–60 import/review the short permitted guide;60–90 choose chain rule (“This is explicitly in your guide; we can check one application”);90–210 read a local worked example;210–390 attempt;390–510 feedback/repair;510–600 choose stop or another task. Importing/reading the rule is exposure: learn mode.

Question: “Differentiate(2x+1)^7 and name the inner derivative.” Full answer18:06:30: “The inner derivative is2. Multiply7(2x+1)^6 by2 to get14(2x+1)^6.” Deterministic correct/acquisition_only; no hint beyond the deliberately shown source. Feedback: “Correct application of the two derivatives in M §rule. You just studied the example, so this is practice rather than evidence of retention.”

Final fragile/hits0/gap1. CandidateSep19 18:06:30 capped toSep19 09:00 (one hour before the known exam). Feedback18:06:40 resets anchor; tomorrow09:00 is an offered practice slot, not a one-day delayed interval. Copy: “There is time for another short practice before10:00; it will be an early revisit.” Follow-up: optionally choose buffer response from the same confirmed scope; otherwise stop. No categorical sleep/formula-sheet advice.

Empty-cache + unavailable AI: the supplied local chain-rule template works after import, without generation. If no compatible template or usable source exists, show “No practice item is ready. Read the imported guide, add material, or stop.” In that branch no scored attempt/due is invented; only local import/preferences persist. Scope is reduced, not falsely described as a completed practice cycle. N0; A0.

### 5.7 S6 — returning after a missed week, ten minutes

**Packet R, v1, §pvalue:** “A p-value is the probability, under the null hypothesis and model assumptions, of data at least as incompatible with that null as the observed data. It is not the probability that the null is true. A Type I error rejects a true null; a Type II error fails to reject a false null.” Synthetic key for classification: the statement ‘p=.03 means a3% chance that the null is true’ is false.

NowSep18 11:00; examSep25 date-only. Initial holding/hits1/gap3, dueSep11 11:00, anchorSep8 11:00. “One overdue concept check; we will use the answer to choose a repair.” No debt, penalty, streak loss, or inference about ability from absence.

T4 sequence25s purpose+locator;240s attempt;100s feedback;150s repair;85s close. Source hidden before first response. Question: “True or false: p=.03 gives a3% chance the null is true. Explain.” Full response11:04:25: “True. There is a3% chance the null is right, so I would reject it at5%.” Deterministic incorrect for the true/false field; explanation diagnosis follows R§pvalue, without claiming to score every nuance.

Feedback11:04:30: “That reverses the conditioning. R §pvalue describes a probability of data under an assumed null, not a probability of the null.” Repair11:08:00: “Assuming the null and model, results this incompatible or more would occur with probability.03.” Reveal/repair are exposed practice. Optional Type I comparison is omitted if repair needs time; if used, the shown definition makes it acquisition too.

Final initial-check snapshot: incorrect/deterministic/delayed_check, fragile/hits0/gap1, dueSep18 15:04:25 (+4h). Source/repair anchor11:08:00 and cooldown23:04:30 from the reveal. Automatic offer waits until cooldown; a requested15:04 practice is allowed. Independent check no earlier thanSep19 11:08:00. Choose that later check at close; an explicit PlanReview may move due there without creating evidence. Week-long absence counts as one elapsed opportunity, not multiple failures. N0; optional N1 explanation, A0. Disagreement saves uncertain state rather than forcing acceptance.

## 6. R5: inference, persistence, and recovery

### 6.1 Field matrix

L = local app content store; R = transient relay memory; P = transient provider request. “No” in the service column includes databases, prompt caches, durable queues, request/response logs, traces, analytics, and crash dumps. These are requirements, not audited deployment facts. Provider policy P1/P2 is described below and applies to any transmitted content.

| Field | Local persistence / purpose | Relay transmission | Provider transmission | Our service persistence | Provider policy | Optional analytics | Deletion / recovery |
|---|---|---|---|---|---|---|---|
| Source excerpt | Yes, reproduce practice | Selected excerpt only | Same | No | P1/P2 | No | Local until user deletes; dependent item becomes unscored if no snapshot |
| IDs/locators/hashes | Yes, provenance | Request-local aliases and necessary locator | Same, omit private URLs | No course/source IDs | P1/P2 | No | Hash verifies version; cannot restore content |
| Stem/key/rubric | Yes, spoiler-separated local content | Selected item | Same | No | P1/P2 | No | Keep source version for disputes |
| Draft answer | Yes, recover work | No until submitted for feedback | No until submitted | No | P1/P2 if submitted | No | Debounced save; show actual last-saved state |
| Submitted answer/feedback | Yes | Only for current feedback request | Same | No | P1/P2 | No | Keep plain readable local content until deletion |
| Outcomes/assistance/schedules | Yes, evidence and next offer | No full history; selected help flag only if feedback requires it | Same minimal flag | No | P1/P2 if sent | No | Replay locally; reset/remove by user action |
| Profile preferences | Local | Only relevant language/verbosity values | Same | No | P1/P2 | No | No complete USER.md in study request |
| Email/calendar excerpts | Local connector record allowed | Locally selected minimal relevant fields | Same | No | P1/P2 | No | Local deletion and disconnect distinct |
| Derived email summaries/tasks | Local permitted | Response in memory | Generated response | No | P1/P2 | No | Same boundary as originals |
| OAuth access/refresh tokens | Separate local credential store | Never | Never | Never | Not sent | Never | Revoke/disconnect; deleting app does not prove provider revocation |
| Owner vendor secret | Never in app | Relay secret boundary | Authentication header only, never model context | Secret manager only | Vendor authentication handling | Never | Rotate/revoke separately |
| Tester authentication | Local credential; no prompt | Auth envelope only | Never | Opaque identity/session hash, revocation | Not sent | Not analytics | Proposed access-state retention until beta ends +30d |
| Cost accounting | Optional local display | Generated counters | Provider sees its normal request/account data | Request ID, model/pricing version, token totals, reservation/status; no content | Vendor billing policy | Not analytics | Proposed90d reconciliation window, then aggregate/delete |
| Errors | Local code/status, no answer dumps | Enumerated error code | Sanitized requests only | Code/status/request ID; no raw exception/body/URL | Vendor policy for original request | No free text | Proposed7d operational error retention |
| Usage counts | Local opt-in flag/counters | Only when opted in | Never | Fixed event name + aggregate count | Not sent | session_started/session_finished only | Proposed30d aggregate retention; opt-out stops collection |

Operational metadata is mandatory for paid access, not implied consent to product analytics. Prevent joining usage counts to item/source IDs; no course names, raw URLs, answer hashes, prompt summaries, safety excerpts, or arbitrary properties hidden in “metadata.” Proposed retention durations need implementation/configuration, not a claim of existing deletion. Do not promise secure erasure, encryption at rest, backups, or absence of iCloud/OS sync without verification.

### 6.2 Provider disclosures

**P1, direct Claude Messages API:** vendor documents ordinary backend input/output deletion within30 days, with exceptions for selected services, agreements, policy enforcement and law. Its commercial-data training page states no training by default, subject to voluntary feedback/opt-in arrangements. Do not opt content into feedback sharing. Covered-model retention rules are separate; no automatic upgrade into a differently governed model. [Retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data), [training](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training), [covered models](https://privacy.claude.com/en/articles/15425996-data-retention-practices-for-covered-models), accessedSep18.

**P2, paid Gemini Developer API generateContent:** terms exclude paid prompts/responses from product improvement but allow limited-period policy/safety logging and legal disclosures. Exact duration was not established in the inspected terms; it is an unresolved vendor policy question, not zero retention. Unpaid service terms are unsuitable for this US beta's personal student content; verify paid project status. Terms also impose an18+ client-audience restriction, a concrete eligibility constraint to check before choosing this endpoint for a classmate cohort. [Terms, Paid Services and Age Requirements](https://ai.google.dev/gemini-api/terms), accessedSep18. No automatic fallback to free quota or a different API family.

### 6.3 Three end-to-end traces

**Generate item.** Local selection reads one permitted source; sends its excerpt and objective, source-local aliases, and requested schema. Relay authenticates, checks allowlist/input bound, atomically reserves cost, dispatches from memory. Provider generates a candidate. Local app validates schema/support, saves accepted stem/key/rubric/source snapshot and renders no answer cue. Survives service-side: auth/accounting row only. Survives provider-side: its documented policy. Timeout/cancel holds reservation, discards relay payload, and leaves local source intact; no durable payload retry queue. Bad candidate is rejected, optionally regenerated within the same all-call allowance.

**Feedback.** Local attempt is committed before dispatch. Send only stem, submitted answer, supported key/rubric and minimal excerpts. Relay/provider receive the actual answer—cloud feedback cannot work from its hash. Returned prose is locally saved as proposed feedback until validated. Success persists no content at our service. Timeout leaves `grader=pending` and a recoverable answer. A late response may attach to its matching attempt/version but cannot become an unsolicited new attempt. Reconnect does not automatically issue a second billable request.

**Selected connector context.** Local connector selects one event's title/time or one email's relevant sentences; OAuth tokens and irrelevant messages remain local. Relay forwards that selected content in memory; provider returns a suggested date/task; app saves it locally. Derived text inherits the original no-service-persistence rule. Cancel/failure leaves connector records untouched. This read/inference trace authorizes no calendar/email write: each proposed write still needs its existing per-action confirmation.

Potential leaks on all paths: query-string keys, reverse-proxy body capture, APM spans, automatic provider SDK debug logs, response caches, exception locals, CDN/WAF sample bodies, dead-letter queues, device crash uploads and network debugging. Disable content capture at those boundaries; use fixed endpoint paths and sanitized codes. Gemini's repo adapter currently puts its key in query params: change the future relay adapter to an auth header and verify URL logging; do not transmit that URL to monitoring.

### 6.4 Recoverability and canaries

A transaction commits draft text, immutable attempt/source references and a projection cursor before displaying “saved.” On ambiguous acknowledgment retry the same ID and inspect the log. A partial tail record is recoverably rejected, not assumed committed. The projection is deterministic and rebuildable; no live provider call happens during replay. A missing cached response cannot be regenerated for free by claiming relay idempotency.

Synthetic release scenarios (not executed here): seed `CANARY-ANSWER-7Q3X`, `CANARY-EMAIL-K9ZT`, `CANARY-DERIVED-4M2`, and a distinct token canary. Exercise success, malformed output,500, timeout, cancel, stream abort, retry, crash and reconnect. Content may appear only in selected payloads/local records and provider handling; assert absence in every service persistence surface, backups and monitoring exports. Tokens must appear in no model payload. Opted-out counts emit nothing; opted-in payloads reject all unknown properties and content canaries. Verify source restoration from text after restart; deleting the sole snapshot must produce source repair, not a hash-based fiction.

Proposed user copy: “Your study history is stored locally. When you ask for AI help, selected material and your answer pass through our service to the model provider. Our service is designed not to retain that content; provider retention policies still apply. Optional usage counts are off until you enable them.” Ship “we do not retain” only after the deployment checks pass. Never say “never leaves your device,” “zero retention,” or “always works offline.”

## 7. R6: provider compatibility and accountable cost

### 7.1 Provider-neutral request

```text
Request {request_id, session_budget_id, purpose: generate|feedback|hint|repair,
         source_passages, stem?, rubric?, submitted_answer?,
         schema_version, input_bound, visible_output_bound, reasoning_bound}
Response {request_id, assessment_proposal, support_rows, model_id, endpoint,
          usage: input|output|reasoning|cache counters with documented semantics,
          finish_reason, status: complete|abstained|truncated|failed|billing_unknown}
```

Relay, not client, selects allowed endpoint/model/config/pricing version. Count system/schema overhead as input. Treat refusal/truncation/invalid JSON as explicit outcomes, never graded success. Provider tool calls are unnecessary and disabled. No URLs, tool programs, headers, or vendor names supplied by source text may change the routing policy.

### 7.2 Verified API capability versus repository state

AccessedSep18; documentation capability is not account availability or pedagogical quality. Candidate defaults match repo strings: `claude-haiku-4-5`, `gemini-3.5-flash-lite`. `claude-sonnet-5` is a priced candidate for later comparison, not an automatic escalation.

| Capability | Claude direct Messages | Gemini paid generateContent | Existing adapter / required change |
|---|---|---|---|
| Text/math/material | Text/image support; no inherent correctness guarantee | Flash-Lite model page supports text/image/PDF and other modalities | Beta uses selected text only, no media pricing assumption |
| Structured output | Haiku4.5 supported; `output_config.format` JSON schema | REST generationConfig supports response MIME/schema fields | Neither current chat adapter requests strict structure; validate locally too |
| Streaming | Supported API feature | `streamGenerateContent` documented | Current adapters nonstreaming; not required for one cycle |
| Tools | Supported, not needed | Function calling supported, not needed | Disable for study endpoint |
| Bounds | `max_tokens`; explicitly disable optional extended thinking for priced baseline | `maxOutputTokens`, thinking configuration; Flash-Lite thinking defaults minimal, not off | Repo Claude1024 hardcoded; Gemini no output bound; exact total reasoning bound remains an admission prerequisite |
| Usage | Messages usage counters | `usageMetadata`, including thoughts where applicable | ChatResult currently drops usage; add typed counters and billing semantics |
| Timeouts/retries | SDK behavior must be configured | HTTP wrapper has30s timeout | Earlier “no timeout visible” claim was wrong; disable hidden SDK retries, reserve each dispatch |
| Retention | P1 | P2, paid project and audience checks | No no-retention claim from this table |

The REST reference documents `thinkingBudget`, `thinkingLevel`, and distinct thought/candidate usage counters, but that alone does not establish enforcement of a numerical reasoning cap for this exact Gemini model. Keep the conditional-bound qualification until documented semantics or an authorized integration check resolves it. For Claude, use ordinary JSON locator fields rather than combining native citation blocks with strict JSON output; the structured-output documentation lists that combination as incompatible.

Primary references: [Claude structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Gemini model](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Gemini REST API](https://ai.google.dev/api/generate-content), [thinking](https://ai.google.dev/gemini-api/docs/thinking), [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output). The latter's leading examples use Interactions; do not copy those field names into generateContent without its REST mapping. The attempted Claude Messages landing-page fetch failed in this pass; endpoint use was confirmed in the repo SDK call, not by claiming that failed page was read.

### 7.3 Rates and worksheet

USD per million tokens, standard direct text requests, accessed 2026-09-18. [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) lists Haiku4.5 input$1/output$5 and Sonnet5 input$2/output$10. [Gemini pricing, Flash-Lite standard table](https://ai.google.dev/gemini-api/docs/pricing) lists input$0.30/output$2.50 including thinking; cache read$0.03/MTok plus$1/MTok-hour storage. Earlier draft's Flash-Lite cache-rate “unknown” is corrected. Explicit caches, batch, tools, search, media and file APIs are disabled in this worksheet. No additional provider is selected.

Use `cost = Σ_dispatches (input_tokens × input_rate + billable_output_tokens × output_rate)/1e6 + cache/media/tool/fixed_charges`. Count thinking once under the endpoint's billing semantics; don't sum overlapping usage counters. A cancellation or timed-out dispatch can still cost its full reservation.

Typical planning case:2 sessions/tester/day for7 days. Each session includes1 initial item generation (4000in/700out),1 feedback (3000/500), and an average allowance for hints, regeneration and retries totaling2000in/200out. Total9000in/1400 billable out per session. This is an expectation, not a bound; the allowance could correspond to0.25 hint +0.10 regeneration +0.15 retry requests with combined average2000in/200out. No assumed cache savings. Preparation is included even before the visible session starts.

Pessimistic **conditional bound**:3 sessions/tester/day, at most6 provider dispatches per session, each ≤8000input and ≤2400total billable output (e.g.1200visible +1200reasoning, or2400visible with reasoning disabled). Six includes generation, up to2 feedback calls,1 hint,1 regeneration and1 retry; unused types can share that total. There is no extra25% rider beyond six. Five-minute UX normally needs fewer calls but shares the same conservative accounting ceiling. A provider that cannot enforce/upper-bound those totals is not eligible for this bound; use its documented larger maximum reservation or reject dispatch.

| Model | Typical $/session | Typical5 testers /70 sessions | Typical10 /140 | Bounded $/session | Bounded5 /105 sessions | Bounded10 /210 |
|---|---:|---:|---:|---:|---:|---:|
| Haiku4.5 | .0160 | 1.12 | 2.24 | .1200 | 12.60 | 25.20 |
| Sonnet5 | .0320 | 2.24 | 4.48 | .2400 | 25.20 | 50.40 |
| Gemini3.5 Flash-Lite | .0062 | .434 | .868 | .0504 | 5.292 | 10.584 |

Example bounded Haiku:6×(8000×$1+2400×$5)/1e6=$.12/session;210×$.12=$25.20. Gemini figures are conditional on total thinking/output enforcement; “minimal” reasoning is not zero. Sonnet-only bounded use already exceeds$50 inference, so the relay would stop before fulfilling that pattern. Do not add an unreserved escalation rider.

Excluded charges: hosting, domain, taxes/fees, egress, enrollment, usage outside these sessions, unbounded reasoning, media/tools and future pricing changes. No claim of a$50 total bill guarantee. The worksheet is arithmetic, not a prediction of tester behavior or an implemented cap.

### 7.4 Reservation and retry protocol

1. Authorize tester and pricing/config version. Enforce input size/token upper bound, endpoint-specific output/reasoning caps and tool disablement. If counting is uncertain, use a safe documented upper bound or reject; character-count heuristics are not precise token accounting.
2. Under one atomic budget transaction require `settled_cost + unresolved_reservations + new_max_cost <= allowance`. Also enforce per-tester limit, all-dispatch session count, and concurrency (proposed one request/tester, three globally). Reserve input **and** output, not merely one output ceiling.
3. Send once with an internal dispatch ID. A client retry of the same logical ID must not automatically issue another provider request. Record in-flight/completed/unknown status; no response body is persisted at the relay. If a completed response was lost, return “result unavailable; saved locally if received.” A deliberate regeneration is a new dispatch with a new reservation, linked to the logical request.
4. Reconcile authoritative usage after completion. Missing usage holds the full reservation; this prevents overspending if the maximum was sound. Missing usage blocks exact reconciliation, not conservative admission control. Cancellation/timeout never releases uncertain spend automatically.
5. Disable SDK automatic retries or instrument each dispatch. Relay idempotency is **not** proof that a provider deduplicates or refunds requests. Revocation blocks subsequent admissions; already-dispatched work may still be billed.
6. Refuse new requests if rates/config are stale or unknown. A model fallback must preserve approved providers, privacy, paid status and reserved maximum. No silent Interactions/Files/cache/third-party switch.

Quota copy: “AI help has reached its allowance. Use a saved item if available, read permitted notes, or stop.” Outage: “Your answer is saved; feedback has not arrived. Try later or compare it yourself with the source.” Empty cache: “There is no saved practice item yet. Import a source to use a local template, or read your notes.” No guaranteed15-second generation time.

## 8. Supplemental evidence ledger and search audit

### 8.1 Method

Search/access date 2026-09-18. Targeted web search plus direct primary/official pages and repository reads; no paid databases, private inboxes, credentials, student accounts, or model calls. This closes revision defects rather than restarting an exhaustive25–40-source review. Search terms included “Karpicke Roediger2007 expanding retrieval delaying first retrieval,” “Cepeda2008 temporal ridgeline1354,” “Kestin2025 post lesson19449 minutes,” “Bastani2025 correction,” “Pan Rickard2018 transfer,” and official Claude/Gemini pricing, retention, schema and thinking documentation. Correction/retraction terms were searched for the central learning papers; the located Bastani correction is documented below. No exhaustive claim that no other notices exist.

Include accessible primary experiments, relevant synthesis abstracts with explicit limits, and current official endpoint documentation. Exclude marketing testimonials as learning evidence, social-media model comparisons, generic microlearning duration claims, and unsupported numeric effects inherited from the original. Keep findings, product constraints, and engineering hypotheses separate. Review overlap is not independent replication.

### 8.2 Learning evidence

| ID | Exact bounded finding and source/location | Inspection / limitations | Design implication |
|---|---|---|---|
| E1 | Karpicke & Roediger2007, [author-hosted full paper](https://learninglab.psych.purdue.edu/downloads/2007/2007_Karpicke_Roediger_JEPLMC.pdf), DOI10.1037/0278-7393.33.4.704, experiments1–3 methods/results | Full text inspected. Experiments1/2 each48 undergraduates; experiment3=56. Vocabulary-pair trials, immediate/lagged first tests, equal/expanding schedules; final10min versus2days. Equal spacing benefited delayed retention relative to expanding in the first comparisons; delayed initial retrieval mattered in experiment3. No university-exam transfer measure; no numerical pooled effect asserted here | Immediate success and delayed retention differ. Does not validate a12h floor or an expanding calendar ladder |
| E2 | Cepeda et al.2008, [author manuscript](https://escholarship.org/content/qt0kp5q19x/qt0kp5q19x.pdf), DOI10.1111/j.1467-9280.2008.02209.x, Method/Results | Full-text methods inspected:1354 completers,32 trivia facts,26 gap/retention combinations, mean age34, completion attrition; delayed tests up to1year. Best interstudy gap varied with final delay. Not proof of one optimum for multi-step problems; no common effect-size average imported | Adjust revisit opportunity to exam distance, while labeling exact rules engineering choices |
| E3 | Pan & Rickard2018, [PubMed abstract](https://pubmed.ncbi.nlm.nih.gov/29733621/), DOI10.1037/bul0000151 | Abstract-only extraction:122 experiments,192 effects, N10382; transfer varied with response congruency, elaboration and initial performance; bias adjustments reduced some predictions. No new full-text audit or independence from E1 experiments claimed | Include application checks, but do not equate near transfer with exam readiness |
| E4 | Kestin et al.2025, [publisher](https://www.nature.com/articles/s41598-025-97652-6), DOI10.1038/s41598-025-97652-6, post-score/lesson-time sections | Publisher search extract available; direct HTML/PDF retrieval blocked by IdP.194 eligible students in crossover physics study; reported post-lesson outcomes, median AI lesson49min. Full methods not independently re-extracted here; prior review provides corroborating inspection. No effect size repeated | Promising tutor design evidence; not five-minute delayed exam-gain evidence |
| E5 | Bastani et al.2025, [primary article record](https://pmc.ncbi.nlm.nih.gov/articles/PMC12232635/), DOI10.1073/pnas.2422633122 | Primary search extract available; direct PMC hit browser check. Nearly1000 high-school math students; guarded and unguarded GPT4 practice versus control, later unaided assessment. Unguarded use harmed unaided performance; guarded arm mitigated that harm without establishing a positive unaided effect. No full re-extraction or numerical efficacy estimate here | Compare assisted performance with later unaided attempts; constraints on answer outsourcing are plausible safeguards, not guaranteed efficacy |
| E6 | Bastani correction, [publisher-authored PDF](https://pdfs.semanticscholar.org/4e8b/adc5aef00eef42a935570827ec170420106d.pdf), DOI10.1073/pnas.2518204122 | Full one-page notice read, publishedAug20 2025; corrects Osbert Bastani's affiliation, not outcomes | Correction check completed for this located notice |
| E7 | No universal exposure-clearing delay established by E1/E2 | Bounded negative result, not an exhaustive proof of absence |12h and planned-gap restart are conservative product hypotheses, configurable and evaluable |

New provider findings P1/P2 and §7 cite directly inspected official pages; they are documented policies/capabilities, not audited provider behavior. Direct code findings: `learn_loop.record_outcome` and `_already_scored_this_check`; `llm_provider.ChatResult`, provider chat methods and `_post_json`; `prompt_assembly.assemble_turn`; `ReviewSession.score`.

### 8.3 Treatment of original claims and full-brief coverage

C20's incomplete confidence interval and categorical dismissal of microlearning are withdrawn; no effect estimate from that row is used. This proposal's duration is a product constraint, so no repaired microlearning meta-analysis is necessary to justify it. C23's assertion that0–4 events makes all inference “theater” is withdrawn: the choice of a simple transparent scheduler is an engineering scope decision. C26 now separates judgments of future learning, self-assessed correctness, and objectively checked performance; the original JOL citation is not used as evidence for all three. Self-reported scores are retained as self-reports without a claimed universal bias magnitude.

Other original ledger entries remain historical background, **not automatically reverified or carried forward with their old confidence**. Worked examples, fading, self-explanation and modest interleaving are retained as proposed techniques with the original synthesis's access limits, not newly proven beta effects. This revision makes its executable learning contract independent of unverifiable effect sizes.

| Original research group | Disposition in this revision |
|---|---|
| A mechanisms | Retrieval/spacing revisited E1–E3; worked-example/fading rationale retained cautiously; no claim one method universally wins. Recognition scored only within its scope; generated explanation remains provisional. Productive failure not promised in five minutes |
| B duration/exam distance | Answered as scope design, timelines and F30; efficacy of exact durations uncertain |
| C selection/adaptation | Transparent source/date/attempt rules; sparse-data trait inference deferred; student can choose another objective; prerequisites/repeated misses lead to example/source repair, not a diagnosis |
| D feedback/hints/grading | Explicit exposure, bounded checks, disagreement, repair and self-score limits; no universal optimum feedback delay asserted |
| E AI/grounding | E4/E5 plus actual support packet and abstention; no second-model truth test |
| F motivation/accessibility | Requirements in §9; character/animation effects on learning unestablished, no VAK inference |
| G discipline/format | Numeric, concept, essay and transfer examples; long-form performance outside short-cycle claim |
| H small beta evaluation | Feasibility plan below; scores remain local; counts cannot establish retention or efficacy |

## 9. UX, feasibility evaluation, build handoff, and adversarial review

### 9.1 Usability requirements

Stable navigation: Study / Plan / Sources / Settings. Setup asks only for source/course and time needed to start; optional preferences follow first value. A visible “Why this?” explains source scope and method without claiming a personalized brain model. Themes are declarative; moderate character presence and optional transition animation do not interrupt reading or move controls. Reduced motion uses immediate/static changes. Keyboard order and focus survive feedback/resume; screen readers announce status once and never reveal hidden keys. Meaning is not color-only. Text reflows/zooms, math has readable alternatives, timing is flexible, and optional audio is never the only access path. Do not infer disability or prescribe a VAK learning style.

### 9.2 Beta evaluation, within current permission

Five to ten testers can reveal installation failures, confusing scope, missing sources, slow feedback, and whether people understand the next action. Proposed manual walkthrough: install/connect; create one sourced item from empty state; use help; close/resume; explain what the progress label means; find how to stop/delete/disconnect. Ask for interface-level feedback without requesting real answers or sensitive course content.

Keep answer quality, delayed retention and transfer checks in an optional local view; uploading those results would require a separate decision and consent. Opt-in start/finish counts can describe activity, not learning or even why a student stopped. Convenience sampling, attrition, instructor differences, repeated-item practice effects and self-report bias prevent an efficacy conclusion. No human study was run here.

### 9.3 Minimal build sequence and dependency map

| Priority / complexity | Work and dependency | Existing seam |
|---|---|---|
| Required, medium | One synthetic template, recoverable answer, source reveal and deterministic-or-abstaining feedback | Current ReviewSession displays claims and self-score buttons, not this cycle |
| Required, high | Event history + attempt boundaries + transactional/replay-safe projection; preserve clock invariant | learn_loop already protects early hits; new versioned semantics require explicit compatibility tests |
| Required, medium | Neutral labels and objective-level exposure including accessibility/resume | Existing UI literal `recordReviewOutcome(item.id,outcome,false)` cannot establish clean independent work |
| Required for funded cloud, high | Authenticated relay, bounded dispatch, reservation, paid endpoint disclosure, content-free errors | Provider adapters exist; ChatResult lacks usage/schema/finish-reason contract |
| Required, medium | Study-specific allowlisted context builder | assemble_turn loads profile, selected inbox and teaching hints; do not blindly reuse the whole prompt for one study feedback request |
| Required, medium | Empty-cache import/read path, novice example, near-exam practice, offline local rubric | §5 supplies deterministic fixtures |
| Next | Broader source/template coverage, local evaluation, synthetic provider comparison, better time estimates | Requires validity checks and separately measured usability |
| Do not build yet | Mastery prediction, FSRS/BKT tuning, arbitrary generated code/themes, research outcome uploads, autonomous connector writes | No authorization/evidence need in this research task |

Distribution, signing, clean-machine runtime, account isolation, integrations and budget enforcement still need the beta handoff's release checks. A sound study spec does not certify an installer. If time halves: keep one template, one cycle and local recovery; remove optional second items, dynamic prose grading, elaborate animation and automatic generation. Preserve source checks and exposure correctness.

### 9.4 Adversarial interaction checks

| Interaction | Required result / remaining test |
|---|---|
| Reveal → crash → new session → retry | Durable objective exposure survives; draft retains start; no delayed credit until finite gap passes; core predicate checked synthetically, crash persistence not implemented |
| Unknown exam + empty pool | MissingSource or NoEligibleItem first; never dereference due[0] or invent coverage |
| Bad model feedback already scored | Append correction and replay, preserve original answer and all exposure; do not erase later valid work |
| Cloud timeout + uncertain spend | Pending local feedback, held full reservation, no automatic billable replay; request-status metadata only |
| Expired source + cached item | Old attempt remains reconstructable; new scoring blocked until version validated |
| Privacy-safe feedback + local recovery | Actual selected text transits; local draft survives; no service content persistence; deployment canaries required |
| Source title reveals answer | Neutralize title before rendering; provenance labels are not inherently safe |
| Start early, submit after due | No delayed credit; attempt start owns temporal eligibility |
| Model says “correct” confidently | Provisional grade only; confidence does not satisfy deterministic validation |
| Repeated practice postpones evidence eligibility | Explain next independent-check time; never prevent learning to preserve a metric |

Strongest counterargument: the conservative grading/exposure rules may withhold useful signals and make the first beta feel rigid, while the short cycle misses extended reasoning. That tradeoff is intentional for auditable claims, but not proven optimal. Loosen only after representative synthetic grading checks and usability evidence, not merely higher completion counts. A later consented controlled study with delayed, unaided, novel assessment could change the learning recommendations; the current beta cannot establish that result.

### 9.5 Closure and smallest remaining questions

R1–R5 are closed as a proposed specification with bounded claims and traceable examples; production validation remains open. R6 is partly closed: exact-model Gemini total reasoning/output enforcement and account/audience/retention details need endpoint/account verification before a hard monetary bound can be relied on. Conservative interim: keep Gemini priced as a conditional candidate; route only to an allowed configuration whose maximum billable work is demonstrably bounded, or provide local practice.

Other residual questions: whether12h/planned-gap gating is usable (local usability/retention observations could inform it); which model handles the synthetic rubric set better (not tested); actual feedback latency (not measured); hosting allowance (owner budget scope); full independent extraction of E4/E5 and the remaining original bibliography (access-limited and explicitly unclaimed). None licenses exposed hits, invented source support, or service retention. Research deliverables are complete to these stated limits; software and efficacy remain unproven.
