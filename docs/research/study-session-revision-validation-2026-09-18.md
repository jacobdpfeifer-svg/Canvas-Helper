# Validation of the revised study-session specification

Date: September 18, 2026. Scope: targeted review of the revised specification,
closure matrix, and current `llm_provider.ChatResult` and
`learn_loop.record_outcome`. No product changes. Original research artifacts are
preserved. This is not a full bibliography/pricing re-verification.

## Verdict

The revision materially improves the source packet, explicit examples and data
boundaries. R1 and R2 must reopen: the actual pseudocode contradicts its closure
claims and fixtures. Do not translate it into production verbatim.

## Blocking findings

### V1 — Exposure causes a permanent inability to earn delayed evidence

Revised §3.6 examines all exposure events since the last credited attempt. If any
exist, both the below-floor and above-floor branches return `exposed_response`.
The student therefore cannot earn another credit after a reveal, even days later;
the last credited timestamp can never advance to clear the condition. The same
problem affects a new item with exposure after creation and no prior credit.

Separate the latest learning/exposure anchor from the last credited success.
Exposure restarts the interval for a future independent check; it must not
permanently disqualify the item. Track pre-attempt exposure separately from
post-attempt feedback so feedback does not retroactively invalidate the answer.
Define the no-exposure and no-prior-attempt cases explicitly. Test reveal →
immediate retry → days-later independent correct attempt, including crash/restart.
The 12-hour proposal cannot fix the current always-disqualify branch.

### V2 — Due misses, partials, and skips never reach their legacy update paths

`evidence_label` assigns `delayed_independent_retrieval` only to a correct answer.
`update_evidence` then derives `same_session` from whether that label is present.
Consequently every partial, incorrect, and skipped event gets `same_session=True`.
The current writer returns before its miss/partial/skip scheduling branches when
that flag is true. Fixtures F7–F10 therefore do not follow the supplied pseudocode.

Determine temporal/assistance eligibility independently of correctness. Then map
outcome and eligibility to evidence and scheduling. Separate a delayed independent
attempt from a successful delayed independent attempt. Do not overload a success
label as a clock predicate. Define a single authoritative schedule writer: the
current writer plus the additional `next_at` repair logic otherwise yield
conflicting results (e.g. exposed correct in F6 versus the repair branch).

### V3 — Selection/scheduling is still not total

- An all-withdrawn pool reaches `min()` over an empty generator.
- `exam_of` permits `None`, but callers access `exam.kind` without normalizing it.
- Items with missing `next_review_at` cannot be compared to an instant.
- The `expand` helper has overlapping cases: `{0,1} -> 1` and `1 -> 3`.
- `session.skipped == pool.items` compares identities with item objects unless
  explicitly normalized, so the declared all-skipped behavior is not established.
- Replacing a past candidate with `now + MIN_FUTURE` may schedule after an exam
  that is only minutes away. Return an explicit no-pre-exam-slot result or label
  post-exam practice as such. Do not silently claim an exam-capped review.
- Selecting `eligible[1]` once does not guarantee it avoids the same exposed
  source. Filter the entire pool by a defined exposure/selection policy.

Add fixtures for each case. Execute a small reference model against the fixtures;
handwritten expected outputs did not expose these contradictions.

## Other corrections

### V4 — DST fixture mixes wall-clock days with elapsed hours

F18's result is correct for three local calendar days, but its explanation calls
that an absolute 72 hours. From `2026-10-31T20:05-06:00` to
`2026-11-03T20:05-07:00` is **73 elapsed hours**. Exactly 72 hours lands at
`2026-11-03T19:05-07:00`. Choose and document the intended arithmetic; elapsed
separation thresholds should use instants, while calendar-day scheduling may use
local dates. Do not conflate the two.

### V5 — Missing usage blocks accurate reconciliation, not every budget control

Confirmed: current `ChatResult` contains content, tool calls, model, provider,
and error, but no usage metadata. Add provider-normalized usage with clear
semantics for cached/reasoning tokens and unknown usage before actual-cost
reconciliation. Inspect SDK retry behavior as well as application retries.

