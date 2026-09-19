# Evidence-grounded 5- and 10-minute university study sessions

**Status:** research and specification only. No product code was changed.  
**Search date:** 17 September 2026.  
**Authoring rule:** evidence first, then an optional repository comparison. Candidate techniques in the assignment brief are not treated as proven.  
**Independence:** this synthesis does not start from the current scheduler, dock copy, or Duolingo’s visual language. Where the existing product already matches the evidence, that is recorded later as a keep, not as a reason the evidence is true.

This is a **targeted evidence review**, not a PRISMA-complete systematic review of every named technique. Coverage, contradictory findings, and access limits are in §2 and Appendix A. Do not read this document as proof that a 5- or 10-minute session will raise exam grades.

---

## 1. Decision brief

### Strongest recommended approach

Build short sessions around **one complete learning cycle**, not around filling five minutes with cards.

A useful cycle is:

1. Name a **source-backed objective** (what the instructor’s materials actually make testable).
2. Require an **effortful attempt** before showing a solution (closed-book when retrieval is likely to succeed; open-book or a worked example when it is not).
3. Give **corrective, source-cited feedback**.
4. Record the attempt honestly: unassisted success, assisted success, answer exposure, skip, or interruption. **Do not treat same-session fluency as delayed retrieval.**
5. Schedule the **next independent attempt** using exam distance, not a flashcard forgetting-curve fit.

That cycle is the unit. Five minutes can hold **one** cycle if the item is a short constructed response, a faded example-plus-isomorph, or a two-concept contrast. Ten minutes can hold **two** short cycles, or **one** harder multi-step / transfer item with recovery time after a miss. If the real task is a long proof, a lab, or a full essay, the product should say so and offer a short entry step (outline, first claim, method selection) rather than fake a complete practice.

Method selection is gated by **prior knowledge of this claim**, not by a learner-style profile:

| Student state on this objective | First move | Why |
|---|---|---|
| Novice / no successful prior attempt | Worked example or heavily faded steps, then an isomorphic attempt | Expertise-reversal: high assistance helps low prior knowledge [C10][C11] |
| Partial / mixed prior attempts | Closed-book short constructed response + feedback; compare two confusable ideas if the error pattern is discrimination | Retrieval + comparison beat restudy for retention and near transfer [C1][C28] |
| Strong / recent delayed hit | Novel variant or method-selection among similar procedures | Independent problem solving beats extra examples once knowledge is present [C10]; interleaving helps when categories are confusable [C9] |
| Confident-but-wrong | Do not credit the hit. Corrective feedback, then a delayed independent retry, not an immediate “try again until green” | Immediate retry after answer exposure is not delayed retrieval [C24][C26][C27] |
| Repeated failure | Drop to a prerequisite or a worked example; if the question is ambiguous, abstain | Unsupported guessing can freeze errors; productive failure needs a longer generation-then-instruction design than 5 minutes [C13][C29] |

AI may **write explanations, hints, and candidate items** from permitted sources. It may not be treated as a calibrated grader, a coverage oracle, or a tutor that is allowed to emit full solutions on demand. Unguarded chat improves practice scores and can **hurt** later unaided exams [C14]. Guardrails (hints, no answer dump, teacher-authored or source-backed solutions in the prompt) remove most of that harm and still do not, in the best available field experiment, produce an exam gain over ordinary practice [C14][C15].

### Rejected alternatives

- **Flashcard SM-2 / FSRS / BKT as the exam engine.** Those models are built for repeated, uniformly scored items. University midterms are multi-step, sparsely practiced, and poorly calibrated from a handful of events. A transparent exam-capped expanding gap is the honest beta scheduler [C7][C23].
- **Unrestricted ChatGPT-style tutoring inside the session.** Practice inflation plus later exam harm [C14].
- **Productive-failure as a 5-minute protocol.** The effect depends on a generation phase plus later instruction that builds on student solutions [C13]. A short session can at most *start* generation.
- **Microlearning meta-analyses as a license for 5-minute mastery.** Heterogeneous, weakly randomized, and not equivalent to retrieval, spacing, or exam transfer [C20].
- **Assignment points as exam emphasis.** Not a validated proxy. Show source-backed scope and label inferred relevance separately [engineering hypothesis EH1].
- **Streak loss, hearts, leaderboards, shame, or payment pressure.** These measure return, not learning, and can distort what students practice [C19 context; qualitative gamification-misuse evidence].
- **VAK / meshing personalization** [C18].
- **“You are 73% exam-ready”** from speed, confidence, completion, or one session’s correctness [C26].
- **A second model agreeing as ground truth** [C21].

### Evidence confidence

| Claim cluster | Confidence for product use | What would raise it |
|---|---|---|
| Retrieval + feedback beats restudy for later recall of the practiced content | **High** for retention of tested material; **moderate** for transfer | Classroom trials vs authentic review (not rereading) on CU-like exams |
| Spacing / successive relearning across days beats one sitting | **High** for durable factual/conceptual recall; **moderate** for multi-step procedures | Direct successive-relearning trials on problem solving, not only key-term definitions |
| 5- or 10-minute *university exam* sessions as a unit | **Low as a duration claim.** The mechanisms can fit the clock; the duration itself is not the independent variable in the strong studies | Timed-session RCTs with delayed, closed-book, course exams |
| Guardrailed AI vs open chat | **Moderate-high** that open chat can harm later unaided performance; **low-moderate** that a productized 5-minute tutor will help exams | Replication in undergraduate courses with AI removed at test |
| Interleaving every session | **Low as a default.** Helpful for similar categories; null or reverse for some materials | Do not generalize Rohrer’s 7th-grade RCT or painting studies to every CU course |
| Self-score-only review of claims | **Low as a learning protocol.** Useful as a fallback when grading is uncertain | Need an actual attempt + external or source-backed check |

### Feasible for the first beta (5–10 testers, Mac-first, $50 hard cap)

Ship **one source-backed cycle** in a standalone desktop session:

- Student picks course + exam/checkpoint (or the app uses a dated catalog checkpoint).
- Show a short “Why this now?” that names the method and its uncertainty.
- Present **one** practice item with a visible source excerpt. Prefer instructor examples, permitted problem variants, or deterministic templates. Use a model only to paraphrase or to write a near-isomorph when the source is sufficient.
- Student attempts without the answer on screen.
- Feedback: deterministic check if possible; otherwise model-assisted rubric with **abstain**; student can mark “I disagree / this is ambiguous.”
- Persist local state. Offer a next independent date. Do not upload answers, scores, or course text to analytics.

Do **not** wait for knowledge tracing, item banks of 100, professional-context search on the critical path, or a character-driven lesson feed.

### What remains unknown

Whether these sessions change midterm scores; how often CU materials are rich enough to ground items; how to grade equivalent math and partial essays without false certainty; whether students will attempt before clicking hint; what happens after a missed week besides a non-punitive restart; and whether 5 minutes is below a useful minimum for the student’s actual exam format.

---

## 2. Evidence ledger and search log

### Method

**Questions.** Groups A–H in the assignment brief (mechanisms; duration and exam distance; selection/adaptation; feedback and grading; AI tutoring and grounding; motivation/accessibility; disciplines; 5–10 person pilot).

**Search date.** 17 September 2026.

**Tools.** Web search and full-text fetch of open PDFs / publisher HTML. No paper purchases. No student accounts. No human experiments. Synthetic examples only.

**Terms (representative).**  
`retrieval practice testing effect meta-analysis Rowland Adesope`; `Pan Rickard transfer test-enhanced learning`; `Agarwal classroom retrieval 2021`; `Cepeda spacing 2006 2008 optimal lag`; `successive relearning Rawson Dunlosky`; `interleaving Brunmair Richter Rohrer`; `expertise reversal Kalyuga Tetzlaff 2025`; `worked examples fading Renkl Atkinson`; `self-explanation Bisra 2018 Chi 1989`; `productive failure Sinha Kapur 2021`; `open-book closed-book Agarwal 2008`; `immediate delayed feedback Butler Metcalfe`; `GPT-4 tutoring Bastani 2024 2025 PNAS`; `Kestin AI tutor active learning`; `microlearning higher education meta-analysis`; `pedagogical agents Castro-Alonso`; `seductive details Harp Mayer`; `Pashler learning styles 2008`; `implementation intentions Gollwitzer Sheeran`; `LLM autograding algebra`; `OpenAI API pricing`.

**Inclusion.** Primary experiments, classroom trials, systematic reviews/meta-analyses, original methods papers, official API pricing, WCAG as an accessibility standard. University or late-secondary populations preferred; younger samples kept and labeled.

**Exclusion as efficacy evidence.** Marketing pages, competitor feature lists, vendor demos without outcome tests, VAK quizzes, invented citations.

