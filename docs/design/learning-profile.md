# Learning Profile — research + design v2

**Status (2026-09-08):** the **learn loop** is the teaching model
(`canvas_mcp.core.learn_loop`, `{user_root}/inbox/learn/items.yaml`).
`practice_format` is a **start bias** only — example then retrieve, or
retrieve first. It does not decide whether retrieval happens. Same-session
fluency and “that felt helpful” do not set the model. Part 1 research below
still applies; the “no scheduler” recommendation in §1.5 is superseded by an
exam-relative expanding schedule (not SM-2/FSRS).

**Relation to v1:** This document supersedes the first-pass draft. v1 shipped the
schema, onboarding priors, YAML + `USER.md` render path, and
`record_signal` (still largely unwired to live skills). v2 deepens the evidence
base, refuses psychometric trait inference, specifies honest signal hooks, and
phases skill/copy work by confidence. Do not re-litigate VAK at length — that
debate is settled below.

**Canonical code today:**
[`src/canvas_mcp/core/learning_profile.py`](../../src/canvas_mcp/core/learning_profile.py)
· onboarding write path via Tauri → `python -m canvas_mcp.core.learning_profile` ·
[`skills/canvas-week-plan/SKILL.md`](../../skills/canvas-week-plan/SKILL.md)
reads the profile so far.

---

## 0. Settled: no VAK / meshing

"Visual / Auditory / Kinesthetic" learning styles and the meshing hypothesis fail
well-designed tests (Pashler et al.; see also Newton & Miah, *Learning Styles Myth
is Thriving*). Matching instruction to a declared style does not improve outcomes.
~90% of papers still casually endorse styles — a practice gap, not a live debate
among cognitive scientists.

**Product rule:** no VAK quiz, labels, or modality restrictions. Legitimate residual:
**content-type fit** (spatial material benefits from diagrams for everyone) — a
property of the material, not the learner.

---

## Part 1 — research deep-dive

For every claim: source, effect size / CI when known, replication note. Contested
findings are flagged explicitly. Popular ed-tech marketing claims with weak primary
support are collected in §1.9 so they do not leak into schema or copy.

### 1.1 Core practice mechanisms (high confidence)

| Finding | Primary source | Effect / note | Replication |
|---------|----------------|---------------|-------------|
| Retrieval vs restudy | Rowland 2014 meta (159 ES, 61 studies) | Hedges *g* = 0.50, 95% CI [0.42, 0.58] | Strong; mostly lab |
| Practice testing (broader controls) | Adesope et al. 2017 (118 articles, 272 ES, N≈15k) | *g* ≈ 0.61–0.70 depending on comparison | Strong; lab + classroom; larger vs weaker controls |
| Classroom retrieval | Yang et al. 2021 | Positive across educational levels; smaller on transfer | Strong |
| Utility ranking | Dunlosky et al. 2013 (*Psych. Sci. Public Interest*) | Practice testing + distributed practice = **high utility**; highlighting/rereading = **low** | Canonical survey, not a single pooled ES |
| Spacing vs massing | Cepeda et al. 2006 (839 assessments, 317 experiments) | Spaced > massed; optimal inter-study interval **grows with retention interval** | Strong for verbal recall; lag×RI interaction is the design knob |
| Spacing magnitude (often-cited) | Synthesis of 254 studies (cited via Dunlosky/SciAm summaries) | ~47% vs ~37% recall spaced vs massed | Direction robust; exact % depends on materials |
| Interleaving | Brunmair & Richter 2019 (*Psych. Bulletin*; 238 ES) | Overall *g* = 0.42 [0.34, 0.50]; paintings *g* = 0.67; math *g* = 0.34; **words *g* = −0.39** (blocking better); expository texts ns | **Contested generalizability** — not universal |
| Expertise reversal | Tetzlaff, Brod et al. 2025 (*Learning & Instruction*; 176 ES, 60 studies, N=5924) | Low prior + high assistance *d* = 0.505; high prior + low assistance *d* = −0.428; **asymmetric** (helping novices matters more than withholding from experts); weaker for younger learners / some humanities | Robust interaction; domain-moderated |
| Worked examples / CLT | Sweller; Kalyuga et al. | Novices learn faster from worked examples; advantage flips with expertise | Strong theory + ER meta above |
| Desirable difficulties | Bjork & Bjork | Friction during practice (testing, spacing, generation) often improves durable learning; ease during study is a bad proxy | Strong principle; moderators matter |
| Autonomy / motivation | Deci & Ryan (SDT) | Autonomy, competence, relatedness support engagement and SRL | Strong motivational framework; not a cognitive ES |

