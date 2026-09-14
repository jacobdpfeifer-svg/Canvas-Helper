# Study-optimizer architecture

**Status:** SIGNED and implemented (Phases 1–3, 2026-09-13). Cross-course
(§B) remains PARKED. Same spirit as [`class-standings.md`](class-standings.md)
for the parked section only.
**Date:** 2026-09-13
**Revised:** 2026-09-13, two passes in the same session:
1. Professional context (§C) is **live-search-only**, deep, multi-source —
   not the model-knowledge-only default this draft originally recommended.
2. Cross-course connections (§B) were first expanded to ship in both
   `student-course-arc` and `canvas-week-plan`, then — after reading the
   stress test below — **parked entirely**. Do not build §B. It's kept in
   this doc, unstruck, as the record of why it's parked (same treatment as
   [`class-standings.md`](class-standings.md)), not as a spec to implement.

**Implemented surfaces:**
- Phase 1 — `learn_loop.reconcile_*` + `npm run sync` best-effort hook
- Phase 2 — `canvas_mcp.core.claim_context` + `skills/_claim_context.md`
- Phase 3 — dock `Top3Sticky` leads with Start N checks · ~5/10 min

Both sections are rewritten to match; original recommendations are struck
through and kept for the record, not deleted, per this repo's addendum
convention (see
[`canvas-focus-pivot-2026-09-11.md`](../handoff/canvas-focus-pivot-2026-09-11.md)).

## What this covers

Four requested capabilities, mapped onto the existing loop
([`learn_loop.py`](../../src/canvas_mcp/core/learn_loop.py),
[`teach_hint.py`](../../src/canvas_mcp/core/teach_hint.py),
[`student-course-arc`](../../skills/student-course-arc/SKILL.md)):

- **A. Objective decomposition** — course → checkpoint → claims (mostly built)
- **B. Cross-course thematic linking** — net-new
- **C. Real-world/professional context per claim** — partially built, generalize
- **D. Daily short (5–10 min) active-recall session** — plumbing built, framing constrained

Each is stress-tested below, then assembled into one architecture and a
phased build order.

---

## A. Objective decomposition (course → checkpoint → claims)

**Current state.** `student-course-arc` reads the assignment catalog and
checkpoints from `inbox/courses/CODE.md`, infers a Theme, and emits
`Learn:` objectives per assignment ([SKILL.md:52-78](../../skills/student-course-arc/SKILL.md)).
Claims get written via `learn_loop.add_item`, which is a real upsert keyed
on `sha256(course|claim|assignment_id)` — re-running the skill does not
duplicate or reset an in-progress schedule (`add_item`,
[learn_loop.py:303](../../src/canvas_mcp/core/learn_loop.py)).

**Stress test.**

1. **Opaque assignment titles / no description fetched.** The skill already
   has a fallback (`Learn: unclear — need assignment description`) — this
   holds, but it means objective quality is bounded by what Canvas actually
   published. No fix needed; this is a correct degrade, not a bug.
2. **Claim hallucination.** The extraction step is an LLM reading a title
   and inferring what's testable. Nothing currently distinguishes "objective
   inferred from a syllabus/rubric sentence" from "objective guessed from a
   two-word title." `Learn:` rows are already tagged `(inferred)` /
   `(from prompt)` per the SKILL — **keep this tagging strict**, and do not
   let a stress-tested build loosen it to make the feature feel more
   complete than the data supports.
3. **Checkpoint drift.** If an instructor moves an exam date after claims
   already exist with the old `checkpoint_due`, nothing currently
   reconciles `items.yaml` against the refreshed catalog. `add_item` only
   updates `checkpoint_due` on re-add if a truthy value is passed — a
   silent date change on the Canvas side does not currently get
   force-pushed into existing items automatically.
   **Gap to close:** a reconciliation step (run at sync time, not a new
   background job) that diffs cached checkpoint dates against
   `items.yaml` and re-derives `gap_days`/`next_review_at` for affected
   claims when a checkpoint moves. This is a few functions, not a new
   subsystem — it belongs in `learn_loop.py` next to `add_item`.
4. **Group/team assignments.** Objective decomposition assumes individual
   mastery. A team project's "claim" is fuzzier (whose knowledge gap is
   it?). No change needed now — just don't extend claim extraction to
   graded-group deliverables without deciding what a "claim" even means
   there.

**Verdict:** this path is in good shape. Checkpoint-drift reconciliation
ships in `learn_loop.reconcile_from_inbox` (sync-time hook); everything
else is already-correct degrade behavior.

---

