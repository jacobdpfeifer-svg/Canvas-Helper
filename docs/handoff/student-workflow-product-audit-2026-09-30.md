# Student workflow product audit — 2026-09-30

Status: product direction and discovery questions. This document is a working
brief for the next build pass, not a commitment to implement every idea below.

## Executive decision

The product should be organized around the student's repeated loop:

```text
encounter friction → ask/capture it → get a trustworthy next step
→ act in the right tool → preserve the useful residue → continue
```

The primary surface should therefore be a context-aware **Ask / Unblock**
workspace, not a 5–10 minute learning guide. Learning guides remain valuable,
but they should be generated as a consequence of real friction: a missed
question, a repeated error, an upcoming exam, a lecture capture, or a plan the
student is about to execute.

The winning promise is not “we also have an AI chatbot.” It is:

> Give the student one question, screenshot, voice note, assignment, or messy
> study-session moment. ProductName figures out what kind of help is needed,
> uses the student's actual course context, answers at the right depth, checks
> its work, and leaves the student with the next useful action already prepared.

This fits the signed read-only pivot. The agent can be highly proactive inside
the student's private workspace—classify, retrieve, compare, draft, schedule a
private reminder, create a study item, and prepare a handoff—while Canvas-visible
submission, discussion, and comment actions remain preview-only.

## What the current repo gets right

- Local-first memory and the Canvas freshness path are unusually strong raw
  materials for contextual answers.
- Course sources, instructor-policy extraction, study packets, deterministic
  checkers, delayed retrieval evidence, and the funded AI relay already exist.
- The current privacy and action boundaries are credible. They are a product
  advantage, not merely compliance text.
- The extension/freshness work can become the “something changed; here is what
  it means and what to do” layer that generic homework solvers do not have.
- Voice chrome and photo intake provide an interaction foundation for live
  capture, but they are not yet a complete recording/meeting workflow.

## What is not working as the primary product

### 1. The 5–10 minute learning guide is too early in the loop

It assumes the student has already chosen to study and wants a bounded lesson.
Most high-frequency behavior is more urgent and concrete: “What does this
question mean?”, “Am I using the right method?”, “Why is my answer wrong?”,
“What do I submit?”, or “What changed since yesterday?”

Improvement: make the guide an automatic follow-on. After an answer or capture,
the system can offer “turn this into a 6-minute check,” but it should not make
the student enter a separate learning flow before receiving help.

### 2. Study is currently packet-first, not friction-first

`StudyView` offers an eligible item, a 5/10-minute session, or a practice
alternative. That is useful for a known objective, but it does not accept the
student's actual problem as the starting object. The funded AI request is also
shaped around a study item (`stem`, `rubric`, `submitted_answer`, selected
passages), not a general question with an explicit intent and evidence plan.

Improvement: add a shared question intake that accepts text, screenshot/photo,
selected Canvas text, and eventually audio. Route that intake into the existing
study/checking machinery where appropriate instead of creating a second isolated
AI stack.

### 3. The repo has context, but not yet a context policy

There are many possible context sources: course sources, assignment details,
instructor profile, due dates, prior attempts, weak topics, lecture captures,
calendar/mail, and the student's preferences. Sending all of them to a model
would be noisy, expensive, and privacy-hostile.

Improvement: create a local **context broker** that returns a small, auditable
context packet with source, freshness, confidence, and reason-for-inclusion.
The answer should say when it is using course-specific evidence and should ask
for missing context rather than silently guessing.

### 4. Proactive behavior needs a single “next action” contract

Freshness, triage, study, calendar, and voice can each produce a suggestion.
If each surface emits its own “do this next,” the student gets competing first
actions—the exact failure seen in the 2026-09-22 live audit.

Improvement: every signal should produce a normalized private action candidate:
`why_now`, `student_value`, `required_input`, `risk`, `can_prepare`, and
`student_confirmation`. A single planner ranks candidates and presents one
recommended next step plus at most two alternatives.

## The answer system to build

### Step 1: classify the student's job

The router should identify one primary intent before choosing an answer style.
It can infer this from the wording, attached object, Canvas state, and recent
conversation, but must expose the classification when it materially affects the
response.

