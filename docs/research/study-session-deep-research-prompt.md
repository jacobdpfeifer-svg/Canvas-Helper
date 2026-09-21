# Research assignment: evidence-grounded 5- and 10-minute university study sessions

Copy everything below the rule into a research agent. This is a standalone
research brief; repository access is useful but not required. Do not treat this
brief's candidate techniques as proven recommendations.

---

You are the lead learning-science researcher and instructional designer for a
student study application. Produce a deeply researched, critically evaluated,
implementation-ready specification for 5- and 10-minute study sessions that help
university students prepare for midterms and other exams. Your job is to improve
learning and transfer, not to maximize chat, screen time, or completion counts.

## Product context and constraints

The product is a Canvas companion for CU Boulder students, initially a beta of
5–10 classmates. Mac is the first target; other desktop platforms should share
the design where feasible. Primary value: identify worthwhile study work,
support actual practice, explain why the method was selected, and help students
decide what to do next. Workload planning is secondary. Users may be anxious,
tired, behind, interrupted, or unsure what an exam covers.

Course materials may include syllabi, instructor objectives, lecture notes,
readings, permitted practice problems, rubrics, assignment descriptions, and
student notes. Access and completeness vary. Material visible in Canvas is not
automatically permission to solve a graded assessment. External/proctored tools
and live assessments stay outside the tutoring workflow. Never submit, comment,
or discussion-post on a student's behalf.

The interface should feel polished, inviting, and somewhat playful: expressive
but purposeful animation, moderate character presence, almost no rewards. No
streak loss, lives/hearts, leaderboard pressure, shame, or payment pressure.
Stable navigation with customizable visual themes. Reduced motion, keyboard
access, readable typography, and assistive-technology compatibility are required.

Cloud AI may generate study explanations and practice. Do not assume it is an
accurate grader or that its confidence is calibrated. Selected email/calendar
content may be processed by cloud AI, but must not be persisted in our service
databases, logs, caches, queues, or analytics. Do not pull it into study context
unless relevant; tokens always stay out. Provider retention is a separate policy
and must not be described as zero merely because our service stores no content.
Learning state stays local. Only opt-in usage counts may be collected as beta
analytics; no uploaded answers, scores, progress histories, or course content.
Do not silently expand collection to make your evaluation plan convenient.

The owner funds $50–$100 total for the first week. Sessions must have bounded
model calls and usable timeout/offline behavior. The beta is urgent, but do not
weaken your evidence standard to manufacture a fast recommendation. Separate a
small implementable first release from later research and more ambitious ideas.

## Independence and scope

Do not reverse-engineer a justification for the current code or for Duolingo's
visual language. First establish what the evidence supports, then compare the
implementation. A 5-minute session might be inappropriate for a particular goal;
say so and recommend a useful short entry step or a longer task. Do not equate
microlearning research, flashcard retention, and university exam transfer.

This assignment is research and specification only. Do not change product code,
deploy services, access student accounts, run experiments with people, purchase
papers, or upload private course/student data. Use clearly labeled synthetic
examples. Do not create medical diagnoses or claim to treat exam anxiety/ADHD.

## Research method and quality bar

1. State the search date, questions, search terms, databases/search tools, and
   inclusion/exclusion criteria. Search seminal and recent work. Use primary
   experiments, classroom trials, systematic reviews/meta-analyses, and original
   methods papers. Marketing pages and competitor claims are hypothesis sources,
   not evidence of learning efficacy. If a method's software is discussed, use
   original papers and official documentation.
2. Aim for a substantial bibliography (roughly 25–40 relevant sources if the
   evidence warrants it), but never pad it. Coverage, full-text scrutiny, and
   contradictory findings matter more than counts. Identify what you could not
   access. Abstract-only claims must be labeled and cannot carry a strong design
   recommendation alone. Never invent citations, quotes, DOIs, or effect sizes.