## B. Cross-course thematic linking — PARKED (decided 2026-09-13, same session)

**Status: not building this now.** Jacob first asked for this in both
`student-course-arc` and `canvas-week-plan`, then reconsidered after
reading the stress test below and asked to leave it out for now — the
failure modes (false connections, staleness, where it should even live)
outweigh the value at this stage. Nothing in this section is authorized to
be built. It's kept below, unstruck, because the stress test itself is the
reason it's parked and is worth having on record if this gets revisited —
same "framed, not built" treatment as
[`class-standings.md`](class-standings.md).

**What's missing.** Nothing today compares `inbox/courses/*.md` Theme
fields against each other. This is the one path with no existing code to
extend.

**Stress test.**

1. **Shallow/keyword-level false positives.** "Both courses mention
   'systems'" is not a real connection. A cross-course link needs to name
   *what* transfers (a method, a model, a way of reasoning), not just
   overlapping vocabulary — otherwise this becomes noise the student learns
   to ignore, which defeats the point.
2. **Staleness compounds.** Theme is itself cached and can be stale
   ("refresh if catalog changed materially" — `student-course-arc`
   §3). A linker built on top of a stale Theme produces a stale link.
   **Mitigation:** the linker must re-derive Themes fresh (or at least
   check the `Updated:` staleness marker) rather than trusting whatever is
   cached, since it's aggregating across files instead of reading one.