**Product implication:** default `practice_format: worked_example` is justified for
cold-start / novice Canvas work. `retrieval` must **not** be a universal “always
quiz first” default — expertise reversal and recent LLM-tutor RCTs both argue for
prior-knowledge gating (see §1.6).

Interleaving belongs in skill advice for **similar category-discrimination tasks**
(e.g. mixed problem types in a problem set), not as a global profile field or a
blanket “mix your readings” rule.

### 1.2 Individual differences that replicate (vs styles that do not)

#### Prior knowledge / expertise level

Best-replicated aptitude–treatment interaction in this set (Tetzlaff et al. 2025).
High assistance (worked examples, step scaffolding) helps low-prior learners
(*d* ≈ 0.50) and can hurt high-prior learners (*d* ≈ −0.43). The interaction is
**asymmetric**: providing help to novices is more important than stripping help
from experts. Moderators: how prior knowledge was assessed, educational status,
content domain.

**Actionable for us:** course-scoped, not a global personality. See §2.1.

#### Working memory capacity (WMC)

WMC predicts learning under high load; ATI work (Cronbach & Snow lineage; recent
reviews e.g. *Behav. Sci.* 2025 on instructional fit) finds low-WMC learners benefit
more from segmenting, cueing, and reduced extraneous load. Cueing meta-analysis
(Xie et al. / PLOS One 2017 lineage): signaling reduces subjective load and improves
retention/transfer modestly (retention *d* ≈ 0.27, transfer *d* ≈ 0.34 in one cueing
meta).

**Not actionable as a measured field:** no legitimate WMC test belongs in this
product; measuring it would be psychometric surveillance. Fold benefits into
universal defaults: short chunks, signaling headers, segmenting.

#### Self-efficacy and academic self-concept (Bandura)

Multon, Brown & Lent 1991: self-efficacy related to academic outcomes (~average ES
in the mid-0.3s). Newer higher-ed intervention metas often find ~*g* 0.25–0.34 on
efficacy measures and smaller effects on achievement; heterogeneity is high.
Malleable via mastery experiences, vicarious models, verbal persuasion, and
affective states — **mastery experiences are the strongest path**.

**Do not store a self-efficacy score.** Design for early wins: tiny First steps,
visible “done” criteria, competence without pep talks.

#### Growth mindset (Dweck) — contested; do not build UI around it

- **Sisk et al. 2018** (*Psych. Science*): mindset–achievement *r* = 0.10, 95% CI
  [0.08, 0.13] (*k*=273, N≈366k); 58% of effects ns; intervention meta overall
  **small**, with tentative benefits mainly for at-risk / low-SES subgroups
  (few studies).
- **Yeager et al. 2019** National Study of Learning Mindsets (*Nature*): brief online
  intervention; lower-achieving 9th graders’ core GPA ≈ **0.11 SD**; higher achievers
  ≈ null (*d* ≈ 0.01); effects conditional on school peer norms.

Popular claims of large, universal gains are an **oversell**. Effects are real in
narrow conditions and small at population scale.

**Exclude from schema and marketing copy.**

#### Math / test anxiety

- Hembree 1990 meta: math anxiety related to poorer achievement and **avoidance** of
  math coursework/careers.
- Ashcraft & Kirk 2001: high math anxiety reduces working-memory span on
  computation-based tasks — anxiety acts like a dual-task load on retrieval under
  pressure.
- Meta-analytic MA–WM link is small but reliable (*r* ≈ −0.17; e.g. Frontiers 2021
  MA–WM mediation meta); MA–performance correlations are consistently negative
  (large-N anxiety metas).

**Do not infer anxiety from clickstreams.** Soft product rule: for quiz/proctored
Mode items, prefer a short worked-example warm-up and low-shame tone even when
global `practice_format=retrieval`.

#### Executive function / ADHD-relevant literature

Task initiation, organization, and chunking help students with EF challenges.
School-based ADHD intervention reviews: multicomponent programs median *g* ≈ 0.37;
daily report cards promising; self-regulation + 1:1 delivery matter for academic
outcomes. CBT-oriented organization training improves planning/procrastination
behaviors more reliably than GPA. Brain-training / far-transfer claims remain weak.