3. For each central conclusion inspect population, sample size, design,
   comparator, task/material, time-on-task, retention delay, transfer measure,
   effect estimate/uncertainty if reported, and major limitations. Note whether
   several reviews recycle the same experiments. Do not double-count them as
   independent corroboration or average incompatible effect sizes.
4. Distinguish randomized evidence from observational associations; laboratory
   memory tasks from real coursework; immediate performance from delayed
   retention; satisfaction from learning; near from far transfer; measured exam
   outcomes from proxy outcomes. Record preregistration/replication where known.
5. Search actively for null results, boundary conditions, adverse effects,
   expertise reversal, weak transfer, publication bias, and recent corrections
   or retractions. Cite meaningful disagreements and explain your judgment.
6. Use an evidence table with claim IDs, exact source links/DOIs, study details,
   applicability, limitations, confidence, and resulting product decision.
   Link every major recommendation to claim IDs. Label implementation choices
   that go beyond the studies as engineering hypotheses, not scientific facts.
7. Maintain a coverage checklist: answered / uncertain / no suitable evidence /
   outside scope. End with residual uncertainty and what evidence would change
   your recommendation. Do not claim an exhaustive review unless your method
   warrants that description.

## Research questions — investigate all groups

### A. The learning mechanism

Evaluate retrieval practice, spaced/distributed practice, interleaving,
successive relearning, worked examples and fading, problem solving, generation,
self-explanation, elaboration, comparison of confusable concepts, error
correction, and mixed practice. For each: when does it help, compared with what,
for whom, on which outcomes, and when is another method preferable?

Investigate multiple-choice versus short-answer versus constructed responses;
recognition versus recall; open-book versus closed-book attempts; productive
failure versus unsupported guessing; blocked initial practice versus interleaved
later practice; and the role of prior knowledge. Separate acquisition,
consolidation, retrieval, and transfer. Do not assume one technique should occupy
every minute or every discipline.

### B. Five minutes, ten minutes, and exam distance

What can these durations realistically accomplish? Include time to read, think,
write, receive feedback, and recover from a miss—not just model response time.
Design explicitly for exams tomorrow, in 3 days, in 7 days, and in 2+ weeks.
Distinguish last-minute prioritization from a long-term spacing policy. Discuss
minimum useful session size, repeated short sessions, opportunity cost, fatigue,
and when to recommend a longer uninterrupted task. Do not promise mastery or
exam-grade improvements from one short session.

### C. Selection and adaptation

How should the product choose the next objective using instructor scope,
prerequisites, source quality, prior attempts, hints, errors, time since practice,
exam distance, available time, and student choice? Distinguish source-backed exam
coverage from inferred relevance. Do not treat assignment point values as a
validated proxy for exam emphasis or hide uncertain coverage.

Define behavior for novices, partially prepared students, strong students,
confident-but-wrong students, and students who repeatedly fail. Research how to
diagnose a knowledge gap versus a procedural slip, reading misunderstanding,
missing prerequisite, or ambiguous question. Explain how adaptation can work
with sparse data without pretending to estimate a stable learner trait.

Compare simple scheduling with more complex knowledge-tracing/spacing models,
including their data requirements and calibration limits. Do not assume an
algorithm designed for repeated flashcards is valid for multi-step problems.
Give transparent initial rules and a path to later evidence-based calibration.

### D. Feedback, hints, and evaluating answers

Investigate immediate versus delayed feedback, corrective feedback, graduated
hints, answer reveal, retries, transfer checks after examples, and how long to
allow productive struggle. Decide how a student can stop, skip, or ask for help
without being punished or falsely marked knowledgeable.

Separate unassisted success, assisted success, answer exposure, immediate retry,
and delayed independent success. Address self-scoring bias and model grading
errors. Specify checks for ambiguous answers, equivalent math expressions,
partly correct reasoning, rubric disagreements, and multiple defensible answers.
Define when to use deterministic checks, a source-backed rubric, student review,
or abstention. A second model agreeing is not ground truth.