| Job | Student meaning | Default response |
|---|---|---|
| Unblock | “I am stuck on this exact problem.” | One next step, then progressive help |
| Explain | “What does this concept/reading mean?” | Plain explanation tied to course source |
| Solve | “Work this problem.” | Worked method, assumptions, check, answer last |
| Verify | “Is my reasoning/answer right?” | Locate first wrong step; do not overwrite useful work |
| Choose method | “Which formula/process applies?” | Compare candidate methods and recognition cues |
| Recall | “Quiz me / what do I know?” | Retrieval prompt before reveal |
| Plan | “What should I do now?” | One ranked action with time and dependencies |
| Synthesize | “Connect lecture, reading, and assignment.” | Evidence-linked synthesis and implications |
| Capture | “Save what happened here.” | Transcript/notes/tasks/questions with provenance |
| Navigate | “Where do I click / what tool do I use?” | Screen/process coaching; student acts |

The model should not answer a `Recall` request as a `Solve` request. It should
not turn a `Verify` request into a polished replacement answer. This intent
classification is the foundation for making the system feel personalized.

### Step 2: identify the academic boundary

Before answering, classify the object as one of:

- open practice or personal notes;
- active Canvas assignment or graded work;
- quiz/exam/proctored screen;
- course administration or planning;
- external/LTI tool.

For active graded/proctored work, the system can explain concepts, point to the
relevant method, give a parallel example, or coach navigation, but it must not
provide the answer to the live item. This is consistent with the existing
`student-canvas-browser` and `student-screen-coach` boundaries.

### Step 3: build a minimal evidence packet

Local selection should prefer, in order:

1. the exact text/image/audio the student supplied;
2. the matching assignment, rubric, or Canvas page;
3. the current course source and instructor conventions;
4. the student's prior attempt or related correction;
5. adjacent lecture captures and study items;
6. general knowledge only when course evidence is absent.

Every passage should carry a locator, fetched-at time, source kind, and a
confidence/status label. The final answer should distinguish “your syllabus
says…” from “I infer…” from “general explanation.”

### Step 4: verify according to the question type

Gauth's useful pattern is structured, numbered work with a reason after each
step. ProductName should add independent checks where they make sense:

- algebra/calculus: symbolic simplification, substitution, units, boundary or
  domain checks;
- physics/chemistry: dimensions, sign/direction, magnitude, conservation or
  limiting cases;
- statistics: assumptions, sample/population distinction, calculator result,
  interpretation in words;
- coding: syntax/type checks, test cases, edge cases, and the course's allowed
  language/tool constraints;
- writing/history/business: source alignment, rubric coverage, claim/evidence
  separation, and uncertainty rather than fake numerical certainty;
- planning: due-time normalization, dependencies, estimated effort, and current
  submission state.

If the system cannot verify a result, it should say exactly what remains
unchecked. “I cannot verify this from the supplied image” is better than a
confident completion.

### Step 5: answer progressively

The default response should be short enough to use while working:

1. what kind of question this is;
2. the answer or next step in one sentence;
3. the minimum explanation needed to trust it;
4. a check or uncertainty note;
5. one action: try the next step, compare your work, save a correction, or
   start a short retrieval check.

“Show full work,” “just give me a hint,” “check my answer,” and “teach me this”
should be persistent controls, not prompts the student has to rediscover.

## The differentiated student workflow

### The Ask surface

Make Ask available from Home, Study, the Canvas extension, and the selected-text
context menu. Inputs:

- paste/type;
- screenshot/photo with crop and “what part?”;
- selected Canvas assignment/page text;
- “ask about this” from a due item or course source;
- voice question during a session.

The first screen should not ask the student to choose a course if the evidence
already identifies one. It should show the inferred context as an editable chip:
`APPM 1235 · Written HW 5 · practice · due tonight`.

### The answer-to-action bridge

After answering, ProductName should automatically offer only relevant private
actions, for example:

- “Save this as a correction for the chain rule.”
- “Give me a parallel problem.”
- “Add a 2-minute retrieval check tomorrow.”
- “Open the assignment instructions and show the required upload.”
- “Put the three unfinished steps into a private plan.”
- “This looks like a live graded item; I can explain the method or coach the
  tool, but not answer it.”

The system may prepare these locally. It must still preview and require the
student to initiate any Canvas-visible or externally binding action.

### The one-screen plan

The home experience should answer “what should I do now?” with one action that
combines urgency, grade value, effort, and readiness. It must reconcile the
freshness defects already found: local-time due labels, current submission
state, real week windows, tool classification, and one coherent do-first choice.

### Study sessions and meetings

Treat a recording as a structured capture, not as a transcript dump. A session
should produce:

- timestamped transcript with speaker labels when available;
- short live notes and a cleaned post-session summary;
- concepts explained or mentioned;
- questions left unresolved;
- decisions and commitments;
- assignments, dates, and required tools;
- links back to Canvas sources or the exact audio moment;
- a private action list with “agent can prepare” versus “student must do”;
- optional course note updates after preview.

The student should be able to say “mark that,” “what did she mean by…?”, or
“turn the last ten minutes into a review sheet” while recording. A study-group
mode should separate shared discussion from private reflection and should never
silently identify or upload other people. Recording needs an explicit local
consent indicator, pause/delete controls, retention settings, and a clear
“not recorded” state.

The first version should be local audio capture plus post-session processing;
live transcription and speaker separation can follow once storage, battery,
privacy, and accuracy are proven.

## Recommended build order

### P0 — make the product useful every day

- Shared Ask intake from Home/Study/extension.
- Intent + academic-boundary classification.
- Minimal context broker with source labels and freshness.
- Answer contract: direct help, explanation, check, uncertainty, next action.
- One unified “next action” planner to replace competing first-action surfaces.
- Fix the live-audit defects that currently damage trust: due-time zones,
  submitted-state freshness, do-first sorting, false tool labels, and profile
  metadata parsing.

### P1 — make answers feel uniquely personal

- Course-specific method and instructor-convention retrieval.
- Prior-answer and weak-topic linking.
- Independent domain checks and abstention.
- Save correction / parallel problem / retrieval check actions.
- Extension affordances: ask about selection, screenshot, or current Canvas item.

### P2 — make the system remember real student life

- Local recording and structured session capture.
- Meeting/study-group notes with consent and action extraction.
- Cross-platform correlation across Canvas, calendar, mail, notes, and captures.
- Proactive change explanations: “what changed, why it matters, and what to do.”

### P3 — optimize and validate

- Measure successful unblock, correction quality, next-action completion, and
  delayed independent retrieval—not time in app or generated guide views.
- Build a student-labeled benchmark of anonymized question types, with a human
  correctness rubric and abstention scoring.
- Test whether students return because the answer was correct and useful, not
  because the UI created a habit loop.

## Product metrics that matter

Avoid “number of AI answers” as the north-star metric; it rewards dependency and
copying. Better signals are:

- time from friction to a usable next step;
- first-answer correction rate and independent verification rate;
- percentage of answers with a valid course/source match;
- student-reported “I knew what to do next”;
- follow-through on the private action prepared by the agent;
- delayed independent retrieval after help;
- false proactive suggestions and unnecessary questions asked;
- recording-to-useful-note conversion;
- trust: students can see what source/context the answer used.

## Questions for Jacob

These are the questions that will materially change the first build. Short,
concrete examples are more useful than general preferences.

### Highest priority

1. In the last week, what are the five exact things you used ChatGPT/Gauth or
   another AI tool for? Please include the input, whether it was graded, and
   what you did with the response.
2. When students say “give me the answer,” are they usually trying to submit
   immediately, unblock themselves so they can continue, check work they already
   did, or avoid doing the problem? Rough percentages are enough.
3. Which courses and question types should be the first target: math/STEM
   calculations, reading/writing, coding, Canvas planning, or all of them?
4. What is the most frustrating moment after a generic AI answer: it is wrong,
   too long, uses a method the professor dislikes, cannot see the diagram,
   lacks course context, or leaves the student unsure what to do next?
5. Would students accept “answer last” for active homework if the system gives a
   fast hint first, or would they abandon it unless the final answer is one tap
   away?

### Context and personalization

6. What information would feel valuable enough to justify connecting Canvas,
   calendar, email, notes, and browser context? What would feel creepy?
7. Should a course's instructor preferences override a student's global answer
   preference, or should the student always control that per question?
8. What should the system remember from a solved question: only a correction,
   the entire problem, the student's error pattern, a future review, or nothing
   unless explicitly saved?
9. When context conflicts—Canvas says one due date, a calendar says another,
   or a lecture uses a different method—which source should win and how should
   the conflict be shown?

### Proactive behavior

10. What private actions should the agent be allowed to prepare without asking:
    save notes, create a study check, draft a plan, open the right tool, create
    a personal calendar event, or something else?
11. What are the three signals that should trigger an automatic “you probably
    need this now” suggestion? Examples: due in 24 hours, repeated errors, a
    new Canvas announcement, an unfinished meeting commitment.
12. How much interruption is acceptable: one daily brief, only when something
    changes, a passive side rail, or a conversational prompt after each answer?

### Recording and study sessions