**Do not diagnose or store ADHD.** Existing `chunk_size: short` + concrete First
steps already map to the actionable part — reinforce without labeling.

#### Metacognitive calibration (JOLs)

- Delayed judgments of learning improve **relative** accuracy substantially
  (Rhodes & Tauber meta: *g* ≈ 0.93 for delayed vs immediate JOLs) with only a tiny
  direct memory benefit (*g* ≈ 0.08).
- Learning-strategy instruction can improve monitoring accuracy (meta *g* ≈ −0.57
  on monitoring error in one learning-strategy monitoring meta).
- Far transfer of metacognitive skill training is weak and context-bound
  (Winne/Hadwin-aligned transfer studies).

**No calibration score field.** Keep optional in-skill self-check questions when
`practice_format=retrieval`; do not claim we “train metacognition” as a product pillar.

### 1.3 Self-regulated learning models

**Zimmerman’s cyclical model** (forethought → performance → self-reflection) maps
cleanly onto this product: week plan / Top-3 = forethought; student work =
performance; we barely scaffold reflection today.

- **Actionable:** optional one-line post-session reflection after Top-3 / narrate-after
  (“What blocked you?” / “What worked?”) — not a profile trait.
- **Not a schema field.**

**Winne & Hadwin COPES** (Conditions–Operations–Products–Evaluations–Standards):
mostly **descriptive**. The agent already supplies Conditions (inbox sync) and
scaffolds Operations (First step). Evaluations require an explicit student signal we
do not yet have — which is why `record_signal` needs format-specific feedback, not
inferred “engagement.”

### 1.4 Procrastination and task avoidance

- **Steel 2007** meta-theoretic review: strongest correlates are task aversiveness,
  delay, impulsiveness, low self-efficacy / conscientiousness facets — consistent
  with temporal motivation theory (expectancy × value / delay; present bias /
  hyperbolic discounting).
- **Sirois & Pychyl:** procrastination as short-term **mood repair**; shame and
  self-criticism feed the loop rather than ending it.
- **Gollwitzer & Sheeran 2006:** implementation intentions (if–then plans) medium-to-large
  on goal attainment overall (~*d* ≈ 0.65 across 94 studies); alleviating failures to
  get started ~*d* ≈ 0.61. Academic-procrastination-specific RCTs are **mixed**
  (e.g. Gustavson et al. 2017: goal-setting helped more cleanly than II alone in that
  design) — still the best lightweight initiation technique for a briefing UI.
- **Temptation bundling** (Milkman et al., gym audiobook RCT): large engagement lift
  in that domain; academic evidence thinner — optional soft suggestion only.
- **van Eerde & Klingsieck 2018:** procrastination interventions work; CBT-type
  approaches outperform lighter ones on average — **out of scope** as therapy.

**Narrate-after / interrupt-only-for-Top-3:** the psychology **supports** this
posture. Shame, guilt, and constant “you’re behind” interrupts predict more
avoidance. Keep. Do not add streak-shaming.

### 1.5 Spaced-repetition schedulers (SM-2, FSRS) vs Canvas coursework

| Algorithm | Model | Needs per item |
|-----------|-------|----------------|
| **SM-2** (classic Anki) | Ease factor + interval multipliers | Repeated graded recalls; stable atomic card |
| **FSRS** | Difficulty / Stability / Retrievability; power-law forgetting; optimizable weights; target retention | Review history + ratings; enough history to fit parameters |

**Recommendation: do not implement FSRS or SM-2 in this product.**

Canvas work is readings, papers, discussions, and problem sets — not discrete
flashcard atoms with stable IDs and graded recall events. Building a scheduler would
require inventing fake cards, logging surveillance-shaped review history, and
optimizing a forgetting curve we cannot honestly estimate.

**Spacing principle still applies.** Prefer due-date-relative **revisit nudges**
(§2.4): if a quiz/exam is >5 days out and related material was briefed, resurface one
short self-check mid-window. Store `{assignment_id, last_briefed_at, next_nudge_at}`
— not a DSR memory state.

### 1.6 Intelligent tutoring systems and LLM tutors

- **Bloom 1984 “2σ problem”** is a historical aspiration from small mastery/tutoring
  studies — **not** the modern estimate of typical tutoring effects.
- **VanLehn 2011** (*Ed. Psychologist*): human tutoring ≈ *d* = 0.79; step-based ITS ≈
  *d* = 0.76 vs no tutoring; finer-than-step granularity does not keep buying large
  gains (plateau).