**Abstract-only / paywalled (cannot carry a strong unique recommendation by themselves).** Rowland (2014) and Adesope (2017) full PDFs were not extracted this search; effect sizes below for those two are taken from abstracts plus independent secondary reports that quote the same figures (Schwieren et al., 2017, for Rowland’s 0.50 / 0.73 / 0.39 split). Brunmair & Richter (2019) full preprint PDF *was* obtained. Dunlosky et al. (2013) HTML was obtained. Bastani et al. PNAS/SSRN and Kestin et al. PMC were obtained.

**Double-counting rule.** Adesope (2017), Rowland (2014), Yang et al. (2021), and Agarwal et al. (2021) overlap in primary studies. They are treated as **one cluster** for retrieval, not four independent corroborations. Cepeda (2006) meta-analysis and Cepeda (2008) experiment are related but not the same dataset. Sinha & Kapur (2021) is the meta-analysis for productive failure; Kapur narrative chapters recycle it.

### Evidence table

| ID | Claim | Source (link / DOI) | Design / N / population | Comparator | Time-on-task / delay / transfer | Estimate | Applicability to CU 5–10 min sessions | Limitations | Confidence | Product decision |
|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Practice testing beats restudy on later retention | Rowland, 2014, *Psych. Bulletin* https://doi.org/10.1037/a0037559 ; Schwieren et al., 2017 https://doi.org/10.1177/1475725717695149 quoting Rowland | Meta of experimental testing vs restudy (Rowland: 61 studies; overall *d*≈0.50). Psychology-classroom meta 19 papers, 72 ES, *d*=0.56 | Restudy / no-test | Mostly laboratory verbal/prose; classroom subset in Schwieren | Feedback moderator: 0.73 with feedback vs 0.39 without (Rowland, as reported by Schwieren) | Strong for “attempt then feedback” as the default cycle | Full Rowland PDF not re-extracted; many lab tasks; overlapping later reviews | High for retention of practiced content | Default: retrieval with feedback, not reread-first |
| C2 | Practice testing vs broader controls, including classroom | Adesope et al., 2017 https://doi.org/10.3102/0034654316689306 ; Agarwal, Nunes & Blunt, 2021 https://doi.org/10.1007/s10648-021-09595-9 | Adesope: 118 articles / 272 ES (from abstract). Agarwal: 50 classroom experiments, 49 ES, *n*=5374 | Restudy and other nontesting conditions; classroom studies often vs rereading | Mixed delays and formats; Agarwal notes only 6% non-WEIRD | Agarwal: 57% of ES medium or large; Adesope pooled *g* not independently extracted from full PDF this search | Classroom retrieval is real, but many controls are weak | Agarwal themselves warn reread is not typical college teaching; Glaser-line work compares retrieval to structured review | Moderate-high that retrieval helps vs reread; lower vs good instruction | Do not advertise exam-grade lifts from one app session |
| C3 | Testing can transfer, but not automatically | Pan & Rickard, 2018 https://doi.org/10.1037/bul0000151 ; author manuscript https://psycnet.apa.org/manuscript/2018-20773-001.pdf | 192 ES, 122 experiments, 67 articles, *N*≈10,382–10,396 | Nontesting reexposure | Transfer across format, application/inference, medical diagnosis; weak to untested material and worked-example problem solving | *d*=0.40, 95% CI [0.31, 0.50]; PET-PEESE intercept often **no positive transfer** without response congruency, elaborated retrieval, and adequate initial success | A 5-min verbatim quiz will not cover a midterm’s novel problems | Transfer is near more than far; worked-example transfer subcategory is weak | Moderate | Require at least occasional novel variants; never equate card hits with exam transfer |
| C4 | Feedback timing is not a simple “always delay” rule | Butler, Karpicke & Roediger, 2007 PDF https://learninglab.psych.purdue.edu/downloads/2007/2007_Butler_Karpicke_Roediger_JEPA.pdf ; Metcalfe, Kornell & Finn, 2009 https://doi.org/10.3758/PBR.16.6.1110 (PDF accessed) | Lab MC feedback; child vs college vocabulary | Immediate vs delayed vs none | Delayed feedback often confounded with shorter lag-to-final-test | When lag is equated, delayed > immediate for Grade 6; **no difference for college students** in Metcalfe et al. | In a 5-min session, feedback should arrive **before the student leaves the item**, or it will not be processed | Classroom vs lab, MC vs SA, and lag-to-test confounds | Moderate | Immediate corrective feedback in-session; delayed *independent* success is a later session, not delayed feedback of the same answer |
| C5 | Effortful recall usually beats recognition as practice | Rowland, 2014 (as above); Glaser & Richter, 2022 https://doi.org/10.1080/20445911.2022.2085281 | Mixed; one university teaching paper argues SA helps and MC does not in that design | MC vs short-answer vs restudy | Delayed course-like tests | Mechanism: depth of retrieval; MC can be answered by familiarity | Short sessions should prefer constructed responses when grading is possible | Competitive MC with good lures can still be useful (Little et al. line; not fully re-extracted) | Moderate | Prefer short-answer / method-selection; use MC only for discrimination among confusable options, with feedback |
| C6 | Open-book practice ≈ closed-book+feedback on delayed tests | Agarwal, Karpicke, Kang, Roediger & McDermott, 2008 https://doi.org/10.1002/acp.1391 (PDF accessed) | Two undergrad experiments, prose passages | Restudy vs open- vs closed-book | 1-week delay; later replication at 2 weeks (Endres et al. line) | Initial open-book > closed-book; delayed tests equivalent **with feedback**; JOLs favored restudy (wrong) | Open-book is acceptable when closed-book would mostly fail; still require an attempt, not simultaneous hunting | Small lab passages; identical questions on delay in original | Moderate | Closed-book if a hit is plausible; otherwise example or open-book attempt, then later closed-book |
| C7 | Optimal spacing grows with retention interval | Cepeda et al., 2006 https://doi.org/10.1037/0033-2909.132.3.354 ; Cepeda et al., 2008 https://doi.org/10.1111/j.1467-9280.2008.02209.x (PDF: https://escholarship.org/content/qt0kp5q19x/qt0kp5q19x.pdf) | 2006: 839 assessments, 317 experiments, 184 articles. 2008: *N*>1350, facts, gaps to 3.5 months, tests to 1 year | Massed vs spaced; lag sweep | Final tests 7 to 350 days | For 7 / 35 / 70 / 350 day RIs, optimal gaps on the order of ~1 / 11 / 21 / 21 days; as a **proportion** of delay, ~20–40% at 1 week down to ~5–10% at 1 year | Use exam date as the retention interval. Cramming helps tomorrow and wastes two weeks from now | Verbal facts, not proofs; expanding vs equal spacing is a smaller, messier literature | High for “don’t mass everything”; moderate for any exact day count | Transparent expanding gaps capped by the exam; label 1/3/7-type numbers as **unvalidated product thresholds** |
| C8 | Successive relearning beats packing extra correct recalls into day 1 | Rawson & Dunlosky, 2011 https://doi.org/10.1037/a0023956 ; 2022 review https://doi.org/10.1177/09637214221100484 ; Vaughn, Dunlosky & Rawson, 2016 https://doi.org/10.3758/s13421-016-0606-y ; Higham et al. classroom (accepted MS accessed) | 2011: 533 students, >100k short-answer recalls, 1–4 month delays | Criterion 1–4 initial correct recalls × 1–5 relearning sessions | Durability vs efficiency (trials-to-criterion) | 2011 prescription: ~3 correct in session 1, then ~3 spaced relearns. 2022: 1 correct × 3 days beat 3 correct × 1 day (68% vs 26% at 1 week). Relearning **overrides** extra initial overlearning | The product’s value is returning tomorrow, not finishing a deck today | Mostly key-term definitions; classroom Higham work is closer but still recall-heavy | High for definitional/conceptual claims; moderate for procedures | Session goal: reach one honest success **or** a corrected miss, then stop. Do not grind to four hits tonight |
| C9 | Interleaving helps similar categories; it is not universal | Brunmair & Richter, 2019 https://doi.org/10.1037/bul0000209 (preprint PDF accessed); Rohrer et al., 2019/2020 RCT https://doi.org/10.1037/edu0000367 ; Foster et al. JRME interleaving failure (2024–25 line) https://doi.org/10.5951/jresematheduc-2024-0055 | Brunmair: 59 studies, 238 ES, 158 samples. Rohrer: 54 seventh-grade classes, 4 months + 1-month delayed unannounced test. Foster: two large school experiments on defined angle relations | Blocked vs interleaved | Inductive category learning vs math strategy selection | Overall *g*=0.42; paintings *g*=0.67; math *g*=0.34; **words *g*=−0.39** (blocking better); expository ns. Rohrer: 61% vs 38%, *d*=0.83. Foster: **no interleaving-over-blocking advantage** | Use interleaving when the student must **choose among similar methods**. Do not mix unrelated readings to “be evidence-based” | Rohrer is middle school, not CU. Foster challenges over-generalization. Spacing and interleaving are often confounded | Moderate, highly moderated | Interleave confusable problem types in 10-min sessions; never as a global default |
| C10 | Expertise reversal: help novices; extra help can cost experts | Tetzlaff, Brod et al., 2025 https://doi.org/10.1016/j.learninstruc.2025.102142 ; Kalyuga, 2007 https://doi.org/10.1007/s10648-007-9054-3 | 176 ES, 60 experiments, *N*=5924 | High vs low instructional assistance × prior knowledge | Mixed domains; weaker in some humanities / younger samples | Low prior + high assistance *d*=0.505; high prior + low assistance *d*=−0.428; **asymmetric** (helping novices matters more) | A 5-min quiz-first default is wrong for cold starts | Prior-knowledge measurement varies; not a trait score | High as an ATI | Course/claim-scoped novice vs experienced. Worked example first if no successful attempt exists |
| C11 | Worked examples and fading support skill acquisition | Chi et al., 1989 https://doi.org/10.1207/s15516709cog1302_1 ; Atkinson, Renkl & Merrill, 2003 https://doi.org/10.1037/0022-0663.95.4.774 ; Renkl & Atkinson fading papers | Protocol study (Chi: small *n* good vs poor students) + experimental fading | Example study vs problem solving vs faded steps | Acquisition of procedures | Good students self-explain; poor students copy. Fading plus self-explanation prompts helps the transition | 10-min novice math/science: example → faded step → isomorph. 5-min: example **or** faded attempt, not both plus transfer | Chi is observational; copying examples is the failure mode | Moderate-high | Never show the full solution and then mark a same-screen repeat as independent success |
| C12 | Prompted self-explanation has a moderate overall effect | Bisra, Liu, Nesbit, Salimi & Winne, 2018 https://doi.org/10.1007/s10648-018-9434-x (PDF accessed) | 69 ES, 64 reports, ~5,917 participants | With vs without SE prompts; also vs instructional explanations | Mixed tasks and durations | *g*=0.55; *g*=0.35 over instructional explanations (thesis/meta report) | Useful as a 30–60s prompt after an example, not as the whole session | Time cost; quality of explanations varies; pedagogical agents did not clearly boost the effect | Moderate | One focused “why this step?” prompt. Do not demand an essay before practice |
| C13 | Productive failure needs a real generation phase plus instruction | Sinha & Kapur, 2021 https://doi.org/10.3102/00346543211019105 | 166 comparisons, >12,000 participants (chapter summary of the same MA) | Instruction-first vs problem-solving-then-instruction | Conceptual knowledge and transfer | *d*/g ≈ 0.36 overall; up to ~0.58 at high PF fidelity | **Out of scope for 5 minutes.** A 10-minute session can at most collect two student methods, not run PF | Fidelity criteria include multiple representations, often group work, and instruction that uses student solutions | High that 5-min PF is a mismatch | If prior knowledge is near zero *and* time is 5 min, use a worked example, not unsupported failure |
| C14 | Unguarded generative AI can inflate practice and harm later unaided tests | Bastani et al., 2025, *PNAS* https://doi.org/10.1073/pnas.2422633122 | Field experiment, ~1,000 Turkish high-school math students; GPT-4 Base vs GPT Tutor vs no AI; later exam without AI | Practice with/without GPT; then closed exam | Practice performance vs post-removal exam | Practice: +48% Base, +127% Tutor vs control. Exam: Base **−17%** vs control; Tutor harm “essentially eradicated” but **no exam benefit** | Directly applicable to product design: no answer dump; hints; students copy when they can | High school, not CU; one subject; GPT-4 era; Tutor used teacher-authored guardrails | High for “no unrestricted solution chat” | Hints then reveal. Count reveal as answer exposure. Never let the model be present at a claimed mastery check |
| C15 | A heavily scaffolded GPT-4 tutor can beat an active-learning class *during the tutored lesson* | Kestin et al., 2025 https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/ | RCT, Harvard physics-style authentic class vs sequential AI tutor | In-class active learning | Learning during the activity; student ratings | Authors supplied **step-by-step solutions to the model**; sequential part gating; 83% rated explanations ≥ human instructors | Shows design quality matters. Does **not** show that runtime-generated solutions, or 5-min sessions, beat studying | Tutor had expert solutions in the prompt; not a test of exam performance after AI removal in the Bastani sense | Moderate as a design existence proof; low as a 5-min product claim | If a model gives feedback, put the source solution/rubric in the prompt. Do not let it invent the key |
| C16 | On-screen agents: small learning effect; simpler is better | Castro-Alonso, Wong, Adesope & Paas, 2021 https://doi.org/10.1007/s10648-020-09587-1 | 32 ES, *N*=2104 | With vs without pedagogical agent | Multimedia learning outcomes | *g+*=0.20 overall; 2D *g+*=0.38 vs 3D *g+*=0.11; motion/voice often **not** moderators | A moderate character is optional decoration, not a learning engine | Heterogeneous multimedia tasks, not timed exam prep | Moderate-low for including a character; high for not making it 3D/busy | Optional 2D character **outside** the problem area; static under reduced motion; never required to start practice |
| C17 | Interesting-but-irrelevant details hurt | Harp & Mayer, 1998 https://doi.org/10.1037/0022-0663.90.3.414 ; later seductive-details work e.g. https://pmc.ncbi.nlm.nih.gov/articles/PMC10176302/ | Four experiments, science text | With vs without seductive details | Recall and problem-solving transfer | Seductive details reduced main-idea recall and transfer; early placement worse | Character jokes, “fun facts,” and extra animation during the attempt are a risk under time pressure | Mostly text/multimedia lessons, not 5-min retrieval apps | Moderate-high | No decorative facts during the attempt. Professional-context blurbs are post-attempt and skippable |
| C18 | Matching “learning styles” to modality is not supported | Pashler, McDaniel, Rohrer & Bjork, 2008 https://doi.org/10.1111/j.1539-6053.2009.01038.x | Review of meshing designs | Style-matched vs unmatched instruction | Requires crossover ATI | Essentially no credible positive meshing evidence | Preferences can be accessibility/usability, not pedagogy | Does not forbid diagrams for spatial content (that is a content property) | High | No VAK quiz. Optional text/audio as access, not as a matched “style” |
| C19 | If–then plans help people start; they are not a learning effect | Gollwitzer & Brandstätter, 1997; Gollwitzer & Sheeran, 2006 meta (overview: https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf) | Multiple goal domains | Goal intention vs implementation intention | Initiation and shielding, not exam scores | Medium-to-large effects on goal attainment in the meta-analytic program (*d*≈0.65 reported in secondary summaries; derailment prevention *d*=0.77 in the overview) | Good for “when I open the app after dinner, I start the due check” | Effects need a strong existing goal; not a substitute for retrieval | Moderate for initiation UX | One student-authored if–then. No streak punishment after a miss |
| C20 | “Microlearning works in higher ed” is not a solid efficacy base | Senandheera et al., 2024 *JMTR* https://doi.org/10.4038/jmtr.v9i1.2 (PDF accessed) | SR/MA of micro vs “macro” learning | Conventional longer instruction | Post-test theory exams; I² very high | Mean difference 12.6 points, 95% CI 1.2–… ; **only two randomized studies**; high selection-bias risk; no practical-performance MA | Cannot justify 5-min sessions as an evidence-based *duration* | Heterogeneity, weak randomization, short follow-up | Low | Treat duration as a constraint. Put proven mechanisms inside it, or recommend a longer task |
| C21 | LLM grading of work is imperfect; agreement ≠ truth | EDM 2025 algebra autograder abstract https://educationaldatamining.org/EDM2025/proceedings/2025.EDM.poster-demo-papers.290/ ; other 2025–26 autograding preprints (mixed; some not peer-final) | GPT-4o vs human labels on shown algebra work | Human grades | Closed-ended math with work shown | High agreement in narrow closed-ended settings still leaves residual errors; open-ended and partial credit are policy-sensitive; models leak answers into “hints” | Never auto-advance stability on a model “correct” | Fast-moving literature; several sources are preprints | Moderate that we must abstain | Deterministic check → rubric+model with student review → abstain. Second model is not a tie-breaker for truth |
| C22 | Students mispredict what will stick | Agarwal et al., 2008 (C6): JOLs favored restudy; testing won at delay. Bastani et al., 2025: students who copied GPT did not perceive a learning loss | JOL / self-report vs delayed tests | Restudy vs test; AI vs no AI | Delayed or post-removal tests | Metacognitive illusion is the rule, not the exception | Self-score “Hit” without an attempt record is weak evidence | JOLs are a different construct from self-graded correctness | High | Record what happened (hint, reveal, skip). Do not show exam-readiness percents |
| C23 | Dense adaptive models need dense, comparable items | Corbett & Anderson BKT lineage; KT surveys e.g. https://arxiv.org/html/2105.15106v4 ; SM-2 is a 1987 heuristic, not a multi-step exam model | ITS with hundreds of comparable steps vs flashcard decks | Mastery thresholds | Calibration, not just AUC | With 0–4 events per claim, posterior “ability” is theater | Beta has sparse, heterogeneous attempts | Deep KT papers use large log datasets | High as a *negative* recommendation | No BKT/FSRS/IRT in v1. Simple rules + later calibration if data exist |
| C24 | Same-session success after feedback is not delayed retrieval | Follows from C1+C7+C8 (testing and spacing literatures distinguish acquisition from retention interval) | Conceptual, plus the product’s existing delayed-hit rule | Immediate restudy/retry vs later test | Retention interval is the point | Immediate restudy after a miss is useful encoding, not evidence the gap was survived | Must keep this distinction | Not a single numbered experiment | High as a design constraint | Immediate retry allowed for encoding; stability / “holding” only after a later independent attempt |
| C25 | Last-minute study is a different policy from spacing | Cepeda 2008: last presentation close to the test helps that test; long-term optimum is an earlier gap | Same | Cram vs spaced | Exam tomorrow vs exam in 3 weeks | A 10-min session the night before should **prioritize likely items**, not protect a 7-day gap | Do not run the long-term scheduler the night before a midterm | Opportunity cost: practicing one item means not scanning the rest | Moderate-high | Exam-distance modes: cram-prioritize vs space-relearn |
| C26 | Self-scoring and confidence are biased | C6 JOLs; general self-assessment literature (Dunning-Kruger as a caution, not a diagnosis). Speed is not mastery | Mixed | Self-score vs later test | — | Underconfident experts and confident novices both occur; we will not estimate a trait | Student marks are a signal, not a grade | No CU-specific data | Moderate | Allow self-score when the app abstains; never hide that it is self-score |
| C27 | Students use unconstrained AI as a crutch | Bastani et al. interaction analysis (C14): copy solutions; Tutor arm asked for help instead | Log analysis inside the RCT | Base vs Tutor prompts | Practice vs exam | Design of the interface changes behavior more than a pep talk | Hint ladder + disabled copy-the-final-answer | One school, one subject | Moderate-high | Graduated hints. Reveal is explicit. Assisted success stored separately |
| C28 | Comparison of confusable examples supports discrimination | Brunmair (C9) discriminative-contrast account; analogical encoding / comparison (Gentner line) as a related mechanism | Category-learning and case-comparison studies | Separate study vs side-by-side comparison | Transfer to new exemplars | Strongest when between-category similarity is high | 5-min “which method?” pair is a better use of time than two unrelated facts | Not every course has confusable categories | Moderate | If `kind=confusable`, prefer a contrast item over a third isolated fact |
| C29 | Generation without feedback can leave errors in place | Testing-effect literature: unsuccessful retrieval without feedback is weaker (Rowland feedback moderator; Kang/Roediger feedback papers) | Mixed | Test ± feedback | Later recall | Feedback is what repairs a miss | Never end a miss with “good try” and no correct idea | Feedback can also short-circuit struggle if shown too fast | Moderate-high | After ~45–90s of genuine attempt (or a student Help request), give a hint; after a second miss, show the sourced idea |
| C30 | Motion accessibility is a requirement, not a learning style | WCAG 2.2 Success Criterion 2.3.3 Animation from Interactions; 2.2.2 Pause, Stop, Hide; 1.4 contrast | Standard, not an RCT | — | — | Honor `prefers-reduced-motion`; don’t convey unique info by motion or color alone | Required for the beta UI | Not an effect size | High as engineering | Static alternatives; keyboard; no color-only hit/miss |

