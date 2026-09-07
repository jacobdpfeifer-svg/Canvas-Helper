# Ruthless macro audit-and-fix prompt (architecture + system level)

Hand this whole file to the architect agent (Cursor or otherwise) as its task prompt. It supersedes nothing in [`architect-brief.md`](./architect-brief.md) — it operates one level above it.

---

## Your mandate

The last few passes over `TheUltimateStudent:TeacherWorkflow` (shipping identity `ProductName`, `com.productname.student`) were line-level: grep for a hardcode, confirm a token check, close a specific must-fix. That work is done and is not what this pass is for.

This pass is **macroscopic**. Stop checking whether individual claims are true and start asking whether the *system as a whole* — its architecture, module boundaries, subsystem count, and complexity budget — is the right shape for what this product is actually trying to be. You are looking for:

- **Structural drift**: subsystems that exist because of how the product evolved (personal tool → multi-tenant pivot → app shell → actuators), not because the current design calls for them.
- **Redundant or competing implementations** of the same concern living in different layers.
- **Scope the codebase is carrying that the product doesn't need**, and scope the product needs that no part of the codebase currently owns.
- **Complexity that isn't earning its keep** — abstractions, config layers, or indirection introduced for a future that may not be the future this product is actually heading toward.

A finding at this level is not "line 42 has a hardcoded string." It's "these two files implement overlapping routing logic and one of them should not exist" or "the permissions/ledger/tenant/user_root split across four modules could be two." **When you find a structural problem, restructure — don't just annotate it.** A memo proposing a refactor without doing it is an incomplete pass unless the change is genuinely too large/risky to do unsupervised (see Escalate-only list).

### Ground rules

1. **Read before you judge.** Read entire files/modules in the area under review, not excerpts — a macro judgment based on grep hits is not a macro judgment.
2. **Prefer deletion and consolidation over addition.** If two things do overlapping work, the fix is usually to merge or remove one, not to add a third abstraction that mediates between them.
3. **No refactor theater.** Renaming files, moving code between directories, or extracting an interface with one implementation is not a structural fix unless it actually removes duplication, clarifies an owning module, or cuts a real dependency.
4. **Justify every subsystem's right to exist.** For each major module/directory, you should be able to state in one sentence what it owns and why nothing else could own it. If you can't, that's a finding.
5. **Weigh against the stated scope in [`CLAUDE.md`](../../CLAUDE.md) and `docs/architecture.md`.** Educator tools, hosted Azure, and quiz-taking automation are permanently out — flag anything that's silently rebuilding toward them, even partially.
6. **Every structural change needs a before/after**: what owned this concern before, what owns it now, and the test/build command proving nothing broke.
7. **Don't trade macro problems for macro risk.** A restructure that touches security invariants (ConfirmationGuard, tenant isolation, permissions defaults) needs the existing security test suite green before and after, not just "looks equivalent."

### Escalate-only list (propose the change, do NOT execute it)

- Any restructure that would change the product's core interaction model (e.g., replacing the Tauri app shell, replacing the skill/permission/ledger model) — these are product bets, not refactors.
- Anything requiring a real paid credential you don't have.
- Anything that would delete or rewrite the *design* of a subsystem the user hasn't reviewed yet (as opposed to consolidating an already-agreed design's implementation).

Propose these with a one-paragraph rationale and a rough diff-shape, and stop there.

---

## Audit surface — think in layers, not files

### 1. Whole-repo shape

- Walk the top-level layout (`AGENTS.md`, `schools/`, `browser/`, `src/canvas_mcp/`, `skills/`, `app/`, `plugins/`, `mcp-servers/`, `docs/`) and ask: does this map cleanly onto the five items in the "Truth path" in `CLAUDE.md`, or has it accreted extra layers? Name anything that doesn't map.
- Count and characterize the "routing" logic: `src/canvas_mcp/core/skill_router.py` vs the new untracked `src/canvas_mcp/core/skill_route.py` — read both in full. If they overlap, decide which one is the real implementation and remove the other, updating every caller. Don't leave both "for now."
- Same treatment for `src/canvas_mcp/core/learning_profile.py` / `learning_profile_cli.py` / `diagram_gen.py` and the new `app/src/components/learningProfile/` — is this one feature with a coherent frontend/backend contract, or two half-built ideas that happened to land in the same window? If the backend and frontend don't actually talk to each other yet, say so and either wire them or park the whole feature behind a clear "not yet integrated" boundary instead of scattering half-pieces across the tree.

### 2. Multi-tenant foundation vs. actual tenant count