- **World Bank adaptive/AI RCT meta** (Can EdTech Close Learning Gaps?, ~2026;
  191 ES, 14 studies): adaptive/AI ≈ **0.125 SD**; AI-tutoring subgroup ≈ **0.12 SD**;
  **no clear evidence generative AI outperforms prior adaptive tech** (CI wide).
- **LLM RCTs (2023–26):** unrestricted GPT can raise practice performance then **hurt**
  unaided transfer when the tool is removed; Socratic/scaffold tutors sometimes improve
  longer-term prompting habits but feel less helpful and do not always beat targeted
  hints (mixed CS1 results).

**Implication:** “quiz me first” and pure Socratic dialogue are **not** universally
better defaults. Prefer worked-example → brief retrieval for novices; retrieval-first
when course prior knowledge is higher **or** the student has observed preference.
Keep `autonomy: choices` as the SDT-friendly default; do not force Socratic as the
only mode.

### 1.7 Mayer’s multimedia principles — agent-applicable subset

Mayer’s Cognitive Theory of Multimedia Learning lists ~12 principles. For an agent
that emits **markdown briefings** (not generated video/diagrams):

| Apply in briefings | Skip as product requirements |
|--------------------|------------------------------|
| **Segmenting** — short steps, separate time boxes | Modality (spoken + graphics) |
| **Signaling** — clear headers (Why / Outcome / First step) | Multimedia / image generation as default |
| **Coherence** — cut seductive detail and pep clutter | Redundancy of identical narration+on-screen text |
| **Pre-training** — define key terms before the walkthrough | Spatial contiguity for diagrams we don’t ship |
| **Temporal contiguity** — keep example next to its step | |

Content-type fit (diagrams for spatial content) remains a **material** property when
we do attach or link visuals — never a learner-style lock.

### 1.8 Privacy / ethics of behavioral learning inference

Learning-analytics ethics (e.g. information-ethics treatments of student privacy;
emerging “cognitive privacy” critiques of platforms that infer confusion, struggle, or
engagement from interaction telemetry) warn that inferred mental states are often
treated as ordinary logs, enabling sorting, streaming, and performative compliance
rather than support.

This product’s v1 rule — **profile biases defaults, never restricts content** — is
directionally right and must be enforced, not merely asserted:

- Store only **functional teaching levers + counters**, local under `{user_root}`.
- Student-visible summary in `USER.md`.
- No silent psych inference (anxiety, ADHD, mindset, WMC).
- New signals must be **explicit preference feedback**, not reconstructed struggle.
- FERPA tests today cover PII redaction
  ([`tests/security/test_ferpa_compliance.py`](../../tests/security/test_ferpa_compliance.py)),
  not inferred traits — phase 5 adds assertions that psych-label fields are absent.

### 1.9 Marketing myths — keep out of product copy

| Claim | Why exclude |
|-------|-------------|
| VAK / meshing | Fails controlled tests |
| Growth-mindset as large universal booster | Sisk 2018 small; NSLM conditional ~0.11 SD |
| Bloom “two-sigma” as expected product effect | Modern tutoring/ITS ≈ 0.7–0.8; GenAI metas ≈ 0.12 |
| Universal interleaving | Brunmair & Richter: domain-specific; can hurt word learning |
| “10,000 hours” / neuroplasticity marketing | Popular oversimplifications, not design levers |
| Brain-training far transfer | Weak; do not imply EF games |
| Always quiz-first / always Socratic LLM | Expertise reversal + LLM RCTs say otherwise |

---

## Part 2 — implementation design for this repo

### 2.1 What to measure (schema)

#### Keep — global fields in `learning_profile.py`

Canonical state: `{user_root}/calibration/learning-profile.yaml`.
Human summary: `USER.md` → `## Learning profile` (overwritten on every save).

| Field | Values | Default | Why it stays |
|-------|--------|---------|--------------|
| `practice_format` | `worked_example` \| `retrieval` | `worked_example` | Retrieval ES strong; ER says default high-assistance for novices |
| `autonomy` | `directive` \| `choices` | `choices` | SDT autonomy support; not “Socratic-only” |
| `chunk_size` | `short` \| `long` | `short` | CLT / EF-friendly initiation; matches Top-3 posture |