### Coverage checklist (groups A–H)

| Group | Disposition | Notes |
|---|---|---|
| A. Mechanisms | **Answered** with moderators | Retrieval, spacing, successive relearning, examples/fading, SE, comparison, error correction: used. Interleaving: conditional. Productive failure: not in 5 min. Generation: only with feedback. Elaboration: moderate, time-expensive. Mixed practice: for confusable procedures, not all content. |
| B. 5 / 10 min and exam distance | **Uncertain as a duration literature**; **answered as a design constraint** | No high-quality RCT of “exactly 5 vs 10 minutes” on university midterms. Timelines below use reading/thinking time, not model latency. |
| C. Selection and adaptation | **Answered with transparent rules**; **no suitable evidence** for stable trait inference or points-as-emphasis | Sparse-data rules only. Coverage uncertainty must be visible. |
| D. Feedback, hints, grading | **Answered** | Immediate in-session feedback; delayed independent success later; abstain path specified. |
| E. AI tutoring and grounding | **Answered** | Guardrails required. Grounding pipeline specified. Hallucination recovery in worked example 3. |
| F. Motivation, explanation, a11y | **Answered** | Autonomy, if–then, nonpunitive return. Character optional. No VAK. Reduced motion required. |
| G. Disciplines / formats | **Answered** | Differentiated. Honest about what short practice cannot capture. |
| H. 5–10 tester evaluation | **Answered as a feasibility pilot**, not efficacy | Opt-in counts cannot show learning. |