3. **Where does this run?** Two options:
   - **Eager** (computed at every sync) — always current, but burns LLM
     calls on every sync even when nothing changed and nobody asked.
   - **Lazy** (computed on demand, e.g. inside `student-course-arc` when a
     course is named, or a new trigger like "how does this connect to my
     other classes") — cheaper, but only as fresh as the last time someone
     asked.
   **Recommendation: lazy.** This is a single-student, session-driven
   product — there's no standing daemon computing things nobody looks at
   (`app/` is parked; see path D). Compute it inside `student-course-arc`
   as an optional extra section, gated on the student asking or on an
   explicit flag, not a new automatic step in `npm run sync`.
4. **Confidence labeling.** Same discipline as Theme's `(inferred)` tag —
   a cross-course link must say why it thinks two things are related
   (e.g., "both use rate-of-change reasoning — CHEM kinetics vs. MATH
   derivatives") and never assert equivalence the student hasn't verified
   with their own instructors.
5. **N is small — don't over-engineer.** A semester is ~4-6 courses. This
   is direct LLM reasoning over a handful of short cached summaries, not a
   candidate for embeddings/vector search infra. Building retrieval
   infrastructure for 5 short text blobs would be the kind of premature
   abstraction this repo has repeatedly rejected elsewhere.

**Proposed shape (parked, not authorized).** If this is revisited later,
the shape that survived stress-testing was: no new persistent module, an
added instruction block in `student-course-arc` ("### Cross-course
connections") that reads Theme + checkpoints from other course files,
names at most 1-2 connections with an explicit *what transfers* clause,
and refuses rather than forces a connection when Themes are thin/stale —
plus, per the (now moot) request to also put it in the weekly brief, it
would have needed to be factored as one shared helper called from both
`student-course-arc` and `canvas-week-plan` rather than duplicated prose in
two skills. None of this is being built now.

**Verdict: parked.** The stress test found real, not-easily-dismissed risk
(false-positive connections reading as authoritative, staleness compounding
across files, unclear ownership between two skills) for a capability
that's a "nice to have" relative to A/C/D. Revisit only if a later pass has
a concrete way to keep confidence labeling honest at low cost — don't
re-add it as a side effect of other work.

---

## C. Real-world / professional context per claim

**Decision (2026-09-13):** live web search, not model-knowledge-only —
research must be deep and surface **multiple distinct real-world /
professional applications** per claim, not one generic line. Everything
below is rewritten for that decision; §C's original "text-only, no live
search" recommendation is kept struck through further down for the record.

**Current state.** `student-concept-visual` already has this, narrowly: a
"Why this matters" analogy line, agent-authored, explicitly labeled
non-precision, available to every student regardless of learning-style
guess ([SKILL.md:50](../../skills/student-concept-visual/SKILL.md)). The
skill's own "Future" section names the Higgsfield/DALL-E version of this
idea and *keeps it disabled by default* — text first, imagery only as an
optional, clearly-labeled hook ([SKILL.md:126](../../skills/student-concept-visual/SKILL.md)).

**Stress test.**

1. **Scope today is too narrow.** It only fires for the four diagrammed
   math concepts in `diagram_gen`'s registry. Most claims in `learn_loop`
   are declarative/confusable/procedural facts from any course, not
   graphable math. The actual ask ("show me why this problem I'm slogging
   through matters") needs to reach every claim, not just tangent lines.
2. **Hallucination / overclaiming risk goes up, not down, with live search
   — it needs *more* discipline, not less.** A wrong citation reads as more
   credible than a wrong unsourced sentence, so sourcing must be visible:
   every application line needs an attributable source (article, org,
   named role/industry), not just a confident sentence. **Same epistemic
   floor as `vague_claim_reason` in `learn_loop.py`**: if the search comes
   back thin or off-topic, say so plainly ("no strong professional
   application found for this claim") rather than padding with something
   generic dressed up as a search result. Never let it get folded into
   what's tested — it's motivational framing, not new claim content.
3. **Mechanism — this does not require new backend infrastructure.**
   Skills in this repo already run as instruction bundles inside a live
   Claude Code session with tool access (`skill_router` loads `SKILL.md`
   bundles; see [architecture.md](../architecture.md) "Skill routing" row)
   — the same session that has a web-search tool available whenever it
   runs a skill. `student-instructor-profile` already has an "External
   research (supplement only)" step that does exactly this pattern today
   (faculty bio lookup, explicit source-quality rules, explicit
   RateMyProfessors ban —
   [SKILL.md:66-76](../../skills/student-instructor-profile/SKILL.md)).
   This is **not** a new scraper and does not conflict with the "prefer
   SSO→API→inbox over new scrapers" coding standard — that standard is
   about not building bespoke fetch pipelines against sites whose ToS
   forbids it (RateMyProfessors) or against Canvas itself outside the
   supported API. A general web search for public professional/industry
   content is the same category of tool `student-instructor-profile`
   already uses for faculty bios, not a new category.
   **What this does change:** every claim now costs one or more real
   network round-trips (search + read a few pages) instead of zero. That's
   real latency and real per-call cost the model-knowledge-only version
   didn't have — see caching rule below.
4. **"Deep" and "multiple applications" need a concrete floor, or "deep"
   silently becomes "one search, one paraphrase."** Set a minimum: **at
   least two independent sources, naming at least two distinct fields or
   roles** where the concept applies, before the context line is shown.
   If the search can't clear that bar, fall back to the refusal line in
   (2) rather than stretching one source into two bullet points.
5. **Sourcing / copyright discipline.** Per this session's own rules:
   summarize, don't reproduce; at most one short quote (<15 words) with
   attribution if a quote is used at all; cite the source (title + link)
   next to each application so the student can verify it themselves —
   this also directly defuses the hallucination risk in (2), since a
   dead or fabricated-looking link is a visible tell.
6. **Instructor-pedagogy conflict.** Some instructors deliberately teach
   theory before application, or don't want a "why this matters"
   framing overriding their own sequencing (this is exactly what
   `## Instructor profile` already tracks — grading tone, AI policy,
   participation). No current signal says "this instructor doesn't want
   motivational asides," but nothing forces the line either — it should
   stay opt-in/on-request per claim, not injected into every card
   unconditionally, so it never talks over an instructor's own framing.
7. **Fatigue and cost compound together now.** If every due-review card
   re-runs a live search, that's both the "why becomes a lecture" failure
   mode the audit already warned about (engagement-mechanics-fit-audit.md
   #5) *and* unnecessary repeated network cost. **Cache the result on the
   claim** and show it once per claim (on creation or first review), not
   every time — same `context_shown` bookkeeping as before, but now it's
   also the thing that keeps this affordable.
8. **Failure mode when search is unavailable or slow.** The session
   running a skill might not have search access, or a search might time
   out. The claim must still work without professional context — this is
   an enrichment, never a blocker on presenting or reviewing the claim
   itself.

**Proposed shape.**
- Add a shared helper (e.g. `learn_loop.py` or a small `claim_context.py`)
  that any skill calls when first presenting a new claim. The skill
  instructions (not new product code) direct the running agent to search
  the web, require ≥2 sourced applications across ≥2 distinct fields, and
  write a refusal line when that bar isn't met.
- Cache the result on the claim (`professional_context: list[{application,
  field, source_title, source_url}]`, `context_shown: bool`) so it's
  researched once, not on every review.
- Model this on `student-instructor-profile`'s existing "External research
  (supplement only)" step for sourcing discipline and the RateMyProfessors
  carve-out, rather than inventing new rules from scratch.
- Explicitly do **not** wire this to Higgsfield or any image/video
  generator. The existing disabled-by-default illustration hook stays
  disabled; this build extends the text/citation path only.
- ~~Original recommendation (superseded 2026-09-13): model-knowledge-only,
  no live search, to avoid a new external dependency.~~ Jacob decided
  live search is required for this to be worth building at all — noted
  for the record, not followed.

**Verdict:** buildable without new backend infrastructure — it reuses the
same session-level web-search access and sourcing pattern
`student-instructor-profile` already established. The real engineering is
the discipline layer (source-count floor, caching, graceful refusal), not
a new fetch pipeline.

---

## D. Daily short (5–10 min) active-recall session

This is the path that needs the most scrutiny, because "Duolingo-style
daily habit" smuggles in two different things: **short bounded sessions**
(architecturally fine, mostly built) and **an engagement/reminder loop**
(architecturally blocked by standing decisions, for good reason).

**Current state — the session shape is already right.**
`due_reviews` is hard-capped at 2 items
([learn_loop.py:32](../../src/canvas_mcp/core/learn_loop.py)) specifically
so a check-in is bounded, not a wall of cards — that is already a 5-10
minute session by construction. `habit.py` tracks brief continuity without
shaming a gap. The dock/brief the student opens *is* the low-barrier daily
touchpoint; it doesn't need to be rebuilt as a separate "study pack" feed.

**Stress test.**

1. **"Encourage the student to visit daily" cannot mean push
   notifications on this architecture, and that's a policy fact, not a
   gap.** `app/` (the Tauri shell with a background daemon) is explicitly
   **parked** per [CLAUDE.md](../../CLAUDE.md) layout notes. There is no
   running background process to fire a local OS notification even if one
   were wanted. Separately, the personal Gmail/Calendar reopening
   ([canvas-focus-pivot-2026-09-11.md addendum](../handoff/canvas-focus-pivot-2026-09-11.md))
   is explicit that `send_email`/`create_event` may **never** escalate to
   a standing/automatic posture — every send needs a per-instance human
   "yes, do that." A daily auto-reminder email is definitionally the
   escalation that addendum forbids. **There is currently no
   architecturally-legal way to have the product proactively remind the
   student.** This isn't a missing feature to build toward; it's a
   constraint to design around.
2. **So what replaces "encourage"?** Only the pull-side experience: when
   the student does open the app/chat, the due-review session must be
   fast, obviously worth 5 minutes, and frictionless to start. That's a UX
   quality bar (does the Top-3/dock make the due reviews the first thing
   you see, with a clear time estimate?), not a new subsystem.
3. **Cold start.** Early in a course, before assignments/checkpoints
   exist, there's nothing to review — the loop has no claims yet. A
   Duolingo-style daily habit assumes there's always *something* small to
   do. Today, an empty `due_reviews` just means nothing shows. This is
   correct (don't invent busywork to fill a habit slot — that's exactly
   the "exposure ≠ learning" line this repo has held throughout), but it
   does mean the "every single day, 5-10 minutes" framing won't literally
   hold at the start of a semester or between assignments. Set that
   expectation with the student rather than overselling daily cadence.
4. **Re-litigating the streak.** The single biggest risk in this path is
   drift: a well-intentioned "make it feel like a daily habit" build
   quietly re-introduces a day-count, a visible chain, or "you're on day
   N" copy. `habit.py`'s internal field is literally named `streak` and
   the audit already had to say explicitly "that word must not return to
   the dock or skill line" (engagement-mechanics-fit-audit.md:33). Any
   work on this path must not touch `habit.py`'s framing without
   re-reading that constraint first.
5. **Measuring whether it's working.** The repo already has the right
   metric definition — `learn_loop evaluate` compares due-review
   completion, delayed-hit rate, overdue work, and deadline surprises,
   explicitly *not* DAU/streak/session-count
   (engagement-mechanics-fit-audit.md:219). No new instrumentation is
   needed here; just use what exists rather than inventing an engagement
   dashboard.

**Verdict:** the honest scope of "make it more Duolingo-like" here is
**UX polish on the existing dock/brief surface** (surface due_reviews
prominently, show a time estimate, make starting a review one action), not
a new delivery mechanism. Proactive reminding is not just unbuilt — it's
currently policy-blocked by two separate standing decisions, and reopening
either would need its own signed addendum, not a side effect of this
build.

---

## Cross-cutting risks (apply to all four paths)

1. **Claim/context provenance discipline.** Every generated field that
   isn't sourced from Canvas data directly (Theme, sourced professional
   context) must keep an `(inferred)` / non-precision label or a visible
   source citation.
   This is the single most-repeated pattern in the existing skills and
   the cheapest guard against the system quietly overclaiming certainty
   it doesn't have.
2. **Call volume / latency.** Path C now makes a real network call
   (search + read) per claim on first exposure — keep it lazy and cached
   (computed once per claim, not recomputed every sync or every review),
   consistent with `app/` being parked and there being no background
   compute story right now.
3. **External dependency is now scoped, not absent.** Path C's live
   search is a deliberate, bounded exception to "prefer SSO→API→inbox
   over new scrapers" — it's a general web search for public professional
   content, modeled on `student-instructor-profile`'s existing external
   research step, not a new scraper against a specific ToS-restricted
   site. Keep it that narrow: no RateMyProfessors, no auto-fetching
   arbitrary sites beyond what a normal search+read does, and no new
   standing service/API-key dependency.
4. **Gamification re-entry.** C introduces a new surface (professional
   context) that's easy to accidentally badge/score/gamify later
   ("you unlocked a connection!"). It doesn't need points, badges, or
   completion percentages to work — resist adding any.
5. **Testing.** `learn_loop.py` and `habit.py` have existing test
   coverage (`tests/core/test_learn_loop.py`, `test_habit.py`). Any change
   to `add_item`/checkpoint reconciliation needs matching unit tests
   before merge, same bar as the existing suite.

---

## Assembled architecture

```
Canvas sync (existing, unchanged)
   -> inbox/courses/CODE.md   (catalog, checkpoints, cached Theme)
        |
        +-> student-course-arc                              [EXISTS]
        |     - objectives + checkpoint decomposition        [EXISTS]
        |     - checkpoint-drift reconciliation               [NEW - small, in learn_loop.py]
        |     (cross-course connections — PARKED, not built)
        |
        +-> learn_loop.add_item (upsert, dedup by hash)       [EXISTS]
              -> scheduler (exam-relative spacing)            [EXISTS]
                   -> due_reviews (capped at 2)                [EXISTS]
                        -> dock/brief = the daily session      [EXISTS - UX polish only]
                             -> claim_context helper           [NEW - live web search,
                                (professional context, sourced)  ≥2 sources / ≥2 fields,
                                                                  cached per claim]
```

Nothing here requires touching `app/` (parked) or adding an MCP server.
Path C's `claim_context` helper is the one component with an external
network dependency (live web search), scoped as described above — every
other component stays local.

---

## Phased build order

**Phase 1 — checkpoint-drift reconciliation** (path A gap)
Add a diff step in `learn_loop.py` that re-derives `gap_days` /
`next_review_at` when a synced `checkpoint_due` changes for an existing
item. Unit tests alongside `test_learn_loop.py`. No skill changes needed.

**Phase 2 — generalized, sourced claim context** (path C)
Extract the "why this matters" pattern out of `student-concept-visual`
into a shared helper callable from any skill that creates/reviews a
claim. The helper's instructions require a live web search per claim,
enforce the ≥2-sources/≥2-fields floor, cite each application, and write
the refusal line when the bar isn't met. Add `context_shown` +
`professional_context` bookkeeping so it's researched once per claim, not
every review. Update `student-concept-visual` to call the shared helper
instead of owning the copy. Model the sourcing rules on
`student-instructor-profile`'s existing external-research step.

**Phase 3 — dock/brief UX polish** (path D, the only in-scope part of
"daily habit")
Audit the current Top-3/dock rendering for: is the due-review count and
time estimate the first thing shown when reviews exist? Is starting one
truly one action? This is presentation work on existing data
(`due_reviews`, `review_budget`), not new backend.

**Parked, not phased — do not build without reopening the decision:**
- Cross-course thematic linking (path B) — stress-tested and set aside in
  this same session; see §B above for why.
- Any proactive reminder/notification mechanism for path D (currently
  blocked by `app/` being parked and by the email/calendar
  never-automatic rule)
- Any point/badge/streak surface attached to C

---

## Signed decisions (2026-09-13)

1. ~~Model-knowledge-only vs. live search~~ → **live search, deep,
   ≥2 sourced applications across ≥2 fields per claim**.
2. ~~Cross-course connections scope~~ → **parked entirely, not building**
   (superseding the earlier "both course-arc and weekly brief" instruction).
3. **No `app/` unparking / no notification mechanism** — path D stays
   pull-side dock UX only. Reopening reminders needs its own addendum.
4. **Source-quality floor** — reuse `student-instructor-profile` discipline
   (prefer industry orgs / associations / case studies; never
   RateMyProfessors); refuse thin marketing rather than coding an
   allow/deny taxonomy. Skills state preference; Python validates row shape
   and counts only.

Phases 1–3 are implemented against these decisions.