13. Is the target primarily lectures, office hours, study groups, project
    meetings, or all four? Which one happens often enough to validate first?
14. Would students record from the laptop, phone, browser extension, or a small
    desktop control? Do they need live captions or is a post-session result
    enough?
15. What outputs are actually used after a session: searchable transcript,
    concise notes, flashcards, action list, quiz questions, unresolved topics,
    or timestamps for confusing moments?
16. What consent/privacy behavior is non-negotiable when other people are in the
    room? Who is allowed to see the recording and extracted notes?

### Validation

17. Can you recruit 5–10 students to let us observe ten real AI interactions
    (screen recording or narrated replay, with course content redacted)?
18. What would make a student say after one week, “I would pay for this instead
    of Gauth/ChatGPT”? What would make them uninstall it?

## Competitor note

Gauth's current public product emphasizes photo/type input, fast streamed
step-by-step solutions, rendered mathematics, saved history, follow-up
questions, and paid unlimited use. Its own “how it works” and accuracy pages
state that the solution is generated by a language model, is not independently
checked by a computer algebra engine, does not know a student's course or
instructor conventions, and can be wrong on ambiguity or missing diagrams.
ProductName should match the immediacy and polish of that front door, then win
on course-grounded context, answer-mode selection, verification, uncertainty,
and action continuity.

References:

- [Gauth product overview](https://www.gauth.io/)
- [Gauth: how a worked solution is produced](https://www.gauth.io/how-it-works)
- [Gauth accuracy and limitations](https://www.gauth.io/accuracy)

## Confirmed from Jacob's student workflow

The initial examples make the recurring jobs concrete:

- ask AI to help write a draft for a project;
- complete an administrative Canvas assignment;
- solve math homework, by far the most frequent use;
- summarize long readings before class so the student can participate;
- create a slide deck.

This means the first product cannot be “a math tutor with a Canvas calendar.”
It needs a small number of reliable workflows covering four modes:

| Mode | Student wants | Product behavior |
|---|---|---|
| Answer now | The answer quickly, using course context | Solve/check directly when allowed; show assumptions, sources, and confidence |
| Walkthrough | A useful explanation, not generic filler | Explain the method used in this course, why it applies, and what to do next |
| Mastery | To solve this kind of problem confidently and repeatedly | Diagnose prerequisites, build from easy to target, fade support, retrieve later |
| Make/handle | A draft, summary, slide deck, or admin task | Produce a structured artifact tied to the assignment/rubric and leave a reviewable next step |

The student should be able to switch modes after seeing the first response. A
student who begins with “solve this” should be offered “show the useful
walkthrough” and “build mastery from the missing prerequisite,” without having
to restate the problem.

## Mastery design: the build-up the student described

The proposed “Mastery” section is directionally strong, but it should not be a
confidence game or a long tutorial. It should be a targeted progression toward
one real capability.

Learning-science guidance supports spacing learning, alternating worked examples
with independent problem solving, retrieval practice, interleaving, deep
explanatory questions, and delayed judgments of what is known. The U.S. What
Works Clearinghouse guide specifically recommends these patterns, and reviews
of retrieval practice find benefits across content types and learner ages.
See [IES/WWC guidance](https://ies.ed.gov/ncee/wwc/PracticeGuide/1),
[McDermott's retrieval-practice review](https://pubmed.ncbi.nlm.nih.gov/33006925/),
and the [systematic review of distributed and retrieval practice](https://pubmed.ncbi.nlm.nih.gov/37615780/).

### Mastery loop

```text
target problem → diagnose the first missing prerequisite
→ one worked example → faded example → near-transfer problem
→ varied/interleaved problem → target problem
→ delayed retrieval → transfer problem → schedule the next check
```

The system should adapt the ladder to the student rather than force everyone
through every rung:

1. **Diagnose.** Ask for a short attempt or use the student's existing work to
   identify the first error: concept recognition, formula choice, setup,
   algebra, units, interpretation, or execution.
2. **Repair the smallest prerequisite.** Do not reteach the entire chapter when
   the student only lacks one recognition cue or formula condition.
3. **Use worked examples deliberately.** Beginners need more complete examples;
   more experienced students should move quickly to attempting the problem.
   Research on engineering problem solving supports this expertise-sensitive
   distinction rather than one fixed explanation style.
4. **Fade support.** Remove the last step, then the middle steps, then the
   method cue. The student completes more of the solution each time.
5. **Vary the surface.** Change numbers, diagrams, wording, and context while
   preserving the underlying skill. Interleave nearby methods so the student
   practices recognizing which method applies.
6. **Require independent retrieval.** The system should not mark mastery because
   the student can follow a walkthrough. It should require a closed-book
   attempt, ideally after a delay.
7. **Check transfer.** Include one problem that is not a cosmetic copy of the
   original. If transfer fails, diagnose the failure instead of simply adding
   more repetitions.

### What counts as mastery

Do not use “I feel confident” as the only signal. Confidence is useful as a
secondary self-assessment, but the product should distinguish:

- **felt confidence:** “I think I can do this”;
- **procedural success:** the student completes the steps independently;
- **recognition:** the student chooses the correct method from plausible options;
- **transfer:** the student succeeds on a changed problem;
- **durability:** the student retrieves it after time has passed.

A reasonable initial product rule is: two independent correct attempts in
different forms, followed by one delayed retrieval and one transfer check. This
is a product threshold to validate, not a universal scientific law. If the
student misses, the system should name the failure mode and step back one rung.

### Midterm connection

Every mastery session should answer:

- Where does this skill appear in the current course sequence?
- Which assignment, module, lecture, or reading introduced it?
- Is it explicitly named in the syllabus, review sheet, or exam guide?
- What evidence suggests it is important: point value, recurrence, instructor
  emphasis, prerequisite status, or a known upcoming checkpoint?
- What is the cost of not knowing it now?

The system must label this honestly. It can say “this is a prerequisite for the
exam topic listed in your review sheet” or “this appears in three recent
assignments.” It should not claim “this will be on the midterm” unless the
instructor explicitly says so.

## Department-specific product architecture

The student is right that engineering should feel different from a generic
student setup. The implementation should use **department packs** rather than
forking the whole product for each major.

Each pack supplies:

- common task types and artifact formats;
- discipline-specific question classifiers;
- verification/checking tools;
- prerequisite and skill-graph templates;
- common external tools and safe handoffs;
- rubric language and instructor-convention extraction;
- career/application context when requested.

An engineering pack might recognize unit analysis, free-body diagrams, circuit
topology, assumptions, sign conventions, lab reports, CAD/code/tool handoffs,
and design-tradeoff explanations. A writing pack would emphasize thesis,
evidence, rubric alignment, citation, revision, and voice. A business pack might
emphasize quantitative setup, case structure, spreadsheet reasoning, and
recommendation memos.

Onboarding should discover major/department, current courses, tools, and goals,
but the system must still learn from the actual syllabus and assignment sources.
Department identity is a prior, not permission to stereotype the student or
override course evidence.

## Audio and cross-platform context

The recording feature should classify each segment into durable objects instead
of dumping a transcript into “notes”:

| Audio signal | Saved object | Later use |
|---|---|---|
| Explanation of a concept | concept note + source/timecode | Ask follow-up or mastery session |
| Instructor emphasis | course emphasis claim | Prioritize review, never assert exam certainty |
| Assignment/date/tool mention | task candidate | Compare with Canvas and show conflict |
| Student question | unresolved question | Queue for Ask or office hours |
| Decision/commitment | private action | Add to plan with owner and due date |
| Confusion or disagreement | uncertainty marker | Revisit the exact audio moment |
| Example worked aloud | source-backed example | Build a course-specific practice item |

The capture pipeline should preserve raw audio/transcript provenance, but expose
clean notes by default. Every extracted task or course fact needs a confidence
and source timestamp. Conflicting Canvas data should be surfaced, not silently
merged. Multi-person recording needs explicit consent, a visible recording
state, pause/delete controls, retention settings, and a private/shared scope.

## Revised next build slice

The best next build is now narrower and more valuable than a general recording
system:

1. Build the universal Ask intake with the four modes: Answer now,
   Walkthrough, Mastery, and Make/handle.
2. Add an engineering-oriented classifier/checker pack as the first vertical,
   while keeping the underlying contracts department-neutral.
3. Add the context broker and an explicit “why this context was used” rail.
4. Implement one end-to-end Mastery ladder for a math/engineering skill,
   including prerequisite diagnosis, fading, transfer, and delayed retrieval.
5. Connect the result to the existing course sources, study events, freshness
   actions, and preview-only boundaries.
6. Prototype post-session audio capture after the Ask/Mastery loop produces
   useful structured objects. Recording should feed the same context broker,
   not become a separate notes product.

This sequence gives the student an immediate reason to return: the system helps
with the exact question or deliverable in front of them, then turns that moment
into durable course-specific capability.
