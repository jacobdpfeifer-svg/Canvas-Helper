# Cursor build prompts — closing the episodic → semantic → procedural memory loop

Generated 2026-09-10 from a research pass mapping this app's existing memory shape
(episodic.db / core/memory.py / self_improve/*) against CoALA, MemGPT/Letta, Mem0, and
Voyager. Verdict from that pass: the shape is correct and already matches published
practice — do not restructure it. What's missing in all three cases is **wiring**, not
design. See the "Status update" in
[`cursor-build-prompts-2026-09-07.md`](cursor-build-prompts-2026-09-07.md) for the
sibling pattern (context-assembly pieces built with zero callers, wired later in
Prompts C/D/E) — this doc is the same shape of problem, one layer deeper in the stack.

Repo: `TheUltimateStudent:TeacherWorkflow`, branch `phase1-productname-pivot`.
Full test suite before/after any of these prompts:
`PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q`
(currently **685 passed, 20 skipped** — must stay green or better after each prompt).

**Run order: F, then G, then H.** Each is a hard dependency on the one before it —
G needs real rows in `episodic.db` to distill, and H needs `detect_repeat_clusters`
(cluster.py) to have real signal instead of empty/synthetic data. Do not start H
before F and G have been running in a real session for a while — the safety floor in
`self_improve/shadow.py` is a hard ban on write skills, but promoting *any* skill
(read or write) off of fabricated or day-one-empty episodic data is how you get a
procedural-memory library full of garbage. Ship F, use the app for a bit, then come
back for G and H.

---

## Prompt F: Turn episodic logging on for real

```
This app already has a working episodic-memory writer: `log_request()` in
src/canvas_mcp/core/self_improve/logger.py writes to `{user_root}/episodic.db`
(SQLite, a `requests` table with intent_tag/tools_used/success_signal/latency_ms/
embedding/transcript_excerpt). `route_intent()` in src/canvas_mcp/core/skill_router.py
(around line 465) already calls it correctly on every routing decision, gated by a
`log: bool = True` parameter.

The bug is one line upstream of all of that. The only production caller of
`route_intent` is the Tauri daemon: `app/src-tauri/src/daemon.rs`'s `run_route_intent`
(around line 153) shells out to `python -m canvas_mcp.core.skill_router` and — at
daemon.rs:157 — hardcodes the `--no-log` flag on every single call. That flag is
threaded through skill_router.py's `main()` (around line 578) straight into
`log=not args.no_log`. So every real user interaction that reaches the router
(triggered from `app/src/App.tsx`'s "brief" action via `routeIntent()` in
`app/src/ipc.ts:436`) explicitly skips writing to episodic.db. `episodic.db` has been
structurally correct and permanently empty in production this whole time.

## 1. Stop suppressing the log in the daemon

Remove the `--no-log` argument from `run_route_intent` in daemon.rs:157 (or make it
conditional on something real — e.g. a debug/dev env flag — but the default
production path must log). Confirm `resolve_user_root` inside `route_intent` resolves
to the same real per-student user_root the daemon otherwise uses for this session, not
a `"dev"` placeholder — read `route_intent`'s root-resolution fallback (skill_router.py
~line 477-483) and daemon.rs's own user-root resolution (check how other daemon.rs
Python subprocess calls pass `DEV_USER_ROOT` / the real root, e.g. via
`forward_user_env`) and make sure `run_route_intent` forwards the same env so the
router isn't silently falling back to a dev root that the desktop app never reads
from.

## 2. Confirm what's actually being captured is meaningful

Read `route_intent`'s `RequestLog` construction (skill_router.py ~line 490-511).
`success_signal` there is only ever `"accept"` (a skill matched) or `"veto"` (nothing
matched) — it is a routing-confidence signal, not a task-outcome signal, because this
call site only routes, it never executes (`execute_intent`, which actually runs the
skill via `prompt_assembly.run_skill_turn` and would know real success/error, has zero
production callers today — only `route_intent` is wired to the daemon). That's fine
for this prompt: Voyager/Mem0-style clustering on `intent_tag` repetition (see
`self_improve/cluster.py::detect_repeat_clusters`) only needs routing volume, not full
execution telemetry, to bootstrap. Do NOT wire `execute_intent` into the daemon as
part of this prompt — that's a separate, bigger product decision (it would mean
actually running skills server-side from every dock click instead of just routing)
and is out of scope here. Leave a one-line note in your summary that real
success/error signal (vs. routing accept/veto) would require that separate wiring,
but don't build it now.

## 3. Verify data actually accumulates

Add or update a test exercising `daemon::run_route_intent` (or, if that's not
practically testable from Rust in this suite, exercise the equivalent Python path —
check `tests/core/test_skill_router.py` for the existing pattern that already asserts
`(tmp_path / "episodic.db").is_file()` around line 184, and extend it or add a
sibling test) that asserts: after N calls through the real (non-`--no-log`) path
against the same user_root, `episodic.db`'s `requests` table has N rows, not zero.

## Do NOT

- Do not wire `execute_intent` into the daemon (see §2).
- Do not touch `self_improve/cluster.py`, `drafter.py`, `shadow.py`, or `promoter.py` —
  this prompt only makes sure real rows land in `episodic.db`; consuming them is
  Prompt H.
- Do not add a new logging path — there is exactly one correct writer
  (`log_request`) and one correct call site (`route_intent`'s existing call to it).
  If you find yourself writing a second one, stop and re-check daemon.rs.

## Verification

- Full suite: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` — must
  match or exceed 685 passed, 20 skipped.
- Manual smoke: run the desktop app (or `cargo run` the daemon directly), trigger the
  "brief" action a few times, then inspect
  `sqlite3 {user_root}/episodic.db "select count(*), intent_tag from requests group by intent_tag;"`
  and confirm non-zero rows with real intent tags — not the dev/test root.
- grep confirms `--no-log` no longer appears unconditionally in daemon.rs.
```

---

## Prompt G: Wire episodic → semantic distillation (the actual "turns experience into facts" step)

```
Depends on Prompt F being live in a real session for a while — this prompt reads rows
that F is now producing.

src/canvas_mcp/core/memory.py exists but is a stub: `add_memory()` tries the real
`mem0` package first, and falls back to blindly appending raw text to
`{user_root}/MEMORY.md` with no extraction, no dedup, and no source. `search_memory()`
mirrors it with substring matching over that same flat file. Nothing in this repo
calls either function today (grep confirms zero callers outside memory.py itself).
This is the semantic-memory tier from CoALA / the "archival" tier from MemGPT/Letta /
what Mem0 calls ADD-only extraction — durable facts distilled from raw episodes, never
overwritten, only appended to.

The raw episodes to distill from are now real: `episodic.db`'s `requests` table
(via `self_improve/logger.py::recent_requests`) after Prompt F, plus — if you want a
second, higher-signal source — `ledger.jsonl`'s `outcome` field (`success|veto|error|
paused`, see `core/ledger.py`'s schema docstring) for anything that reached an actual
actuator. Start with `episodic.db` only; treating the ledger as a second source is a
stretch goal, not required for this prompt to be done.

## 1. Design the distillation function (this is the new code)

Add a function — e.g. `distill_episodic_to_semantic(user_root, since=None) ->
DistillSummary` — probably in `core/memory.py` itself, or a new
`core/self_improve/distill.py` if that's cleaner given `self_improve/` already owns
episodic reads via `cluster.py::detect_repeat_clusters`. Pick whichever avoids a
circular import; check what `memory.py` and `self_improve/logger.py` already import
from each other before deciding.

It should:
- Read recent rows from `episodic.db` via `recent_requests(user_root, limit=...)`
  (self_improve/logger.py) — reuse this reader, don't write a second SQLite query
  path.
- Run exactly ONE LLM call per distillation batch (Mem0's actual pattern: single-pass
  ADD-only extraction, not one call per row) that extracts durable, generalizable
  facts from the batch of transcript excerpts / intent tags / success signals — e.g.
  "this student re-routes to canvas-week-plan every Sunday night", not a copy of the
  raw transcript. Use whatever LLM call surface already exists in this repo for
  read-only synthesis (check `core/llm_provider.py` if it exists yet per the
  provider-abstraction work in `cursor-build-prompts-2026-09-07.md` Prompt A — if it
  hasn't landed, this prompt should implement against whatever minimal provider call
  is already wired for skill execution, not invent a second one).
- Write extracted facts via `add_memory()` in `core/memory.py` — additive only, one
  call per extracted fact, never edit/delete existing lines. This is the ADD-only
  contract from Mem0 and it's also just how this repo already does everything durable
  (ledger.jsonl, MEMORY.md) — do not add an UPDATE or DELETE path.
- Tag each written fact with its provenance (e.g. the episodic.db row id(s) it came
  from) so a human/future pass can trace a fact back to the events that produced it —
  check whether `add_memory`'s `metadata` param already supports this (it does — see
  memory.py's signature) and use it rather than inventing a new field.

## 2. Watermark it — follow the exact pattern already designed for this exact problem

`learning_profile.py::compact_from_ledger` (around line 326) is a different function
solving the identical problem (replaying an overlapping window double-applies rows)
and its docstring plus `main()`'s docstring (around line 423-426) already spell out
the fix: persist a "last processed" marker in `user_root` and default `since` to it,
advancing after a successful run, with an explicit override still allowed. Copy that
pattern exactly for `distill_episodic_to_semantic` — do not invent a second watermark
mechanism or a second persistence convention. If `compact_from_ledger`'s own watermark
hasn't been built yet when you start this prompt, build both watermarks using the same
helper (factor it out) rather than writing it twice.

## 3. Manual invocation only — no scheduling, mirroring the same prior decision

Per the same file's `main()` docstring: this class of "reads accumulated history,
writes derived durable state" function is explicitly a product decision about
auto-running unattended, not an engineering default. Add a CLI subcommand (wherever
makes sense given where you put the function — `learning_profile.py`'s existing
`main()` with `save`/`signal` subcommands is the established pattern to follow, or a
new small CLI if you put this in `self_improve/`) that calls
`distill_episodic_to_semantic` and prints a summary (facts extracted, facts skipped,
watermark advanced to). Respect whatever `--json` flag convention the CLI you're
extending already has.

## Do NOT

- Do not call this from the daemon, a cron loop, or anywhere in the request-handling
  path (skill_router, prompt_assembly) — same reasoning as `compact_from_ledger`:
  auto-writing to a durable semantic store unattended is a product call the founder
  hasn't made yet.
- Do not add UPDATE/DELETE semantics to `add_memory` or the semantic store — additive
  only, matching Mem0's actual design and this repo's existing append-only convention
  everywhere else (ledger.jsonl, MEMORY.md).
- Do not wire real `mem0` package usage as a hard dependency — `add_memory`'s existing
  try/fallback structure (real `mem0` if installed, else `MEMORY.md` append) should
  stay; build the distillation call site to work correctly against either backend
  path, don't special-case one.
- Do not touch `self_improve/cluster.py`, `drafter.py`, `shadow.py`, `promoter.py` —
  that's Prompt H, and it depends on this prompt's output existing, not the reverse.

## Verification

- Full suite: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` must
  stay green (685+ passed baseline).
- New test(s) proving: (a) running distillation twice with no explicit `--since` never
  re-extracts the same episodic rows (the watermark test — mirror whatever test
  Prompt E eventually writes for `compact_from_ledger`'s idempotency, once it exists),
  (b) a batch of synthetic `episodic.db` rows with a clearly repeating pattern produces
  at least one written fact with correct provenance metadata.
- Manual smoke: seed a test user_root's `episodic.db` with a few dozen rows (repeat
  intent tags), run the new CLI subcommand, and read back `MEMORY.md` (or the real
  mem0 store if installed) to confirm a plausible distilled fact landed, not raw
  transcript text.
```

---

## Prompt H: Unlock procedural-memory growth, gated on real episodic + semantic signal

```
Depends on Prompts F and G having been running against a real session long enough to
produce actual repeat clusters and distilled facts — do not start this against a fresh
or synthetic user_root.

self_improve/{cluster,drafter,shadow,promoter}.py already implement the full
Voyager-style verify-before-promote loop and are fully tested in isolation
(`self_improve/__init__.py` exports `detect_repeat_clusters`, `draft_provisional_skill`,
`shadow_test`, `promote_skill`) — but nothing in daemon.rs, skill_router.py, or the app
calls any of them. Per docs/handoff/deferred.md: "Self-improve LLM critic
(draft_provisional_skill / shadow_test) — Deferred — Write-skill hard ban already
enforced; template + boolean critic stubs remain until episodic routing data exists."
That data now exists (Prompt F) and distilled facts exist to cross-check drafts
against (Prompt G) — this prompt is "episodic routing data exists" becoming true, not
a request to weaken the write-skill ban.

**The write-skill hard ban in `shadow.py` and `promoter.py` (category allowlist
checks against `WRITE_SKILL_CATEGORIES`) is a safety floor, not a quality gate — it is
explicitly documented as something contributors must not weaken. Nothing in this
prompt touches it.**

## 1. Replace the boolean critic stub in shadow.py with a real one

`shadow_test()` (self_improve/shadow.py, around line 23) currently takes
`baseline_ok`/`provisional_ok`/`critic_prefers_provisional` as plain booleans passed in
by the caller — there is no actual critic. Add a real critic call: given a provisional
skill's drafted behavior and a baseline (the existing routing/skill behavior for the
same intent_tag), have an LLM score which one handles a held-out sample of the
cluster's real transcript excerpts better. Reuse whatever LLM call surface Prompt G
ended up using (or `core/llm_provider.py` if Prompt A from the 2026-09-07 doc has
landed) — do not add a third ad hoc LLM call path in this codebase.

Keep `shadow_test`'s existing signature-shape contract (it returns a `ShadowResult`
with `allowed`/`provisional_better`/`reason`/`critic_score`) — callers and the existing
unit tests for the boolean-stub behavior should still make sense with a real critic
underneath; if the existing tests only make sense against a boolean stub, that's a
sign the function's public contract needs the tests updated, not a sign to change the
contract silently.

## 2. Wire the pipeline as a manual, explicit trigger only

Add a single new CLI entry point (a new small module, or a subcommand on whichever
existing self-improve-adjacent CLI makes most sense — check if one already exists
before adding a new file) that runs, in order, for a given `user_root`:
`detect_repeat_clusters` → for clusters above some minimum size, `draft_provisional_skill`
→ `shadow_test` the draft → on `provisional_better=True`, leave it provisional (do NOT
auto-call `promote_skill` from this same run — promotion already requires
`k_required` repeated successes per `promoter.py`, and that counter should accumulate
across real subsequent usage, not be satisfied by one CLI invocation).

## Do NOT

- Do not weaken, relocate, or add exceptions to the `WRITE_SKILL_CATEGORIES` /
  `READ_DRAFT_CATEGORIES` checks in shadow.py or promoter.py. If a real critic ever
  disagrees with the write-skill ban for some clever reason, that disagreement should
  surface as a log line, not a bypass.
- Do not call any of this from daemon.rs, a cadence loop, or a cron path — despite the
  doc-comment in daemon.rs referencing a "self-improve cron," no such wiring exists
  today and this prompt should not add it. This stays a manual, explicit, human-run
  step until there's a product decision to automate it (same posture as
  `compact_from_ledger` in Prompt E of the 2026-09-07 doc and
  `distill_episodic_to_semantic` in Prompt G above).
- Do not auto-promote from a single CLI run — `promote_skill`'s k-successes counter
  logic in promoter.py already exists and is correct; use it as designed, across real
  repeated usage, not short-circuited.
- Do not run this against a fresh/empty/synthetic user_root and call the result
  meaningful — the whole point is real signal from F and G.

## Verification

- Full suite: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` must
  stay green (685+ passed baseline, adjust upward as tests are added).
- New test(s) for the real critic in shadow_test, using recorded/fixture transcript
  excerpts rather than a live model call in CI (mock the LLM call, don't hit a real
  API in tests — same convention as everywhere else in this suite).
- Manual smoke against a real (non-fresh) dev user_root with several weeks of Prompt-F
  logging behind it: run the new CLI entry point, confirm it drafts at most a small
  number of provisional skills (not one per cluster indiscriminately — sanity-check
  the minimum cluster size threshold), and confirm no write-category skill is ever
  drafted or shadow-tested (grep the run's output/logs for category values against
  `WRITE_SKILL_CATEGORIES`).
```