Each field has `*_source: default | onboarding_game | observed` and internal
`signal_counts`. `OBSERVED_SIGNAL_THRESHOLD = 3` (net lead over runner-up) mirrors
[`permissions.py`](../../src/canvas_mcp/core/permissions.py) k-success shape.

**Do not add to global YAML:** WMC, growth_mindset, anxiety, ADHD/EF labels,
self_efficacy, metacognitive_calibration — none are both (a) agent-actionable with a
legitimate signal and (b) ethical to infer here.

#### Add — course-scoped prior knowledge (not a LearningProfile field)

Expertise reversal is **course-local**. A student can be experienced in one course and
novice in another; a global “expertise” field would be wrong.

**Convention:** in `inbox/courses/{course}.md` arc notes, maintain:

```markdown
prior_knowledge: novice | developing | experienced
```

Written/updated by `student-course-arc` from syllabus difficulty, early grades,
student self-report, or explicit ask — never from silent click inference.

**Override rule for skills:**

- `novice` → worked-example-first for that course’s cards **even if** global
  `practice_format=retrieval`
- `experienced` → prefer retrieval-first (unless student explicitly asks otherwise)
- `developing` or missing → use global profile prior

### 2.2 How `record_signal` gets a real signal

`record_signal(user_root, field_name, value, delta=1)` exists and is tested, but has
**zero production callers**. That was deliberate: wiring raw router outcomes would
fake a preference.

[`skill_router.route_intent`](../../src/canvas_mcp/core/skill_router.py) writes
`RequestLog.success_signal = accept | veto` meaning **skill matched vs unmatched**,
not “this teaching format helped.” Tauri palette routing often uses `--no-log`
anyway. **Do not** call `record_signal` from raw route accept/veto.

#### Honest signal map

| Field | Legitimate signal | Hook point | Fake proxy to reject |
|-------|-------------------|------------|----------------------|
| `practice_format` | Explicit “Quiz me instead” / “Walk me through instead” / post-brief format thumbs | New dock/IPC action after a teaching block or Top-3 card → daemon CLI → `record_signal(..., "practice_format", value)` (mirror `save_learning_profile`) | Router accept/veto; time-on-page; silence |
| `autonomy` | Offered 2 choices → student picks one **vs** replies “just tell me” / taps “Decide for me” | Agent/skill tags the reply **or** dock button | Ignoring the message |
| `chunk_size` | Student asks to “split this” vs “one block”; or explicit dock control | Explicit language / control | Ignoring Top-3 (busy ≠ preference) |

**Until format-feedback UI exists, leave `record_signal` unwired in production** —
document the call site, don’t invent proxies. `ApprovalSheet` remains gated-write UX,
not format feedback.

Onboarding (`Onboarding.tsx` three forced-choice prompts) continues to seed
`source: onboarding_game` via `apply_onboarding_answers`. Skip = defaults; behavior
can still override later once signals exist.

### 2.3 Which skills read the profile — concrete SKILL.md language

Skills personalize via markdown instructions reading `USER.md` / course files — not a
new picker engine.

#### `student-task-brief` (highest priority — currently missing profile)

Add a required section (diff language to land in a later code pass):

```markdown
## Learning profile (required)

Read `USER.md` ## Learning profile. These are priors, not fixed labels.

Shape each briefing card:

- `practice_format=retrieval` → **First step** opens with one self-check question,
  then the concrete action; `worked_example` → lead with a 2–4 step walkthrough,
  then one check.
- If `inbox/courses/{course}.md` has `prior_knowledge=novice`, use worked_example
  even if global `practice_format=retrieval`; if `experienced`, prefer retrieval.
- `autonomy=directive` → one imperative First step **plus** an if–then initiation
  line ("If it's after [meal/class], then open [link] and do [micro-step] for
  [time box]"); `choices` → two options, each with its own if–then line.
- `chunk_size=short` → time box ≤15–30m and one micro-outcome; `long` → allow
  60m+ consolidated when the task warrants it.
- Quiz / proctored Mode: prefer a short worked warm-up and low-shame tone even
  when global format is retrieval.
- Apply Mayer-for-text: signal with Why / Outcome / First step / Time box headers;
  segment; cut pep clutter; define jargon before the walkthrough.

Never shame delay. Prefer concrete initiation over motivation talk.
```

#### `canvas-week-plan` (already reads profile — extend)

Keep existing practice/autonomy/chunk bullets. Add:

