# Cursor build prompts — API model migration + context engineering

Generated 2026-09-07 from research on model-provider economics and context-engineering
prior art. Two independent prompts. Run Prompt A first (it's the dependency); Prompt B can
run any time after.

Repo: `TheUltimateStudent:TeacherWorkflow`, branch `phase1-productname-pivot`.
Full test suite before/after either prompt: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q`
(currently 615 passed, 19 skipped — must stay green or better).

**Pricing note (2026-09-07):** Gemini 2.5 Flash-Lite retires 2026-10-16. Its successor,
Gemini 3.1 Flash-Lite, is ~$0.25/$1.50 per M tokens (input/output) — roughly 3x the 2.5
number used in earlier cost estimates. Budget against the current number, not 2.5's.

**Routing decision (2026-09-07):** researched a learned task-complexity router
(RouteLLM/Martian/Not Diamond style) vs. simple model-per-skill assignment. Verdict:
skip the classifier — `skill_router.py` already classifies task type before any model
call fires, so a second classifier adds real risk (production misrouting rates as high
as ~50% in the research, ~200ms added latency, and — the sharp one — switching models
mid-session can break prompt caching and make routing net *more* expensive) to save
low-single-digit-dimes per user per month. Prompt A below reflects this: assign a
model per skill category directly, don't build a router.

---

## Prompt A: Provider abstraction + kill the Ollama-chat path

```
This app (ProductName, a Tauri desktop student assistant) currently has scattered
references to a "local Ollama" path that we are abandoning in favor of a hosted API
model. We need a thin provider abstraction — NOT a full LLM framework — because every
model we evaluated has near-term deprecation risk, so swapping providers must be a
config change, not a code change.

## 1. Add a provider abstraction

Create `src/canvas_mcp/core/llm_provider.py`:
- A `LLMProvider` protocol/ABC with two methods: `chat(messages, tools=None) -> ChatResult`
  and `embed(text) -> list[float] | None`.
- One concrete implementation to start: a Gemini-family provider (use the current
  Flash-Lite tier model name — check the Gemini API docs for whichever Flash-Lite model
  is current, not "2.5", since that line is being deprecated October 2026) reading its
  API key from an env var (`PRODUCTNAME_LLM_API_KEY` or similar — match existing env
  var naming conventions in this repo).
- A second implementation for Claude Haiku (current generation) for use in
  reliability-critical write paths (anything gated by ConfirmationGuard, e.g.
  submit_assignment). Reuse whatever Anthropic SDK dependency already exists in this
  repo if any; otherwise add the official `anthropic` Python SDK.
- Provider selection via config (env var or a small YAML, whichever matches this repo's
  existing config pattern in `schools/` / `config/overlays/`) — NOT hardcoded imports
  scattered through the codebase. One place decides which provider is active.
- Do not build retry/rate-limit/streaming infrastructure beyond what's needed to pass
  tests — keep this thin, this is a provider swap layer, not a new framework.

## 2. Assign a model per skill category (not a learned router)

Add a `model_tier` field (values: `"fast"` or `"reliable"`, or similar) to skill
metadata — wherever skill schema_version/category already lives (check each
`skills/*/SKILL.md`'s frontmatter and how `skill_router.py` reads it). Default
read-only/lookup skills (`student-canvas-browser`, `canvas-week-plan`,
`student-inbox-week`, `student-task-brief`) to the fast/cheap provider tier; pin
write-confirmation skills and anything behind ConfirmationGuard to the reliable tier
regardless of cost.

**Before assigning, audit each skill for mixed difficulty** — a skill that internally
spans both simple lookups and real synthesis/judgment should NOT be defaulted to the
cheap tier. Specifically review `skills/student-course-arc/SKILL.md` and
`skills/student-instructor-profile/SKILL.md` (multi-course synthesis / profile
inference are more judgment-heavy than pure fetch-and-list). For any skill like this,
either pin it to the reliable tier outright, or split it into two skills (a cheap
lookup skill + a reliable synthesis skill) so skill_router's existing selection does
the tier assignment for free — do not build a separate classifier to detect difficulty
within a single skill invocation.

This assignment must happen at the skill-invocation boundary (i.e., once per skill
call, not swapped mid-conversation) — that boundary is already a natural cache
boundary, so this doesn't disrupt the cache-order work in Prompt B.

## 3. Migrate skill_router.py's embedding dependency

`src/canvas_mcp/core/skill_router.py` has an `ollama_embed()` function
(around line 189) used for semantic skill routing, called from a routing function
around line 257. Per our context-engineering research, structured/metadata filtering
(course, due date, assignment type — all present in the existing inbox catalog format)
should be tried BEFORE falling back to embeddings, since it's cheaper and more
reliable for small models on data this structured.

- Add a structured-filter-first routing path: if the skill catalog can be narrowed by
  explicit metadata match, use that and skip embeddings entirely.
- Only fall back to `LLMProvider.embed()` (via the new abstraction) when structured
  filtering doesn't sufficiently narrow the candidates.
- Remove the direct `OLLAMA_HOST` / `OLLAMA_EMBED_MODEL` env var reads and the raw
  HTTP call to a local Ollama server — this must go through the provider abstraction
  or be removed if structured filtering alone proves sufficient (check by running the
  existing skill_router tests and the skill structural eval — see step 5).

## 4. Migrate or gate the live skill-eval harness

`src/canvas_mcp/core/skill_eval.py` has `_ollama_chat()` — a live tool-call probe
gated behind `PRODUCTNAME_LIVE_SKILL_EVAL=1`, currently hitting local Ollama at
`OLLAMA_HOST` (default `http://127.0.0.1:11434`). This is a dev/CI quality-check tool,
not production runtime — keep it, but repoint it at the new `LLMProvider` abstraction
so it validates skills against whatever model production actually uses instead of a
local model nobody's running anymore.

## 5. Remove local-first/Ollama UI messaging (cosmetic, not functional)

- `app/src/components/Onboarding.tsx` around line 188: remove "Skip to stay local-first
  / Ollama-only" copy and any onboarding flow branch implying a local-only mode. Cloud
  key should remain optional (per prior audit — don't force it), but the framing should
  no longer suggest a local-model alternative exists, since we're going pure-API.
- `app/src-tauri/src/commands.rs` around line 59: update or remove the comment
  referencing "local-first / Ollama path skips it" to match the new reality.
- Grep the whole repo for "ollama"/"Ollama" (case-insensitive) after these changes and
  confirm only the provider-abstraction internals and the (now-repointed) skill_eval
  harness reference it — no other references should remain. Do NOT touch the git
  history, only the working tree.

## Verification (must all pass before calling this done)

- Full suite: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` — must
  match or exceed current baseline (615 passed, 19 skipped).
- `grep -rniI "ollama" --include="*.py" --include="*.rs" --include="*.ts" --include="*.tsx" .`
  (excluding node_modules/.git/target/lockfiles) should only show the provider
  abstraction's internal implementation detail and skill_eval's repointed harness — not
  a chat-path dependency on a local server.
- Do not introduce a hard runtime dependency on network access for anything that
  currently works offline in tests (mock the provider in tests, don't hit a real API).
```

---

## Prompt B: Context-engineering upgrades

```
This app already has a good context-memory shape (skill files = procedural memory,
learning_profile.py = durable priors, inbox = working memory, ledger.jsonl = episodic
log) — this prompt is about tightening HOW context gets assembled and cached per turn,
based on documented best practice (Anthropic's own context-engineering writeup,
Claude Code's prompt-caching design, LangChain's write/select/compress/isolate
framing). Do not restructure the four-way split — it's already correct. Depends on
Prompt A being done first (needs the LLMProvider abstraction to exist).

## 1. Cache-order discipline in prompt assembly

Find wherever this app assembles the final prompt sent to the model (likely in
skill_router.py or a call site in the daemon/CLI layer — locate it first). Enforce this
ordering, stable-content-first:
  1. Tool/function definitions (must not change mid-session)
  2. System prompt / skill instructions (stable per skill)
  3. learning_profile content (stable per student, changes rarely)
  4. Volatile content last: this turn's inbox slice / week.md excerpt

This ordering matters because most hosted providers (including whichever we picked in
Prompt A) give a steep discount on cached prefix tokens, and this app resends
overlapping context every turn. Verify the tool/function list is genuinely identical
across turns within a session — changing it busts the cache per our research.

## 2. Structured, sectioned skill prompts

Skill markdown files under `skills/*/SKILL.md` should have clearly delimited sections
(e.g. explicit headers like `## Instructions`, `## Context`, `## Tools available`)
rather than prose blocks, since small models parse structural boundaries more reliably
than freeform text. Audit 2-3 existing skill files and propose (don't silently rewrite
all of them — show the pattern on one, e.g. `skills/student-task-brief/SKILL.md`, get
it approved in the diff, matching skills/_SESSION.md's existing shared-boot pattern)
a consistent section structure other skills can adopt.

## 3. Explicit "ignore irrelevant context" scaffolding

Add a short, reusable instruction snippet (candidate location: skills/_SESSION.md,
since it's already the shared boot doc other skills reference) telling the model to
disregard inbox/profile content not relevant to the current task, rather than trying
to use everything it's given. This is a documented, cheap mitigation for small-model
distraction by irrelevant context — keep it to 1-2 sentences, not a new section.

## 4. Structured-filter-first inbox selection (pairs with Prompt A's routing change)

Wherever "which slice of week.md / course catalog" gets selected for a given skill
invocation, prefer explicit metadata filtering (course, due date, assignment type —
already present in the inbox catalog format) over any embedding-based retrieval. Only
reach for embeddings if structured filtering can't sufficiently narrow the context.
This should reuse the same structured-filter-first logic added to skill_router in
Prompt A rather than inventing a second filtering path — check for duplication before
writing new code.

## 5. Ledger-to-profile compaction (scope this conservatively)

Currently the ledger (`ledger.jsonl`) only ever grows (append-only, intentionally, for
audit/undo purposes — do not change that). learning_profile.py currently updates via
onboarding games and incremental patches, but has no periodic re-synthesis step. Add
ONE new function to learning_profile.py — e.g. `compact_from_ledger(user_root, since=...)`
— that reads recent ledger entries and proposes/writes small, additive updates to
learning_profile fields (not a rewrite of the whole profile). Do NOT wire this into a
cron/scheduled daemon call yet — add the function and a test for it, leave invocation
as a manual/future step (this is a new behavior surface, not obviously safe to
auto-run unattended without a product decision).

## Verification

- Full suite: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` must
  stay green (615+ passed baseline, adjust upward as tests are added — should not
  decrease).
- Show a before/after diff of the assembled prompt (via a test or a small script) for
  one real skill invocation, demonstrating the new stable-first/volatile-last ordering.
- Do not silently rewrite all skill files — this prompt should touch at most 1-2 skill
  files as a demonstrated pattern, plus skills/_SESSION.md, plus the new
  learning_profile.py function and its test.
```

---

## Status update (2026-09-07, later same night)

A research agent partially implemented pieces of Prompt B ahead of schedule (see commit
`06187ed`): `src/canvas_mcp/core/prompt_assembly.py` (cache-ordered assembly),
`structured_narrow`/`embed_rank` in `skill_router.py`, `compact_from_ledger` in
`learning_profile.py`, and the sectioned-skill-file pattern demonstrated on
`skills/student-task-brief/SKILL.md`. All of it currently has **zero callers** — nothing
in the app actually invokes any of it yet. Prompts C, D, E below are the finish-the-wiring
follow-ups, each scoped to exactly one of the three context-system pieces. They supersede
the relevant parts of Prompt B (items 1, 2, 5) — don't redo that work, extend it.

---

## Prompt C: Wire cache-ordered prompt assembly as the only assembly path

```
prompt_assembly.py already exists (src/canvas_mcp/core/prompt_assembly.py) and
implements the correct ordering — tool schemas, then skill instructions, then learning
profile, then the volatile inbox slice last, so stable content sits in the cacheable
prefix. Problem: nothing calls it. Find every place in this codebase that currently
assembles a prompt/message list for a model call (search skill_router.py, the daemon
CLI entry points, and anywhere a skill's instructions + profile + inbox content get
combined into something sent to a model) and route it through
prompt_assembly.chat_assembled instead of assembling ad hoc.

Do not duplicate the ordering logic anywhere else — if you find a second place
building a message list by hand, that's a bug to fix, not a second valid pattern.

This depends on llm_provider.py existing (Prompt A item 1) — if that hasn't landed
yet in this session, implement llm_provider.py's ChatMessage/ToolSpec/chat() surface
first (prompt_assembly.py already has a fallback shim for these types when the import
fails — replace the shim usage with the real import once llm_provider.py exists, don't
leave both).

## Verification

- grep for anywhere a list of messages/prompt content is being hand-assembled outside
  prompt_assembly.py — there should be none left after this change.
- Add or update a test that asserts, for one real skill invocation, the actual
  assembled payload sent toward the provider has tool schemas first, skill+profile
  content next, and the current inbox slice last — not just that prompt_assembly.py's
  own unit tests pass in isolation.
- Full suite green, matching or exceeding current baseline (619 passed, 19 skipped as
  of commit 06187ed).
```

---

## Prompt D: Roll out the structured skill-file pattern to the remaining 10 skills

```
skills/student-task-brief/SKILL.md was converted tonight to a sectioned format
(## Instructions / ## Context / ## Tools available / ## Triggers) instead of prose,
because small models follow labeled structure more reliably than freeform text. The
other 10 bundled skills are still prose-format:

canvas-discussion-facilitator, canvas-week-plan, student-assignment-triage,
student-canvas-browser, student-concept-visual, student-course-arc,
student-degree-progress, student-inbox-week, student-instructor-profile,
student-photo-intake

Convert each to the same section pattern demonstrated in student-task-brief/SKILL.md:
- ## Instructions — the actual step-by-step procedure (was previously "## Steps" or
  unlabeled prose)
- ## Context — what inputs this skill reads and where from (user_root paths,
  calibration files, etc.), explicitly noting what's supplied as the volatile
  per-turn slice vs. what the skill should read directly
- ## Tools available — explicit tool/capability list, including whether this skill
  can call write/submit tools or is read-only (mirror student-task-brief's "Read
  only. No submit tools from this skill." pattern for read-only skills)
- ## Triggers — phrases/intents that route to this skill (skill_router already uses
  something like this for routing; consolidate, don't duplicate, if a triggers list
  already exists elsewhere in the file)

Preserve every skill's existing content and behavior exactly — this is a
reorganization into labeled sections, not a rewrite of what each skill does. Do not
change schema_version or category unless a section move genuinely requires it. Keep
each skill's link to skills/_SESSION.md for the shared boot sequence instead of
restating it.

## Verification

- Full suite green (structural skill eval — eval_all_bundled() — must still report
  11/11 pass after the conversion, matching the current baseline from
  docs/handoff/architect-brief.md §6).
- Diff each converted skill file and confirm no procedural content was dropped, only
  reorganized under the new headers.
```

---

## Prompt E: Give compact_from_ledger a manual invocation point (no auto-scheduling)

**Correction (2026-09-07, post-audit):** an earlier pass tried to add a bare
`compact` CLI subcommand for this and had to revert it — `tests/core/test_learning_profile.py::test_cli_has_no_compact_subcommand`
already documents why: *"Replay stays unwired until learning_signal writers and a
watermark exist."* Without a watermark (a persisted marker of what's already been
compacted), re-running `compact --since X` over an overlapping window double-applies
the same ledger rows and corrupts `signal_counts`. Do not add a CLI subcommand without
first adding the watermark — see the updated task below.

```
learning_profile.py has compact_from_ledger(user_root, since=...) — it reads recent
ledger rows, applies only explicit learning_signal entries via record_signal(), and
returns a CompactSummary(applied, skipped). It has tests but is currently uncallable
from outside a Python REPL — no CLI, no Tauri command, nothing.

First, add a watermark so this is safe to run more than once:
- Persist "last compacted timestamp" somewhere in the student's user_root (a small
  file, e.g. `{user_root}/.learning_profile_compact_watermark`, or a field on the
  profile itself — match whatever persistence pattern user_root.py already uses
  elsewhere in this repo, don't invent a new one). compact_from_ledger should read
  the watermark as the default `since` when none is passed explicitly, and advance it
  to "now" after a successful run, so re-running with no arguments never re-applies
  the same rows. An explicit `--since` should still be allowed to override it (for a
  deliberate replay), but the default path must be idempotent.
- Update/add a test proving: two consecutive no-argument compact calls apply each
  ledger row exactly once combined, not once each.

Then add ONE way to invoke it manually:
- learning_profile.py already has a CLI (main() with argparse, subcommands "save" and
  "signal" — see around line 388). Add a third subcommand, e.g.
  `python -m canvas_mcp.core.learning_profile compact [--since ISO_TIMESTAMP]`, that
  calls compact_from_ledger and prints the CompactSummary (respect the existing
  --json flag pattern already in this CLI).
- Update or remove tests/core/test_learning_profile.py::test_cli_has_no_compact_subcommand
  — it currently asserts this subcommand does NOT exist, written before the watermark
  existed. Once the watermark lands, replace it with a test that the subcommand exists
  and is idempotent (see above), don't just delete it.

Do NOT:
- Wire this into daemon.rs's cadence loop or any scheduled/cron path.
- Add a Tauri command or UI button that triggers it automatically.
- Call it from anywhere in the request-handling path (skill_router, prompt_assembly).

This is intentionally a manual, deliberate action for now — auto-running unattended
writes to the learning profile is a product decision, not something to default to
just because the plumbing exists. If you think it should be automatic, say so in your
summary of this change instead of wiring it — that's a call for the founder to make.

## Verification

- `PYTHONPATH=src .venv/bin/python -m canvas_mcp.core.learning_profile compact
  --since <some-iso-date>` runs against a test user_root and prints a sensible
  summary.
- Full suite green.
- grep confirms compact_from_ledger has exactly one new caller (the CLI subcommand)
  and no daemon/Tauri/scheduled callers were added.
```