### Residual uncertainty (what would change recommendations)

- A preregistered CU-course RCT: guardrailed 10-min retrieval vs students’ usual review, delayed closed-book exam, AI absent at test. **If null**, keep the tool as a planner/explainer, not a tutor.
- If guardrailed AI still yields exam harm in undergraduates, **remove runtime generation** and use only human/source items.
- If Foster-style nulls dominate university math, **drop interleaving** except as student-chosen mixed problem sets.
- If self-explanation prompts consistently steal the attempt window, **cut them from 5-min** entirely.
- A retraction or major correction in Bastani or Pan & Rickard would reopen AI-openness and transfer claims.

---

## 3. Session blueprints

**Clock rule.** The minutes are a **budget and a promise about scope**, not a stopwatch that cuts a student off mid-equation. If they are still reasoning, the item finishes. The session then either becomes a 10-minute session, ends after that one cycle (useful early exit), or schedules the leftover cycle.

**Human time, not model time.** Read 150–250 words/min for a source excerpt; think 30–90s for a short answer; 2–4 min for a one-page quantitative isomorph; 20–40s to read feedback. Model latency is *in addition* and must be hidden behind already-visible work (the student should already be attempting, or the item should have been cached).

### 3.1 Five-minute cycle (target 300s) — one objective

| t (s) | Block | Student does | Max model calls |
|---|---|---|---|
| 0–20 | Why this now | Reads one sentence + optional “more” | 0 (precomputed) |
| 20–50 | Objective + 40–80 word source excerpt | Skims; may skip excerpt | 0 |
| 50–170 | Attempt (120s default) | Writes/selects without the answer | 0 |
| 170–220 | Feedback (50s) | Reads sourced check | 0–1 |
| 220–270 | Recovery **or** transfer probe (50s) | See branches | 0–1 |
| 270–300 | Close | Next review in plain language; stop is always available | 0 |

**If the attempt is still in progress at 170s:** do not auto-submit. Show “Need more time — that’s fine.” Options: continue (session becomes unbounded on this item), save draft and exit, or request a hint without scoring a miss yet.

### 3.2 Ten-minute session (target 600s)

**Shape A — two short cycles** (declarative / discrimination / small procedures): 30s why + 2 × (50s excerpt + 120s attempt + 50s feedback + 50s recovery) + 30s close = 600s.

**Shape B — one novice skill cycle:** 25s why + 100s worked example (student self-explains one marked step) + 90s faded step + 150s independent isomorph + 70s feedback + 80s correction / what to do tomorrow + 85s close = 600s.

**Shape C — exam tomorrow, prioritization:** 30s “this is last-minute coverage, not mastery” + 90s student-confirmed topic pick from source-backed list + 360s one cycle on the highest-uncertainty item (attempt + feedback + recovery) + 120s “what you did not cover” = 600s.

### 3.3 Branch paths (all must still yield a legal close)

| Path | What it means | Time handling | Persisted outcome |
|---|---|---|---|
| **Correct, unassisted** | Attempt before any hint/reveal; check says correct or student+source agree | Skip recovery or use it as a *different* near-transfer probe if ≥10 min | `unassisted_success`; next review by spacing rule |
| **Partial** | Right method, arithmetic slip, incomplete essay warrant | Spend recovery on the missing piece, not a new topic | `partial`; next review shorter; do not promote stability |
| **Wrong** | Incorrect method or concept | Feedback names the confusion; recovery is restudy of the sourced idea **or** a prerequisite fork | `miss`; next review soon; optional prerequisite flag |
| **Assisted** | Hint used, then correct | Allowed; clock uses hint time from the attempt budget | `assisted_success`; **not** a delayed-hit candidate |
| **Answer revealed** | Student asks to see the solution | Remaining time: one “explain this step” or a *later* independent isomorph, never a same-screen clone marked as independent | `answer_exposure` |
| **Skipped** | Student declines the item | Do not mark knowledge. Offer a different item or exit | `skipped`; coverage stays unknown |
| **Interrupted** | App backgrounded, crash, quit | Save draft attempt; do not score hit/miss | `interrupted`; resume same item |
| **Ambiguous / model unsure** | Rubric conflict, equivalent expression unknown, source contradiction | Show both the model guess and “we are not sure”; student self-score labeled as such | `uncertain`; no stability advance |
| **Early exit after one honest cycle** | Student stops at close of item 1 in a 10-min plan | Success. Do not guilt | Persist item 1 only |

