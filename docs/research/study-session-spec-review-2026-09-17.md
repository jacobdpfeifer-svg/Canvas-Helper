# Review of the 5–10 minute study-session specification

Date: September 17, 2026. Reviewed document:
[`study-session-5-10min-evidence-spec.md`](study-session-5-10min-evidence-spec.md).
Verdict: useful research synthesis and product direction; revise before treating
its pseudocode, data contract, or examples as implementation requirements.

Scope: document consistency, deliverable coverage, a check against the existing
learning-state writer, and selected primary-source verification. This is not a
replication of the bibliography search or verification of every cited effect.
No product code or original research document was changed by this review.

## Retain as the proposed direction

- A complete practice cycle rather than a timer filled with cards.
- Different treatment for example-first acquisition and independent retrieval.
- Explicit assistance/reveal/uncertainty states, distinct from delayed success.
- Sources, missing-source recovery, bounded generation and honest progress copy.
- Flexible time, interruption recovery, accessible controls and restrained motion.
- A feasibility pilot with no claims that five satisfied students prove efficacy.

These are useful design proposals, not blanket approval of their exact rules.

## Corrections required before implementation

### 1. The default timeline exposes the answer before “closed-book” retrieval

Sections 1 and 3 put a source excerpt before the attempt. The buffer example's
excerpt directly answers its question. Hiding it seconds later does not make
this evidence of retention across the previous review interval.

Separate modes: **learn/example-first** may show the relevant excerpt; **review**
shows the objective and source label but hides solution-bearing excerpts until
feedback or a student help request. Record any pre-attempt exposure. Do not credit
an exposed correct answer as delayed independent retrieval. Add a test covering
pre-attempt source viewing, not only hint-button use.

### 2. The proposed scheduler breaks its own delayed-evidence rule

`next_review` expands a gap for unassisted success unless it followed a reveal;
it does not require that the prior scheduled interval elapsed. An early retry
without reveal could advance the schedule. In contrast, current
`learn_loop.record_outcome` explicitly checks `moment >= scheduled` and preserves
the scheduled check for early or same-session outcomes.

Keep that protection; extend it with explicit exposure/assistance history. Do not
replace it with the proposed pseudocode verbatim. Define separate transitions for
attempt recording, schedule updates, and stability/evidence updates.

Also handle unknown/past exams and empty due pools. `min(now+gap, exam-1d)` can
produce a past date; `exam-1d` is undefined without an exam. `due[0]` can fail when
there are no due items near an exam. Returning `now` after every skip can trap the
student in the same item. Give each case a finite, explicit result and test it.

### 3. Source validation is an unspecified critical dependency

The physics example promises a source override but provides only a description
of a frictionless example, not an excerpt establishing the friction equation.
Absence of a phrase alone is not proof that a candidate explanation is wrong.
The `citation_supports_claim` function is a desired capability, not a working
verifier. Do not hide the core correctness problem inside that function name.

Use synthetic excerpts that actually support the intended solution. Specify
which checks are deterministic, which are model proposals, and when the app
must abstain. Without an adequate source/rubric, invalidate or pause the item;
do not claim an authoritative source override from nonexistent evidence.

### 4. Several “fully worked” examples are still outlines

Examples 4.5 and 4.6 lack the actual source excerpt, full student answer,
concrete feedback and fully specified persisted state. The essay example has
no synthetic article content and its objective includes a warrant while its
prompt asks for a counterargument. The physics example has the grounding gap
above. Expand them into executable walkthroughs, including time allocation and
the exact outcome/assistance values. Remove the unsourced categorical assertion
that sleep and a formula sheet beat another hour of new topics; offer a
nonprescriptive stopping choice instead.

### 5. The storage contract contradicts cloud grading and interruption recovery

“Never” in every export column conflates cloud inference with analytics/storage.
Selected source and attempt text must reach the model if it evaluates that
answer. Specify separate columns for local persistence, transient inference,
service persistence, provider retention, and optional usage analytics.