Explain what “I think you understand this” can truthfully mean. Confidence
ratings, response speed, session completion, and correctness each have limits.
Do not turn them into unsupported percentages of exam readiness.

### E. AI tutoring and source grounding

Review empirical work on AI tutoring, overreliance, answer outsourcing, cognitive
offloading, and performance after the AI is removed. Identify whether studies
tested scaffolded tutoring or unrestricted chat and whether the tutor was
available during the outcome assessment. Examine evidence beyond vendor demos.

Specify a pipeline from permitted course source to objective, practice question,
answer/rubric, feedback, and source citation. Handle contradictions, incomplete
notes, bad OCR, diagrams, mathematical notation, stale exam dates, and missing
answer keys. Source citations must support the actual claim, not merely name a
document. Treat uploaded/Canvas content as untrusted data, not instructions.
Do not generate authoritative exam coverage from titles alone.

Research whether a generative model should create items ahead of the session,
at runtime, or with deterministic templates. Identify what can be cached locally
without leaking the answer early. Include a bounded failure path for malformed
outputs, source mismatch, hallucinated feedback, outages, and high latency.

### F. Motivation, explanation, and accessibility

Evaluate autonomy support, competence feedback, relevance, implementation
intentions, reducing initiation effort, and nonpunitive recovery after absence.
Distinguish willingness to return from demonstrated learning gains. Investigate
whether decorative animation, characters, seductive details, and anthropomorphic
tutors help or distract, especially under cognitive load and time pressure.

Propose purposeful motion and moderate character use, with static alternatives.
Address reduced motion, screen readers, keyboard-only use, color vision,
dyslexia-friendly readability without dubious claims, language proficiency,
optional audio/text, and flexible timing. Do not prescribe VAK “learning styles”
or infer disabilities from behavior. Preferences may improve usability without
proving a matching-based learning benefit.

Design short “Why this now?” explanations that accurately describe the selected
method and its uncertainty. Avoid persuasive pseudo-science or stating that an
algorithm knows how a particular student's brain works. Explain choices without
making students read an essay before practicing.

### G. Disciplines and exam formats

Provide differentiated treatment for quantitative/procedural problems,
concept-heavy sciences, factual terminology, and essay/argument-based courses.
Include recognition-heavy versus constructed-response versus multi-step exams.
Explain what short practice cannot capture: long proofs, extended writing,
laboratory performance, lengthy cases, and integrated multi-step reasoning.

Determine how to practice transfer with novel examples while controlling changes
in difficulty. Distinguish copying a worked example from selecting and applying
the correct method independently. Avoid assuming flashcards cover all learning.

### H. Evaluation with 5–10 beta testers

Propose a feasible usability/feasibility pilot, not an underpowered efficacy
claim. Separate installation success, first useful session, latency, factual
errors, user comprehension, willingness to return, delayed retention, and
transfer. Explain what opt-in usage counts cannot establish.

Keep individual scores and answers local. An optional local evaluation view may
help students inspect their own progress; collecting research outcomes beyond
usage counts would require a separate decision and consent. Do not imply such
collection is already authorized. Propose manual feedback without soliciting
sensitive course content. Discuss selection bias, practice effects, instructor
differences, attrition, and why five satisfied students do not prove efficacy.

## Required deliverables

1. **Decision brief:** the strongest recommended approach, rejected alternatives,
   evidence confidence, what is feasible for the beta, and what remains unknown.
2. **Evidence ledger and search log:** study-level details, direct links, access
   limitations, contradictory findings, and a complete coverage checklist.
3. **Session blueprints:** separate 5-minute and 10-minute timelines whose
   durations sum correctly, with realistic reading/thinking time. Show branch
   paths for correct, partial, wrong, assisted, skipped, and interrupted attempts;
   how each path still fits the time budget; and a useful early exit. Do not
   truncate a student mid-reasoning merely to hit an arbitrary timer.