A conservative reservation system can still reject new requests when reserved
maximum cost reaches its limit, holding reservations after unknown billing.
That requires enforceable input/output limits and reliable pricing bounds; none
is proven implemented here. Missing usage is an engineering task, not a reason
to say budget enforcement is inherently impossible. Neither approach alone
guarantees the user's total invoice including hosting and external fees.

The revised cost formula also needs provider-specific token normalization to
avoid adding reasoning twice when already included in an output count. Its
escalation rider should state whether escalation calls also receive the 25%
retry allowance. The listed $24.40 is a scenario, not a worst-case spend bound.
Current provider prices were not re-fetched during this review.

## Verification performed

- Ran a small Python reproduction of the revised branches: exposure still
  returns `exposed_response` after three days; due partial/incorrect/skipped all
  project to `same_session=True`; all-withdrawn selection raises `ValueError`.
- Read the existing writer and confirmed its early return on `same_session`.
- Used Python `zoneinfo` to verify both DST interpretations above.
- Independently recomputed the supplied physics packet: compression is
  approximately **0.154982 m**, consistent with the revised **0.155 m** answer.

These checks validate the named arithmetic/logic findings, not product
integration, all research claims, or pedagogical effectiveness.

## Decision guidance

- Budget: keep spending configuration editable and plan conservatively within
  $50 until the owner clarifies whether hosting/fees are included. No purchase
  or account funding is implied by this recommendation.
- Feedback model: use a configurable Claude/Gemini adapter and compare the six
  synthetic cases before choosing by observed quality, not price alone. No need
  to block the source/attempt/state implementation on that choice.
- Separation floor: retain a configurable hypothesis, but first fix V1/V2.
  A calendar-date boundary alone cannot prevent a four-minute midnight retry.
  Choosing a number does not repair a permanently disqualifying exposure rule.

The next step is a focused state-machine correction with executable fixtures,
not another broad research cycle. Privacy deployment checks and provider quality
evaluation remain separate implementation work.

## Follow-up: validation of the reported correction pass

The subsequent edits improve the outcome-independent eligibility calculation,
all-withdrawn selection, and DST wording. However, the reported closure of V1 is
not supported by the updated pseudocode:

```text
pre_attempt_exposure = exposures since item.created_at
                      filtered to occurred_at <= ev.occurred_at
if pre_attempt_exposure is not empty: return false
```

This still includes every historical exposure before the new attempt. Executing
that predicate for F19 finds the September 18 08:01 reveal before the September
21 09:14 attempt and returns false. The elapsed time is 73 hours 13 minutes, but
the code never reaches the separation-floor check. Bounding above by the attempt
timestamp prevents retrospective invalidation by later feedback; it does not
bound how far back an exposure disqualifies a new attempt.

Required correction: distinguish exposure during the current attempt from the
latest exposure preceding its start. Evaluate both from the historical snapshot
at answer submission. An old exposure should impose a finite elapsed-time gate,
not an unconditional rejection. Preserve attempt identity/start across resume;
creating a new attempt still cannot bypass the elapsed-time gate.

Other directly observed inconsistencies remain:

- F6/F19 say exposed correct holds the existing schedule, while `next_at` assigns
  exposed responses `now + 1 day`. Specify which component owns the schedule and
  make the fixture, transition table, and implementation contract agree.
- F22 writes `09:05 + 1h = 09:05` in its first branch. The result is **10:05**,
  already after the original 09:20 exam; changing the exam to 09:10 is unnecessary.
- §3.4 references F6a, while the new regression fixture is F19.
- Ledger N11 still calls reservation/reconciliation jointly unimplementable
  without usage, despite the corrected distinction elsewhere.

Verification: executed a minimal Python reproduction of F19's actual exposure
predicate and F22's arithmetic. No production code was changed. The 23 fixtures
remain proposed expected results, not an executed passing reference model.