A hash cannot restore a draft or supply the evidence text for later checking.
Keep necessary local text or a reliably resolvable local source reference;
hashes verify identity/integrity rather than replacing content. Do not delete
the only readable source merely because an excerpt hash exists.

Scope the prohibition on email/calendar persistence to the study record and
our service; the approved connector design stores records/tokens locally.
Secrets never enter model prompts. Treat derived summaries under the same
no-service-persistence policy as the original connector content.

### 6. Model choice is an unapproved departure from the beta plan

The report selects OpenAI models, but the current plan uses existing
Claude/Gemini adapters. This review did not verify the quoted OpenAI prices or
model availability. Do not treat their inclusion as an authorization to switch
providers. Retain a provider-neutral formula and reprice chosen provider/model
endpoints at implementation time, including reasoning, media, tools, retries,
and hosting/fees where applicable.

The report's illustrative $0.63 arithmetic is consistent with its supplied
rates and token assumptions; that does not verify those rates or predict usage.
Call caps also need to cover generation before a session and retries, not just
the visible feedback steps. Never label an unimplemented cap “binding.”

### 7. Evidence strength and completeness need another pass

Some ledger rows are interpretations without a specific directly supporting
experiment (e.g. C23's categorical sparse-data assertion), and C20 includes an
incomplete confidence interval. C26 conflates judgments of future learning with
self-grading correctness; they need distinct evidence. Replace broad categorical
claims with bounded findings and label beta simplicity as an engineering choice.

C15 describes Kestin's outcome as learning “during the activity,” but the primary
paper describes **post-lesson tests**, with 194 eligible students in a crossover
design and median AI lesson time of 49 minutes. Correct this while preserving
the limitation: it does not establish delayed exam gains from five-minute use.
[Primary paper](https://www.nature.com/articles/s41598-025-97652-6).

A published Bastani correction exists (August 20, 2025). It corrects an author
affiliation, not the learning outcomes. Record it in the search audit rather
than leaving correction checks hypothetical.
[Publisher correction, mirrored PDF](https://pdfs.semanticscholar.org/4e8b/adc5aef00eef42a935570827ec170420106d.pdf),
[correction DOI](https://doi.org/10.1073/pnas.2518204122).

Original PMC access hit a browser check and the PNAS DOI fetch failed in this
review; Kestin was checked through the publisher and the correction through its
publisher-authored PDF. This is a spot check, not confirmation of all 32 entries.

### 8. Launch scope and failure behavior need explicit reconciliation

The document defers novice example-fading and exam-tomorrow triage while framing
the beta around midterms. Define a minimal usable novice path and near-exam
fallback for release, or explicitly narrow the promised audience. Remove any
claim that cached practice always works when a new installation has no cache.

Map every failure to an honest option: use a saved item if available, import a
source, open permitted notes, save an attempt for later, or stop. Do not show
self-scoring as if it were equivalent to verified grading.

## Build handoff after revision

The first bounded implementation should be one sourced item with a real attempt,
explicit exposure/assistance tracking, feedback or abstention, locally persisted
state, and a later-review transition that preserves the existing clock gate.
Demonstrate it with synthetic deterministic material before depending on live
generation. This is a suggested build order, not product code changed here.

## Acceptance of the research assignment

| Deliverable | Review disposition |
|---|---|
| Decision brief | Useful; qualify broad negative claims |
| Evidence/search ledger | Substantial; spot checks and extraction gaps remain |
| Timelines | Nominal durations sum correctly; exposure and branching semantics need fixes |
| Six worked examples | Six headings present; several examples incomplete |
| Decision policy | Not safe to translate literally; missing boundary cases |
| Content contract | Needs inference/storage separation and recoverable local evidence |
| UI/copy | Good direction; remove unsupported certainty and guarantee-like fallbacks |
| Priorities/costs | Reconcile midterm scope and approved providers |
| Acceptance scenarios | Add source exposure, empty cache, unknown dates and early retries |
| Critical review | Useful; not a substitute for verifying central claims |
