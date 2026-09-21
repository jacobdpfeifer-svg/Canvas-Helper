# Study-session revision closure matrix

Completed 2026-09-18. Governing artifact: [revised specification](study-session-5-10min-evidence-spec-revised.md). Assignment: [revision research prompt](study-session-revision-research-prompt.md); constraints: [review](study-session-spec-review-2026-09-17.md) and [beta decisions](../handoff/student-beta-2026-09-17.md).

“Closed” means a coherent proposed contract at the stated evidence level, not implemented software, tested students, validated billing or improved exam scores. This matrix replaces the earlier draft's overstatement that its permanent-exposure-lock correction had been verified. The [older validation report](study-session-revision-validation-2026-09-18.md) remains historical.

| ID / disposition | Original defect/location | Revised location | Evidence / verification | Worked acceptance trace | Remaining uncertainty |
|---|---|---|---|---|---|
| R1 — **Closed as specification** | Original§1/§3 excerpt before attempt;§4.2 buffer answer cue; earlier revision§3.6 rejected every historical exposure | Revised§1–§2,§3.3 | E1 full primary methods; E2 full primary methods; no claimed scientific contamination window. Synthetic checker tests exposure disqualification and eventual clearing | X2: excerpt08:59 resets anchor, so09:00 is practice. F05→F06: revealSep18, immediate retry uncredited; cleanSep21 09:10 attempt after full3-day gap eligible. Resume retains attempt ID/history | Unreported outside assistance is unknowable.12h and full-gap restart are product hypotheses. On-disk pre-render exposure durability remains an implementation test |
| R2 — **Closed as specification** | Original§5 early hits, due[0], past exam caps, skip loops; revision had contradictory legacy/proposed schedule writers | Revised§3.1–§3.5, F01–F32; executable reference | Direct code inspection of record_outcome; preserve clock gate but explicitly propose versioned scheduling migration.38 synthetic assertions passed overall; not all32 documentary fixtures are executable | F01 due correct advances; F02 early correct holds; F07 partial demotes; F08 miss gives practice in1h; F13 empty/unknown returns MissingSource; F19 duplicate unchanged; F18 crosses DST by73h; F22 no future slot; F28 uncertain commit deduplicates by saved ID | Transactions, corrupt-tail recovery, correction replay, date parsing and clock-trust handling are acceptance contracts, not tested app capabilities. Existing legacy substantial-gap behavior is not falsely claimed identical |
| R3 — **Closed as specification** | Original§4.3 frictionless packet used to claim friction correction;§5 imaginary citation_supports_claim | Revised§4 and S3 | P1–P7 provide actual assumptions, work term, sign and key. Independent arithmetic gives x=.154982m. Source integrity/semantic interpretation/answer checking are separated | Wrong potential-energy explanation contradicts P3; missing cosθ/d contradicts P4/P6. Missing source unscored; ambiguous OCR quarantined; unsupported key withdrawn; conflicting notes displayed without automatic winner | General semantic entailment is unsolved. Deterministic scope does not certify prose. Compensating-event replay must preserve subsequent work and exposure history |
| R4 — **Closed as specification** | Original§4.1–§4.6 incomplete prompts/answers/state; essay objective mismatch; unsupported exam advice | Revised§5.1–§5.7 | Six synthetic packets, questions, answers, rubrics, feedback, timing, exposure and final-state snapshots. Four template timelines sum correctly in checker | S1 partial + resume; S2 scoped species check + early exit; S3 wrong AI correction; S4 actual article/warrant + unavailable cloud/self-check; S5 tomorrow + empty cache; S6 concrete p-value miss/repair | Timings are proposed, not student-measured. Open prose receives provisional grades and no delayed stability credit. Scope of short cycles excludes long-form exam performance |
| R5 — **Closed as specification** | Original§6 all export Never; hash replaces draft; blanket local connector storage prohibition | Revised§6 matrix, three traces, canary scenarios | Official Claude retention/training and Gemini paid terms readSep18. Full field matrix separates local/relay/provider/service/analytics and recovery | Submitted answer survives locally, selected text transits for feedback, only opaque accounting survives relay. Timeout holds reservation and pending local assessment. Derived connector summary inherits original boundary | Service no-persistence is a requirement awaiting deployment tests. Exact Gemini paid retention duration not established. No secure-delete/encryption/no-OS-sync guarantee |
| R6 — **Partly closed** | Original§8 OpenAI substitution; unimplemented binding caps; earlier revision double-counted retry allowances and assumed thinking off | Revised§7.1–§7.4 | Official rates/model/schema/thinking docs. Repo adapter review confirms Gemini30s HTTP timeout, no output bound, ChatResult missing usage. Arithmetic independently checked | Haiku bounded10 testers:210 sessions×6 dispatches×(8000×$1+2400×$5)/1e6=$25.20. Every regeneration/retry consumes a slot/reservation. Unknown billing remains reserved | Gemini exact-model total thinking/output bound, paid-account/audience suitability and provider-policy details require verification. Interim: only dispatch configurations with a demonstrable maximum cost; otherwise local study. No account calls/spending authorized or performed |

## Additional review findings resolved

- **C15:** post-lesson outcomes, not learning “during activity”;49-minute median is not five-minute evidence. This pass's direct Nature fetch failed; publisher search extraction and prior review are labeled, not falsely presented as a fresh full-text audit.
- **C20:** incomplete confidence interval and categorical microlearning dismissal withdrawn. No microlearning effect estimate underwrites the duration choice.
- **C23:** categorical sparse-data impossibility claim withdrawn. Simple scheduling is a scope/calibration choice, not a theorem about all knowledge-tracing models.
- **C26:** judgments of future learning, self-assessed correctness and checked performance separated. No unsupported universal self-grading bias magnitude.
- **Bastani correction:** publisher-authored notice read;Aug 20 2025 affiliation correction, not outcome change.
- **Near-exam/novice scope:** both included in S1/S5; empty cache handled explicitly.
- **Research access limits:** existing broader bibliography is preserved as historical background; unreverified entries are not automatically inherited as confirmed findings.

## Verification performed

Command:

```sh
python3 docs/research/fixtures/study_session_reference.py
```

Result: **38 synthetic assertions passed**. It executes a small independent research model, not imported production code. It checks temporal/exposure eligibility, correct/partial/miss handling, duplicate IDs, initial baselines, selected pool boundaries, timing horizons, DST, physics, four timeline sums and Haiku cost arithmetic. It does not implement a database, log replay, provider SDK, live token accounting, rendering, or a human-learning evaluation.

Document-level checks inspect link targets, vocabulary, before-versus-after-feedback state snapshots, role of model/self grading, all-call arithmetic, and the six required interaction cases. No product source files changed; no private student data read; no paid requests, deployment, purchases, or human studies.

## Minimal next implementation

One synthetic source-backed item, a real saved answer, exposure events before reveals, a deterministic check or explicit abstention, and a later review transition preserving the existing due-clock invariant. Build the versioned event/projection contract explicitly; do not silently overwrite a legacy writer's schedule with a second authority. Prove transaction/replay behavior and privacy/budget failure paths before connecting live generation or advertising an enforced cap.