### 3.4 When 5 minutes is the wrong tool

Say so, then offer an entry step:

- Long proof, lab technique, full essay, case write-up, multi-hour problem set: **entry** = method choice, thesis sentence, first lemma, or “which of these two procedures?”  
- Brand-new unit with no examples in sources: **read a sourced excerpt** (encoding), then schedule retrieval later. That is studying, not a fake quiz.  
- Exam in >2 weeks and the student has never seen the idea: 5-min retrieval of a never-encoded claim is mostly failed guessing [C13][C29].

---

## 4. Six fully worked synthetic sessions

All course text below is **fictional**, labeled `SYNTHETIC`. It is not CU Boulder content and must not be stored as if it were.

### 4.1 Novice quantitative — 10 minutes (Shape B)

**SYNTHETIC source excerpt** (instructor notes, APPM 1350-like): “The chain rule: if *y = f(u)* and *u = g(x)*, then *dy/dx = f'(u)·g'(x)*. Example: *y = (3x²+1)⁵*. Let *u = 3x²+1*, then *dy/dx = 5u⁴ · 6x*.”

**Objective.** Differentiate a composition *without* expanding, and identify inner vs outer.

**Method.** Worked example → faded inner function → independent isomorph. Reason: no prior delayed hit; expertise reversal [C10][C11].

**Prompt (faded).** “In *y = (sin x)⁴*, what is the inner function? Then write *dy/dx*.”

**Plausible student answer.** Inner = sin *x*; *dy/dx = 4 sin³ x*. (Forgot inner derivative.)

**Feedback.** “Outer power rule is right. Chain rule still multiplies by the inner derivative, *cos x*. Source: notes example structure, not a new theorem.”

**Follow-up (independent isomorph, remaining ~2.5 min).** *y = (2x+1)⁷*. Student includes *2*. Record `partial` then `assisted_success` if they used the just-shown reminder; schedule a **closed-book** isomorph in 1–2 days, not immediately as a clone.

**Persisted.** `claim_id=synth-chain-rule`; `assistance=example+corrective`; `outcome=partial`; `next_review=exam-relative +1d`; `stability` unchanged.

### 4.2 Partially prepared concept-science — 5 minutes

**SYNTHETIC source.** CHEM lecture: “Buffer: a weak acid and its conjugate base in comparable amounts. Adding strong acid: A⁻ consumes H⁺. Adding strong base: HA consumes OH⁻.”

**Objective.** Predict what species is consumed when a little strong acid is added to an HA/A⁻ buffer.

**Method.** Closed-book short answer + contrast with a common confusion (buffers as “neutral solutions”). [C1][C28]

**Prompt.** “A buffer of HF and F⁻ receives a small amount of HCl. Which species’ concentration drops first, and why? One to three sentences.”

**Plausible answer.** “pH stays 7 because it’s a buffer.” (confident-but-wrong)

**Feedback.** “Buffers resist pH change; they are not defined as pH 7. HCl’s H⁺ is taken up by F⁻, forming HF. Excerpt: ‘A⁻ consumes H⁺.’”

**Follow-up.** No same-session “hit.” Schedule delayed retry. Why-text: “You almost certainly *recognized* the word buffer; the exam will ask the reaction.”

**Persisted.** `outcome=miss`; `error_class=concept_confusion`; `next_review=+1d`; not a delayed hit.

### 4.3 Advanced student with a transfer gap — 10 minutes, plus AI failure

**SYNTHETIC source.** Physics homework: conservation of energy with friction; worked example is a block sliding down a *frictionless* ramp into a spring.

**Objective.** Decide whether mechanical energy is conserved when kinetic friction is present, and set up the correct work–energy statement.

**Method.** Novel variant (friction on), method selection. Student has delayed hits on the frictionless case.

**Prompt.** “Same block, but μ_k = 0.2 on the ramp. Can you use ½mv² + mgh + ½kx² = constant? If not, write the replacement equation in words or symbols.”

**Plausible answer.** Uses conservation anyway.

**Feedback (good path).** “Friction does non-conservative work. ΔE_mech = W_nc = −f_k d.”

**AI failure (required recovery).** The model writes: “Include friction as a potential μmgx, like a conservative force.” That contradicts the source example’s energy accounting.

**Recovery.** Grounding check: `potential μmgx` is **not** in the source excerpt and violates “non-conservative work.” UI: “This explanation does not match your notes. Using the notes instead.” Student sees the sourced equation. Persist `model_mismatch=true`. Item still usable. Do **not** store the bad physics as a rubric.

**Persisted.** `outcome=miss` or `partial`; `transfer_variant=friction`; `grader=source_override`.

### 4.4 Essay student — 5 minutes

**SYNTHETIC source.** WRTG rubric: “Claim must be contestable. Each body paragraph: claim, evidence, warrant. Evidence without a warrant is a list.”

**Objective.** Produce a contestable thesis and one warrant, not a full draft.

**Method.** Generation of a thesis + self-explanation of why it is contestable [C12], with a sourced rubric check. A 5-minute session **cannot** practice a 1500-word essay [G].

**Prompt.** “In one sentence, state a contestable claim about the assigned article. Then one sentence: what would a reasonable reader say against it?”

**Plausible answer.** “The article was interesting and talked about social media.” (not contestable)

**Feedback.** Rubric: not contestable; no opposing reader. Show a *pattern* (“X is untrue because…”), not a ghostwritten thesis for the real article if that would complete graded work. If the assignment is a live graded draft, stay process-level.

**Follow-up.** Student revises the thesis. Record `partial`. Next: bring one quotation and write the warrant (10-min session).

**Persisted.** `outcome=partial`; `format=constructed_short`; `graded_work_risk=true` (process help only).

### 4.5 Exam tomorrow — 10 minutes (Shape C, not a spacing policy)

**SYNTHETIC.** Midterm 08:00 tomorrow. Catalog lists three instructor learning objectives; student has delayed hits on 1–2, never attempted 3 (series vs parallel circuits).

**Why this now.** “Exam is <24h. This is **coverage triage**, not a long-term spacing plan [C25]. We will not pretend one cycle equals a grade.”

**Selection.** Highest uncertainty among *source-backed* objectives: series vs parallel current. Assignment points are shown as “homework weight, not confirmed exam weight.”

**Prompt.** “In a series circuit, if one bulb burns out, what happens to the others, and why (current path)?”

**Answer / feedback.** Standard series-current account from the lecture slide excerpt.

**Close.** “You practiced 1 of 3 sourced objectives. The other two were previously retrieved. Sleep and a formula sheet beat a second hour of new topics” (advice, not medical; not a treatment claim).

**Persisted.** `mode=cram_prioritize`; do not lengthen gaps tonight.

### 4.6 Returning after a missed week — 10 minutes

**Context.** No punitive copy. No “you broke a streak.”

**Why.** “Nothing is lost as a score. We do not know what still retrieves after the gap. One diagnostic, then one repair [C8][C19].”

**Diagnostic (closed-book, 3 min).** Previously “holding” claim: definition of p-value.

**Student miss.**

**Repair.** Short sourced restatement + one new sentence in the student’s words (self-explanation) + schedule relearn in 2–3 days, not a 20-item backlog.

**If they skip.** `skipped`; still offer a tiny if–then: “If I sit down with coffee, I will do one check.”

**Persisted.** `stability` demoted or left fragile; `missed_days` is **not** a punishment multiplier. Next review sooner because of the miss, not because of calendar shame.

---

## 5. Decision policy

Inputs available in beta (all local unless noted):

- Checkpoint/exam date if present in the course catalog (`checkpoint_due`).
- Source records: syllabus sentences, assignment descriptions, instructor objectives, student-permitted notes (provenance required).
- Prior attempts: outcome, assistance level, timestamp, same-session flag.
- Student choice: skip, more time, “quiz me,” “show an example.”
- Available minutes: 5, 10, or “this may need longer.”
- **Not** inputs: assignment points as exam probability; email/calendar unless the student explicitly pulled a relevant exam date; OAuth tokens; a personality vector.

Unvalidated thresholds (engineering hypotheses, **not** findings): `DUE_REVIEW_LIMIT`-style caps; gap sequence 1 then 3 then 7 days; “45–90s struggle then hint”; two cycles per 10 minutes. They exist to bound the product. They are labeled in UI as product rules.