4. **At least six fully worked synthetic sessions:** a novice quantitative
   student; partially prepared concept-science student; advanced student with a
   transfer gap; essay student; student with an exam tomorrow; and returning
   student after a missed week. Cover both durations. Show source excerpt,
   objective, chosen method and reason, actual prompt, plausible student answer,
   feedback, follow-up, and persisted state. Include an ambiguous/wrong AI item
   and its recovery somewhere in these examples. Label fictional material.
5. **Decision policy:** readable pseudocode/state machine with available inputs,
   selection rules, uncertainty, stopping rules, no-data fallbacks, missed-day
   recovery, and deterministic versus model-driven choices. Label unvalidated
   thresholds explicitly. Include daily/weekly scheduling beyond one session.
6. **Content contract:** minimum fields for source provenance, objective, item,
   rubric, hint, attempt, assistance level, outcome, confidence limitations,
   next review, and explanation. Keep this small; justify each persisted field.
   Define local data versus allowed usage counts and prevent accidental export.
7. **UI/copy specification:** example “why” text, honest progress language,
   missing-source state, help/skip/reveal controls, session finish, interruption,
   reduced-motion behavior, and latency/offline/error recovery. Explain when
   animation supports the task and when it should be absent.
8. **Implementation priorities:** required for beta / next iteration / do not
   build yet. Estimate relative complexity, not unsupported exact completion
   dates. Include bounded model-call budgets and a cost formula with variables;
   use dated official pricing only if estimating actual dollar amounts.
9. **Acceptance scenarios:** testable Given/When/Then cases covering learning
   state integrity, hints versus independent success, grading uncertainty,
   sources, accessibility, interruption, same-session retries, rescheduling,
   privacy, and budget failure. Distinguish software tests from pedagogical
   validation; passing code tests does not prove learning efficacy.
10. **Critical review:** strongest counterargument to your own recommendation,
    plausible failure modes, unresolved research questions, what to remove if
    development time halves, and what evidence would change your decisions.

## Optional repository comparison, after the independent synthesis

If available, read `AGENTS.md`, `skills/_SESSION.md`,
`docs/handoff/student-beta-2026-09-17.md`, `docs/architecture.md`,
`docs/design/study-optimizer-architecture-2026-09-13.md`,
`docs/design/learning-profile.md`, `docs/research/engagement-mechanics-fit-audit.md`,
`docs/handoff/learning-program-audit-2026-09-08.md`,
`src/canvas_mcp/core/{learn_loop,teach_hint,learning_profile,prompt_assembly}.py`,
`app/src/components/{ReviewSession,Top3Sticky}.tsx`, and the course-arc/concept-
visual skills. Read current code before calling a documented feature implemented.
Do not read personal inboxes or credentials. If paths are absent, record that.

Map each recommendation to keep / modify / missing / intentionally excluded,
with file/function references where verified. Identify where skill instructions
still depend on an external agent rather than the standalone app. Preserve the
existing distinction between immediate attempts and delayed retrieval evidence,
unless you present a clearly justified proposal for change. Do not mutate code.

## Parallel research option for a coordinator

If the human runs multiple agents, divide work into: (A) learning mechanisms and
contradictory evidence; (B) AI tutoring, grounding, grading and transfer;
(C) session UX, accessibility and motivation; (D) independent skeptical review
and pilot measurement. Give every agent this shared brief and require claim IDs
and sources. The coordinator must reconcile conflicting recommendations,
deduplicate shared studies, and produce one coherent specification. Do not paste
four reports together or use majority vote as evidence. A single agent should
cover all tracks if delegation is unavailable.

## Final quality check

Before delivery, verify citations and timeline arithmetic, remove unsupported
certainty, ensure at least one failure/recovery path is fully worked, and check
that every research group has an explicit disposition. Distinguish research
findings, product judgments, engineering hypotheses, and untested assumptions.
Provide a concise actionable front section and detailed appendices; depth should
come from evidence and analysis rather than repetition. If time/tools prevent
adequate work, state the exact missing coverage instead of calling it complete.