```markdown
- Honor course `prior_knowledge` overrides from `inbox/courses/*.md` (novice →
  worked_example-first; experienced → retrieval-first).
- Every Top-3 **First step** includes an if–then initiation line (implementation
  intention), not only a bare imperative.
- No shame framing ("you're behind"); narrate progress, interrupt only for Top-3 /
  gated approvals per USER.md Communication preferences.
- If a quiz/exam is >5 days out and related material was briefed this week, include
  one mid-window self-check in the plan (due-relative spacing — not a flashcard deck).
```

#### `student-course-arc` (add prior_knowledge maintenance)

```markdown
## Prior knowledge (course-scoped)

Maintain a `prior_knowledge: novice | developing | experienced` line in this
course's `inbox/courses/{course}.md` arc notes.

- Seed from syllabus expectations, early assignment outcomes, or an explicit ask
  ("new to this field or reviewing?").
- Never infer from silence, open rates, or personality labels.
- When briefing in-course work, apply expertise-reversal override of the global
  Learning profile `practice_format` (novice → worked examples first;
  experienced → retrieval first; developing → global prior).
```

#### Leave alone for now

- `student-instructor-profile` — instructor prefs, not learner format
- `canvas-discussion-facilitator` — instructor tone/citation
- `student-assignment-triage` — Worth / auto-submit policy

### 2.4 Spaced repetition / review scheduling

**Decision: no FSRS/SM-2 module** (§1.5).

Later optional artifact: `{user_root}/calibration/revisit-nudges.yaml`

```yaml
# Minimal due-relative nudge — not a forgetting-curve state
- assignment_id: "12345"
  last_briefed_at: "2026-09-01T18:00:00Z"
  next_nudge_at: "2026-09-04T18:00:00Z"
  kind: mid_window_self_check
```

Skills schedule the self-check inside weekly planning; no optimizer, no per-fact
stability, no grade ratings required.

### 2.5 Procrastination interventions in Top-3 / briefing flow

| Technique | Evidence | How it lands here |
|-----------|----------|-------------------|
| Implementation intentions | Gollwitzer & Sheeran ~*d* 0.6 get-started | **Universal** if–then line in every Top-3 First step (not a profile field) |
| Tiny first action / mastery | Self-efficacy literature | Micro-outcome + short time box when `chunk_size=short` |
| Temptation bundling | Milkman et al.; thinner academic base | Optional one-liner when `chunk_size=long` (“pair with X only while the reading is open”) |
| Shame reduction | Sirois; Steel | Keep narrate-after; no guilt interrupts; no streak-shame |
| CBT for procrastination | van Eerde & Klingsieck | Out of scope (therapy) |

Communication posture in [`templates/USER.md`](../../templates/USER.md)
(“Prefer narrate-after… Interrupt only for Top-3 / gated approvals”) is
**evidence-aligned** — keep and reinforce in skill language.

### 2.6 Privacy / FERPA checklist for this feature

- Educational records stay under `{user_root}`; never commit.
- Profile fields are teaching levers, not diagnoses.
- `signal_counts` stay in YAML only (not rendered into `USER.md`).
- Future test: assert LearningProfile / YAML keys exclude
  `visual|auditory|kinesthetic|adhd|anxiety|mindset|wmc|self_efficacy` style fields
  (extend beyond today’s
  `test_default_profile_has_no_vak_fields`).
- No educator-facing dashboards that sort students by inferred “learner type.”

### 2.7 Updated non-goals

- No VAK / meshing labels or quizzes
- No permanent “learner type” badge (class event marks in [`class-standings.md`](class-standings.md) are not this)
- Profile **biases defaults only** — never restricts formats or opportunity
- No growth-mindset messaging UI (replicated effects too small / conditional)
- No WMC, ADHD, anxiety, or mindset fields or silent inference
- No FSRS / SM-2 scheduler for coursework
- No brain-training or neuroplasticity marketing claims
- No Bloom-2σ claims in product copy
- No universal interleaving of readings/expository text
- Do **not** wire `skill_router` accept/veto → `record_signal`
- No shame / streak / guilt interrupt spam
- No restoring hosted educator grading, proctoring, or quiz-taking automation

The dock retrieval session is the student-facing surface for `learn_loop` due
claims (at most two, student-scored, no answer key). It is not a learning streak,
heart, league, or notification. A peek chip may show how many checks are due and the
nearest checkpoint; an optional onboarding if–then (`if_then` on the profile
YAML) is the student's own start line, not a learner-type field. The dock may
also read a quiet brief-continuity line; that line is not learning evidence and
does not write this profile. Guilt copy, hearts, and leagues stay non-goals.

### 2.8 Onboarding (v1 shipped; v2 does not block on richer games)

Three skippable forced-choice prompts seed priors (`practice_format`, `autonomy`,
`chunk_size`) with `source: onboarding_game`. Richer mini-games from v1 sketches
remain optional UX polish — not required for the prior to be useful once format
feedback exists.

---

## Part 3 — phased build list

Priority = highest confidence × lowest effort first. **This pass = Phase 0 only.**

```text
Phase 0  v2 design doc (this file) — ready for review
    │
    ▼
Phase 1  Explicit format feedback UI/IPC → record_signal(practice_format)
    │
    ▼
Phase 2  SKILL.md: student-task-brief + canvas-week-plan
         (profile, if–then First steps, Mayer signaling, no-shame)
    │
    ▼
Phase 3  Course prior_knowledge + student-course-arc + ER override
    │
    ▼
Phase 4  Due-relative revisit nudges (not FSRS)
    │
    ▼
Phase 5  Autonomy “Decide for me” + chunk_size explicit controls → record_signal
    │
    ▼
Phase 6  Optional one-line reflection in narrate-after (speculative)
         + FERPA tests for absent psych fields
```

| Phase | Work | Confidence | Effort | Notes |
|-------|------|------------|--------|-------|
| **0** | This design doc | Highest | Done this pass | No feature code |
| **1** | Format feedback → `record_signal(practice_format)` + Tauri IPC | High | Medium | Unblocks observed overrides for the best-evidenced lever |
| **2** | SKILL.md updates (`student-task-brief`, `canvas-week-plan`) | High | Low | Prompt-only; ships personalization without new subsystems |
| **3** | Course `prior_knowledge` + `student-course-arc` | High | Low–medium | Implements expertise reversal correctly (course-local) |
| **4** | Due-relative revisit nudges | Medium | Medium | Spacing without flashcard mismatch |
| **5** | Autonomy / chunk_size explicit signals | Medium | Medium | Only with clear UI — no fake proxies |
| **6** | Reflection line + FERPA psych-absence tests | Speculative / hygiene | Low | Zimmerman reflection; compliance hardening |

---

## Appendix — v1 → v2 delta

| Topic | v1 | v2 |
|-------|----|----|
| Evidence depth | Survey “greatest hits” | Meta-analyses with ES/CIs + contested flags |
| Schema | 3 global fields | Same 3 + course-scoped `prior_knowledge` convention |
| `record_signal` | Documented, unwired | Honest hook map; still unwired until format UI |
| Skills | week-plan only | Spec language for task-brief + course-arc |
| Spacing | Principle only | Explicit **no FSRS**; due-relative nudges instead |
| Procrastination | Implicit Top-3 | Implementation intentions in First step; shame ban |
| Growth mindset / WMC / anxiety | Mentioned loosely | Measured constructs evaluated; **excluded** from schema |
| Privacy | Bias-not-restrict asserted | Checked against inference/streaming concerns + FERPA test gap |

**Ready for review.** Approve Phase 0 before any Phase 1+ feature code.

---

## Implementation status (gap-close pass)

Shipped after the v2 design draft above (code, not research-only):

- **Verify checklist**
  - Browser: `cd app && npm run dev` → clear `pn_onboarded` → step 4 → Continue writes `localStorage.pn_learning_profile`.
  - Persistence: `python -m canvas_mcp.core.learning_profile --json save …` (same path Tauri invokes) writes YAML + `USER.md`. Tauri: `CARGO_TARGET_DIR=/tmp/productname-tauri-target npm run tauri -- dev`.
- **Richer games:** `app/src/components/learningProfile/*` — Game 1 try→confidence→reveal→react; Game 3 Top-3 cadence chips; autonomy forced choice unchanged.
- **`record_signal` producer:** CLI `signal` subcommand + `canvas-week-plan` format-feedback step (not RequestLog).
- **`check_depth`:** fourth schema field (`light`|`thorough`), onboarding confidence probe, week-plan shaping rule.
- **Dock retrieval session:** `learn_loop --json due|outcome` → Tauri `read_due_reviews` / `record_review_outcome`. Peek shows a check only when items are due. Optional `if_then` start line. A quiet brief-continuity line may be read; it is not a learning streak. No guilt interrupt, hearts, or leagues.