```
function choose_session(student, course, now):
  if no_source_backed_objective(course):
    return MissingSource(help="Import/sync notes or pick a lecture excerpt. We will not invent exam coverage from a title.")

  exam = nearest_checkpoint(course)
  horizon = days_until(exam)  # may be unknown

  mode = "space_relearn"
  if horizon is not None and horizon <= 1:
    mode = "cram_prioritize"
  elif horizon is not None and horizon <= 3:
    mode = "near_exam_mix"  # still retrieve, bias to weak/unseen sourced objectives
  elif returning_after_gap(student):
    mode = "restart_one_diagnostic"

  pool = objectives with provenance in {syllabus, instructor_objective, lecture, permitted_notes}
  pool = exclude(live_graded_assessment_keys, lti_proctored)

  item = select_item(pool, mode)
  method = select_method(item, student.history[item])
  return Session(item, method, mode, why=explain(method, mode, uncertainty=True))


function select_item(pool, mode):
  if mode == "cram_prioritize":
    return first of: never_attempted_sourced, recent_miss, oldest_due
  if mode == "restart_one_diagnostic":
    return last_holding_or_fragile_claim or first_sourced_objective
  # space_relearn
  due = items with next_review <= today, exam-capped
  prefer confusable pair if two siblings due [C28]
  if due empty and exam in > 7 days:
    return EncodeOffer("No retrieval due. A short encoding from notes is optional; we will not quiz a never-seen claim.")
  return due[0]


function select_method(item, hist):
  if student.requested_format: honor unless it would skip all retrieval in a 10-min experienced session
  if hist.successful_delayed_hits >= 1 and item.kind in {procedural, confusable}:
    return independent_variant_or_interleave
  if hist.attempts == 0 or hist.only_misses:
    if item.kind == procedural: return faded_example_then_isomorph  # 10 min preferred
    if minutes == 5: return example_or_open_book_attempt
    return worked_example_then_attempt
  if hist.confident_wrong:
    return contrast_item_plus_corrective
  return closed_book_short_answer


function score_attempt(attempt, item):
  if deterministic_match(attempt, item.key):  # numeric, MC, exact term
    return grade(unassisted=not attempt.used_hint)
  if equivalent_math_unknown:
    return abstain("Could be equivalent; check the sourced steps")
  if model_grade:
    if not citation_supports_claim(model.feedback, item.sources): discard_model; return abstain
    return model.proposal + student_confirm
  return student_self_score_labeled


function next_review(item, outcome, mode, exam):
  if mode == "cram_prioritize":
    return None if exam < 12h else exam - 2h  # unvalidated
  if outcome in {unassisted_success} and not same_session_after_reveal:
    gap = expand(item.gap)  # e.g. 1→3→7, CAP at exam - 1 day  [unvalidated]
    return min(now+gap, exam-1d)
  if outcome in {miss, partial, assisted_success, answer_exposure}:
    return now + 1d  # unvalidated; sooner than a hit
  if outcome in {skipped, interrupted, uncertain}:
    return now  # still due; no knowledge credit


function stop_rules(session):
  if student.stop: persist interrupted-or-complete; never mark hit
  if one_cycle_complete and minutes_target == 5: close
  if two_cycles_complete or one_shape_B_complete: close
  if budget_or_timeout: switch to cached item or self-score; explain outage
```

**Daily/weekly (beyond one session).** Successive relearning, not a daily quota [C8]. Aim for **another independent attempt** on fragile claims before the exam, with gaps widening when unassisted delayed hits occur. Empty days are allowed. After a miss week, one diagnostic beats a backlog. Do not invent checks to keep a habit metric alive.

**Deterministic vs model-driven.** Selection, scheduling, assistance tagging, and stop rules are deterministic. Item phrasing, feedback prose, and equivalent-answer guesses may be model-driven **behind** source checks.

---

## 6. Content contract

Keep the persisted object small. Every field must change a later decision or an honest explanation. Learning state is **local**. Opt-in analytics, if any, are **counts only** (session_started, session_completed, session_failed_budget, skip_count) with **no free text**.

| Field | Why it exists | Local? | Export default |
|---|---|---|---|
| `objective_id`, `claim` | What is being practiced | Local | Never auto-export |
| `provenance[]` {source_id, locator, excerpt_hash, captured_at} | Grounding; stale-date checks | Local | Never |
| `coverage_basis` = `source_backed` \| `inferred_from_title` \| `student_nominated` | Stops fake exam maps | Local | Never |
| `item_stem`, `item_kind`, `template_id` | The actual prompt | Local; cache stem **without** key on disk in a reveal-safe way | Never |
| `rubric_short` / `canonical_key` | Checking | Local; treat as a spoiler | Never |
| `hint_level_available` | Graduated help | Local | Never |
| `attempt[]` {t, text_or_hash, assistance, outcome, same_session} | Distinguishes C24 | Local; prefer hash if worried about disk sync | Never |
| `outcome`, `assistance` | Scheduler + copy | Local | Never |
| `confidence_limit` enum | What we may say | Local | Never |
| `next_review_at`, `checkpoint_due` | C7/C8/C25 | Local | Never |
| `why_selected` (short string from a template, not a model essay) | Explanation | Local | Never |
| `model_mismatch` bool | Recovery | Local | Never |

**Do not persist:** raw email/calendar content, tokens, full OCR dumps once an excerpt_hash exists, model chain-of-thought, “exam readiness %,” analytics of answers.

**Spoiler rule.** Cached upcoming items may store stems. Keys/rubrics live in a separate local store not rendered until reveal/feedback.

**Prevent accidental export.** No “share progress” that attaches `attempt` text. Beta analytics allowlist has no properties beyond enumerated event names and integer counters.

---

## 7. UI / copy specification

### Why this now (templates, not persuasion science)

- Retrieval: “You’re practicing from memory because that usually beats rereading for this kind of fact. It will not by itself predict the exam.” [C1][C3]
- Example-first: “This idea has no successful attempt yet, so we start with a sourced example rather than a cold quiz.” [C10]
- Cram: “The exam is tomorrow, so this is triage of sourced objectives, not a long-term study plan.” [C25]
- Uncertain coverage: “This is inferred from the assignment title, not from an instructor objective. Treat it as a guess.”
- Interleave: “These two problem types are easy to mix up, so they are paired.” [C9]

Avoid: “our algorithm knows how your brain works”; “scientifically proven 5-minute mastery”; “Duolingo for organic chemistry.”

### Honest progress

- “Delayed retrieval signal — not exam readiness.”
- “Assisted success — we’ll ask this again later without a hint.”
- “We could not check this answer automatically.”

### Missing source

Title: “No practice yet — we don’t have a source.”  
Body: “Sync Canvas or paste a lecture excerpt. We will not generate an exam outline from the course name.”

### Controls (always visible, never punitive)

- **Help** (graduated hint; tags `assisted`)
- **Skip** (no knowledge credit)
- **Reveal** (answer exposure; confirm)
- **Not sure / disagree** (uncertain)
- **Stop** (interrupt save)
- **More time** (do not auto-cut)

### Finish / interrupt / latency

- Finish: what happened + when a later independent try is due + what was **not** covered.
- Interrupt: “Saved mid-attempt. Not scored.”
- Latency: skeleton of the stem from cache; spinner only on feedback. If >8s, “Continue without AI check” → self-score.
- Offline: cached cycle or encoding from local excerpt; no fake coverage.
- Budget failure: “Practice still works from saved items. Explanations may be limited.”

### Animation

**Use motion** only to show state change (item complete, hint expanding) and keep it short.  
**Do not use motion** during the attempt, to display unique information, or to celebrate a self-score as mastery.  
**Reduced motion:** instant state swap; character static or hidden; no parallax.

### Character

Optional, 2D, out of the problem column [C16][C17]. No talking during the attempt. Not a grader.

---

## 8. Implementation priorities

Relative complexity: **S** small, **M** medium, **L** large. No calendar dates.

### Required for beta

| Work | Complexity | Notes |
|---|---|---|
| Standalone session that does not need an external coding agent | L | Skills today still assume a live agent [repo] |
| Source-backed objective → one item → attempt → feedback → persist | M–L | Review UI currently self-scores claims without a stem [repo] |
| Assistance tagging + delayed vs same-session | S | Keep existing learn-loop distinction [C24] |
| Missing-source and inferred-coverage states | S | |
| Hint / skip / reveal / stop / more time | S–M | |
| Timeout, offline cache, budget cap | M | |
| Reduced motion, keyboard, contrast | M | |
| “Why this now?” templates | S | |
| Spending controls on the funded relay | M | Policy already stated; not treated as implemented |

### Next iteration

| Work | Complexity |
|---|---|
| Two-cycle 10-min Shape A; novice Shape B | M |
| Confusable contrast items | M |
| Deterministic math equivalence (CAS) before any model grade | L |
| Student-nominated objectives | S |
| Optional 2D character with static alt | S |
| Local-only evaluation view for the student | M |
| Exam-tomorrow triage mode | S |