- The tenant/user_root/permissions/ledger split (W0 in the old brief) was built for N schools and N students. Right now there's effectively one school (`cu-boulder`) and one real user. Is the abstraction layer proportionate, or is it solving for a scale that doesn't exist yet at the cost of every change needing to touch four modules? Give a concrete recommendation: keep as-is, or collapse specific seams.
- Look at `schools/_template.yaml` vs `schools/cu-boulder.yaml` — is the template actually generic, or does it still assume CU-shaped data (course_file_map, timezone assumptions, legal_notice format) that would break for school #2? If nobody has stress-tested a second school, treat the "multi-tenant" claim as unproven and say so.

### 3. App shell architecture (Tauri + daemon + router)

- Read `app/src-tauri/src/{main,daemon,commands,dock,inbox}.rs` together as one system. Is the boundary between "Tauri command handlers," "daemon cadence loop," and "dock/inbox" logic coherent, or did each land as its own file without a shared ownership model? Propose (and apply, if small enough) a clearer split if not.
- `app/src/dockWindow.ts`, `app/src/ipc.ts`, `app/src/components/CommandPalette.tsx`, `app/src/components/Onboarding.tsx` — is the frontend↔Rust IPC surface consistent (one pattern for invoking commands, one pattern for events), or has it grown multiple ad hoc conventions? Consolidate to one pattern if it's grown more than one.
- Is the Native Messaging host (`app/native-messaging/`) a first-class part of this architecture or a bolted-on side channel? If the daemon, the Tauri app, and the Chrome extension each independently know how to reach Canvas/skills, that's three actuator paths for one product — decide if that's intentional layering or accidental duplication.

### 4. Security/permissions architecture, not just invariants

- Don't re-verify individual ConfirmationGuard checks (already done). Instead ask: is the *model* right — one global `permissions.yaml` + a `ledger.jsonl` + per-tool guards — for where this product is going (more actuators, more schools, eventually more automation)? Where would this model break first as the product grows, and is there a cheap structural change now that prevents a expensive one later?
- `mcp-servers/common/google_oauth.py` and any sibling actuator wiring (gcal/apple-cal/gmail) — is there a shared actuator interface/contract, or does each integration reinvent dry-run/live switching, undo_ptr shape, and credential handling independently? If each one reinvents it, extract the shared contract now, before a third and fourth actuator make the divergence expensive to fix.

### 5. Skills as a subsystem

- Read across all `skills/*/SKILL.md` bodies at once, not one at a time. Is there real duplication of logic/instructions across skills that should be a shared reference or shared tool instead of copy-pasted per skill? Consolidate where found.
- Is the skill schema (`schema_version`, `category`) actually load-bearing anywhere, or is it a versioning scheme for a population of ten skills that doesn't need one yet? Judge honestly.

### 6. Docs vs. system reality, at the architecture level

- `docs/architecture.md` — redraw it (or correct it in place) so it reflects the system as it exists after your consolidation, not the aspirational one. If entire subsystems described there don't exist yet (or exist as stubs), the doc should say so plainly, not imply they're built.
- `docs/design/ambient-dock-ui.md` and `docs/design/learning-profile.md` — classify each as **built**, **partially built**, or **design-only, no code yet**, and make sure the surrounding code matches that classification after your pass (either the code catches up, or the doc is clearly marked forward-looking).

### 7. Test suite shape

- Is the test suite organized around the current architecture, or around an older one? E.g., do `tests/core/test_diagram_gen.py`, `test_learning_profile.py`, `test_skill_router.py` (untracked, new) actually exercise the consolidated modules from section 1, or do they test a version of the code you're about to change out from under them? Update tests to match whatever you consolidate — don't leave tests asserting on code paths you removed.
- Run the full suite before and after your structural changes and report both real counts:

```bash
uv run python -m pytest tests/ -q
```

---

## Deliverable

A new dated architecture brief (`docs/handoff/architecture-audit-<date>.md`) structured as:

1. **System map as-built** — one diagram + one paragraph per major subsystem, each stating what it owns and why it's separate from its neighbors.
2. **Structural findings** — each one framed as "X and Y overlap/compete/are disproportionate to current scale," with the consolidation you applied and the before/after test result.
3. **Consolidations applied this pass** — concrete diff summary (files merged, removed, or re-scoped), not just narrative.
4. **Escalate** — only items from the Escalate-only list, each with a one-paragraph rationale and rough diff-shape, left undone on purpose.
5. **Complexity budget verdict** — one paragraph: is this codebase currently over-engineered, under-engineered, or roughly proportionate to what it's actually serving today? Be willing to say "this needs to be simpler" even if every individual line is correct.

If your deliverable contains zero consolidations or removals, treat that as a signal you stayed at the line level instead of the system level — go back through sections 1–6 and look for what should be merged, cut, or unified before concluding the architecture is sound.