### Do not build yet

Knowledge tracing / FSRS / IRT; productive-failure generator; professional-context live search **on the 5-min critical path**; leaderboards; streak loss; auto email reminders; exam-readiness percentages; runtime item banks from titles only; second-model “consensus grading”; uploading answers for research.

### Model-call budget and cost formula

Fetched **17 September 2026** from [OpenAI API pricing](https://developers.openai.com/api/docs/pricing):

| Model (standard, short context) | Input / 1M | Cached input / 1M | Output / 1M |
|---|---|---|---|
| `gpt-5.6-luna` | $0.20 | $0.02 | $1.20 |
| `gpt-5.6-terra` | $2.00 | $0.20 | $12.00 |
| `gpt-5.6-sol` | $4.00 | $0.40 | $20.00 |

Provider retention is **not** zero just because this product does not store content. Disclose that separately.

**Hard session budget (product rule, unvalidated but binding):**

- ≤ **2** model calls in a 5-min session, ≤ **3** in 10-min.
- ≤ **8,000** input tokens and ≤ **1,000** output tokens per call.
- Default `luna`. `terra` only for abstain-or-grade on constructed responses. Never dump a full course corpus.
- If the relay is over cap: cached/self-score path.

**Cost per call:**  
`USD = (T_in / 1e6) * P_in + (T_out / 1e6) * P_out`  
(plus cache-write/cached-input terms if prompt caching is used).

**Week-scale illustration (not a promise):** 8 testers × 2 sessions/day × 7 days × 2 `luna` calls × (8k×0.20 + 1k×1.20)/1e6 ≈ **$0.63**. The budget dies if someone sends 50k-token note dumps on `sol` (`50k × $4 / 1e6 = $0.20` **per call**). Context caps are the real control. Use **$50** as the first-week hard cap.

---

## 9. Acceptance scenarios

Software tests ≠ pedagogical validation.

### Learning-state integrity

- **Given** a same-session hit after a hint, **when** stability is computed, **then** it does not advance to a delayed-hit rung.
- **Given** a delayed unassisted hit, **when** recorded, **then** next_review expands and is still capped before checkpoint.

### Hints vs independent success

- **Given** Help was used, **when** the answer is correct, **then** outcome is `assisted_success` and copy does not say the student retrieved it independently.

### Grading uncertainty

- **Given** an equivalent-looking math expression the checker cannot prove, **when** feedback is shown, **then** UI abstains and offers labeled self-score.
- **Given** two defensible essay warrants, **when** the model prefers one, **then** student can mark disagree without a miss.

### Sources

- **Given** only a two-word assignment title, **when** session starts, **then** inferred label or missing-source, never an authoritative exam map.
- **Given** a stale `checkpoint_due`, **when** catalog refresh disagrees, **then** dates reconcile before “exam tomorrow” mode.

### Accessibility

- **Given** `prefers-reduced-motion`, **when** a cycle completes, **then** no decorative animation and no information lost.
- **Given** keyboard-only, **when** attempting, **then** all controls in §7 are reachable.

### Interruption / retries

- **Given** quit mid-attempt, **when** relaunch, **then** draft restores and is not auto-scored.
- **Given** immediate retry after reveal, **when** scored, **then** not a delayed hit.

### Rescheduling / privacy / budget

- **Given** a miss after a week away, **when** copy renders, **then** no streak-loss language.
- **Given** analytics opt-in, **when** an event fires, **then** payload has no stem, answer, or course title.
- **Given** weekly cap reached, **when** the student starts a session, **then** cached path works and the failure is explained.
- **Given** email/calendar was processed by cloud AI, **when** logs are inspected, **then** content is absent from our service storage (requirement; verify in release tests).

### Pedagogical validation (cannot pass in CI)

Willingness to return, delayed retention, and transfer require a separate consented study. Five satisfied testers do not show efficacy [H].

---

## 10. Critical review

### Strongest counterargument

The recommendation may **overfit laboratory retrieval** (short answers, restudy controls, delayed recall of the same items) while university midterms reward integration, novel problems, and instructor-specific form. Pan & Rickard’s bias-corrected intercept is a warning: without elaboration, success, and response congruence, transfer can vanish [C3]. A polished 5-minute cycle could become a new form of rereading: students click through sourced snippets, request hints, and feel productive. Bastani shows that **feeling successful during practice is compatible with worse exams** [C14].

A second counterargument: successive-relearning prescriptions (three relearns to criterion) **do not fit** a 5-minute, two-item product. If students only ever do one cycle per claim, we will not have implemented the very literature we cite [C8].

### Plausible failure modes

1. Empty or title-only Canvas sites → sessions refuse, testers call the app empty.  
2. Students reveal immediately to save time.  
3. Model contradicts notes; if override is weak, we teach errors.  
4. 5-minute promise truncates thinking (if engineers implement a hard timer).  
5. Self-score inflation on the abstain path.  
6. Cost blow-up from pasting whole readers into the relay.  
7. Selection bias: the 5–10 testers are friends who already like retrieval.

### If development time halves

Keep: missing-source honesty; one sourced attempt; hint/reveal tagging; delayed vs same-session; offline self-score; why-template; budget cap.  
Cut: second cycle, character, interleave pairing, model grading, Shape B fading, professional context, any dashboard beyond “next review date.”

### Unresolved research questions

Minimum useful session length for multi-step STEM; open-book vs closed-book in *this* UI; how often CU exams match short constructed responses; whether if–then copy increases starts without reducing attempt quality; grading of symbolic math without CAS.

---

## Appendix A — Search log (condensed)

| Query cluster | What it yielded | Access notes |
|---|---|---|
| Retrieval metas | Rowland 2014; Adesope 2017; Schwieren 2017; Agarwal 2021; Pan & Rickard 2018 | Rowland/Adesope full PDFs paywalled this search |
| Spacing / SR | Cepeda 2006/2008; Rawson & Dunlosky 2011/2022; Vaughn 2016; Higham MS | 2008 PDF open; 2011 abstract |
| Interleaving | Brunmair preprint; Rohrer RCT PDF; Foster JRME null | Good contradictory set |
| Examples / SE / PF / ER | Chi 1989; Bisra 2018 PDF; Sinha & Kapur 2021; Tetzlaff 2025 abstract | Tetzlaff full PDF not obtained; numbers from abstract |
| Feedback / format | Butler 2007 PDF; Metcalfe 2009 PDF; Agarwal 2008 PDF; Glaser 2022 | Strong primary access |
| AI tutors | Bastani PNAS 2025; Kestin PMC 2025; SSRN twin | High-value full text |
| Microlearning | Senandheera 2024 PDF | Used as a *negative* quality example |
| Agents / seductive / styles | Castro-Alonso 2021; Harp & Mayer; Pashler 2008 | Agent MA HTML |
| Grading LLMs | EDM 2025 + preprints | Treat as immature |
| Pricing | OpenAI developers pricing page, 2026-09-17 | Dated official |

**Not accessed:** paid SAGE/APA PDFs for several metas; unpublished CU exam items; any student inbox.

**Not found as a literature:** high-quality RCTs of 5-minute *university exam-prep apps* with delayed closed-book outcomes. That absence is the duration finding.

---

## Appendix B — Repository comparison (after independent synthesis)

Read (docs/code, not inboxes/credentials): `AGENTS.md`; `skills/_SESSION.md`; `docs/handoff/student-beta-2026-09-17.md`; `docs/design/study-optimizer-architecture-2026-09-13.md` (incl. path D); `docs/design/learning-profile.md`; `docs/research/engagement-mechanics-fit-audit.md`; `src/canvas_mcp/core/learn_loop.py`; `teach_hint.py`; `app/src/components/ReviewSession.tsx`; `Top3Sticky.tsx`; `skills/student-course-arc/SKILL.md`; `skills/student-concept-visual/SKILL.md`. `docs/architecture.md` and `learning-program-audit-2026-09-08.md` were not fully re-read this pass; `prompt_assembly.py` and `learning_profile.py` were not line-audited beyond cross-references. If a feature is only documented, it is not counted as implemented.

| Recommendation | Mapping | Evidence in repo |
|---|---|---|
| Delayed vs same-session evidence | **Keep** | `learn_loop.py` header and `record_outcome`; ReviewSession passes `same_session=false` for dock checks |
| Exam-capped expanding gaps, not SM-2/FSRS | **Keep** | `learn_loop.py` comments; learning-profile v2 |
| No VAK | **Keep** | `learning-profile.md` §0 |
| No streak-loss / no losable learning streak | **Keep** | engagement audit; habit copy is brief continuity |
| `practice_format` as start bias, retrieval still happens | **Keep** | `teach_hint.py` |
| Vague claims rejected | **Keep** | `_VAGUE_CLAIM_PREFIXES` |
| Confusable items grouped | **Keep, narrow** | `due_reviews` / confusable markers — use for contrast items, not keyword “derivative” false positives |
| Two due items = 5/10 minutes | **Modify** | `DUE_REVIEW_LIMIT = 2`; `checkSessionLabel` maps 1→~5 min, 2→~10 min. Independent rec: **one complete cycle** can fill 5 min; two *claims* without stems are not two cycles |
| Self-score Hit/Partial/Miss as the session | **Modify** | `ReviewSession.tsx` has no item stem, rubric, hint ladder, or source excerpt |
| “Start N checks” CTA | **Modify** | Fine as entry; body must become attempt+feedback |
| Claim extraction from titles with `(inferred)` | **Keep + tighten in session** | course-arc / study-optimizer path A — session must not drop the tag |
| Professional context live search on first presentation | **Intentionally exclude from 5-min critical path** | Path C in study-optimizer — seductive-detail + latency + cost [C17] |
| Cross-course linking | **Intentionally excluded** (already parked) | study-optimizer §B |
| Skills as the tutor | **Missing in the standalone app** | `_SESSION.md` and course-arc still assume an external agent with tools. Beta release checks require a session without that agent |
| Objective → grounded practice → feedback | **Missing** as an integrated desktop path | student-beta handoff table already flags this |
| Assistance levels (hint/reveal) | **Missing** in ReviewSession | outcomes are only miss/partial/hit/skipped |
| Abstain / model-mismatch | **Missing** | |
| Exam-tomorrow vs space-relearn modes | **Missing** as explicit modes | gaps exist but cram-prioritize copy is not specified |
| Character / playful motion | **Do not reverse-engineer from Duolingo**; add only as optional, reduced-motion-safe | Not required by evidence [C16] |
| Cloud AI with no service-side persistence | **Keep as policy**; verify in code later | student-beta 2026-09-17 |
| Usage-count-only analytics | **Keep** | same |
| Canvas submit/comment/discussion execute | **Intentionally excluded** | AGENTS.md / pivot |

**Immediate vs delayed retrieval:** this spec **does not** propose collapsing them. Same-session retry after feedback is encoding, not a delayed hit.

---

## Appendix C — Bibliography (used, not padded)

1. Agarwal, P. K., Karpicke, J. D., Kang, S. H. K., Roediger, H. L., & McDermott, K. B. (2008). Examining the testing effect with open- and closed-book tests. *Applied Cognitive Psychology, 22*(7), 861–876. https://doi.org/10.1002/acp.1391  
2. Agarwal, P. K., Nunes, L. D., & Blunt, J. R. (2021). Retrieval practice consistently benefits student learning: A systematic review of applied research in schools and classrooms. *Educational Psychology Review, 33*, 1409–1453. https://doi.org/10.1007/s10648-021-09595-9  
3. Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Review of Educational Research*. https://doi.org/10.3102/0034654316689306  
4. Atkinson, R. K., Renkl, A., & Merrill, M. M. (2003). Transitioning from studying examples to solving problems. *Journal of Educational Psychology, 95*(4), 774–783. https://doi.org/10.1037/0022-0663.95.4.774  
5. Bastani, H., et al. (2025). Generative AI without guardrails can harm learning: Evidence from high school mathematics. *PNAS*. https://doi.org/10.1073/pnas.2422633122  
6. Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., & Winne, P. H. (2018). Inducing self-explanation: A meta-analysis. *Educational Psychology Review, 30*, 703–725. https://doi.org/10.1007/s10648-018-9434-x  
7. Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning and its moderators. *Psychological Bulletin, 145*(11), 1029–1052. https://doi.org/10.1037/bul0000209  
8. Butler, A. C., Karpicke, J. D., & Roediger, H. L. (2007). The effect of type and timing of feedback on learning from multiple-choice tests. *Journal of Experimental Psychology: Applied*. PDF: https://learninglab.psych.purdue.edu/downloads/2007/2007_Butler_Karpicke_Roediger_JEPA.pdf  
9. Castro-Alonso, J. C., Wong, R. M., Adesope, O. O., & Paas, F. (2021). Effectiveness of multimedia pedagogical agents predicted by diverse theories: A meta-analysis. *Educational Psychology Review*. https://doi.org/10.1007/s10648-020-09587-1  
10. Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin, 132*(3), 354–380. https://doi.org/10.1037/0033-2909.132.3.354  
11. Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science, 19*(11), 1095–1102. https://doi.org/10.1111/j.1467-9280.2008.02209.x  
12. Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989). Self-explanations: How students study and use examples in learning to solve problems. *Cognitive Science, 13*(2), 145–182. https://doi.org/10.1207/s15516709cog1302_1  
13. Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students’ learning with effective learning techniques. *Psychological Science in the Public Interest, 14*(1), 4–58. https://doi.org/10.1177/1529100612453266  
14. Glaser, J., & Richter, T. (2022). Practicing retrieval in university teaching: short-answer questions are beneficial, whereas multiple-choice questions are not. *Journal of Cognitive Psychology*. https://doi.org/10.1080/20445911.2022.2085281  
15. Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis. *Advances in Experimental Social Psychology, 38*, 69–119. (Overview used: https://cancercontrol.cancer.gov/sites/default/files/2020-06/goal_intent_attain.pdf)  
16. Harp, S. F., & Mayer, R. E. (1998). How seductive details do their damage. *Journal of Educational Psychology, 90*(3), 414–434. https://doi.org/10.1037/0022-0663.90.3.414  
17. Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. *Educational Psychology Review, 19*, 509–539. https://doi.org/10.1007/s10648-007-9054-3  
18. Kestin, G., et al. (2025). AI tutoring outperforms in-class active learning. *Scientific Reports* (PMC). https://pmc.ncbi.nlm.nih.gov/articles/PMC12179260/  
19. Metcalfe, J., Kornell, N., & Finn, B. (2009). Delayed versus immediate feedback in children’s and adults’ vocabulary learning. *Psychonomic Bulletin & Review, 16*, 1041–1046. PDF accessed via author copy.  
20. Pan, S. C., & Rickard, T. C. (2018). Transfer of test-enhanced learning: Meta-analytic review and synthesis. *Psychological Bulletin, 144*(7), 710–756. https://doi.org/10.1037/bul0000151  
21. Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and evidence. *Psychological Science in the Public Interest, 9*(3), 105–119. https://doi.org/10.1111/j.1539-6053.2009.01038.x  
22. Rawson, K. A., & Dunlosky, J. (2011). Optimizing schedules of retrieval practice for durable and efficient learning. *Journal of Experimental Psychology: General, 140*(3), 283–302. https://doi.org/10.1037/a0023956  
23. Rawson, K. A., & Dunlosky, J. (2022). Successive relearning. *Current Directions in Psychological Science*. https://doi.org/10.1177/09637214221100484  
24. Rohrer, D., Dedrick, R. F., Hartwig, M. K., & Cheung, C.-N. (2020). A randomized controlled trial of interleaved mathematics practice. *Journal of Educational Psychology, 112*(1), 40–52. https://doi.org/10.1037/edu0000367  
25. Rowland, C. A. (2014). The effect of testing versus restudy on retention. *Psychological Bulletin, 140*(6), 1432–1463. https://doi.org/10.1037/a0037559  
26. Schwieren, J., Barenberg, J., & Dutke, S. (2017). The testing effect in the psychology classroom: A meta-analytic perspective. *Psychology Learning & Teaching, 16*(2). https://doi.org/10.1177/1475725717695149  
27. Senandheera, V., et al. (2024). Impact of microlearning on academic performance of students in higher education: A systematic review and meta-analysis. *Journal of Multidisciplinary & Translational Research*. https://doi.org/10.4038/jmtr.v9i1.2  
28. Sinha, T., & Kapur, M. (2021). When problem solving followed by instruction works: Evidence for productive failure. *Review of Educational Research*. https://doi.org/10.3102/00346543211019105  
29. Tetzlaff, L., Brod, G., et al. (2025). A cornerstone of adaptivity – A meta-analysis of the expertise reversal effect. *Learning and Instruction*. https://doi.org/10.1016/j.learninstruc.2025.102142  
30. Vaughn, K. E., Dunlosky, J., & Rawson, K. A. (2016). Effects of successive relearning on recall. *Memory & Cognition*. https://doi.org/10.3758/s13421-016-0606-y  
31. OpenAI. API pricing. Retrieved 17 September 2026. https://developers.openai.com/api/docs/pricing  
32. W3C. WCAG 2.2. https://www.w3.org/TR/WCAG22/  

Additional sources cited in-text without carrying a unique strong recommendation: Foster et al. JRME interleaving null; Higham et al. successive-relearning classroom manuscript; EDM 2025 LLM algebra autograder abstract; Hadi Mogavi et al. (2022) Duolingo gamification-misuse qualitative study (hypothesis source for anti-streak, not CU efficacy).

---

*End of specification. Distinctions used throughout: research finding vs product judgment vs engineering hypothesis vs untested assumption. A passing software test does not show that students learned.*
