# Full-program audit prompt — 2026-09-15

A standing prompt for a comprehensive, end-to-end audit of this repo: run every piece that can be run, verify every wire that connects one part to another, and then step back and look at the system's shape. Three passes, in this order: **run pass** (exhaustive, mechanical), **wire pass** (mechanical, cross-referencing), **shape pass** (open-ended, structural, with real leeway). Don't skip to the shape pass — you need the first two passes' inventory to reason about structure honestly, and a shape judgment made from grep hits instead of full reads is not a shape judgment.

This supersedes nothing in [`full-repo-audit-prompt.md`](../audits/full-repo-audit-prompt.md) or [`audit-prompt-next.md`](./audit-prompt-next.md) — it merges their intent into one pass and should be treated as the current version. Read both of those for style/precedent, but follow this file as the operative instructions.

---

## The prompt

You are doing a full audit of this repository. Read `CLAUDE.md`, `AGENTS.md`, and `docs/architecture.md` first — they define scope boundaries that override anything below. In particular:

- **Do not** restore educator tools, hosted Azure, or quiz-taking automation.
- **Do not** add an execute path to `submit_assignment` or any Canvas comment/discussion-post tool — preview-only, permanently.
- **Do not** build a Buff Portal/DegreeWorks scraper, login, or registration/add-drop execute path.
- **Do not** re-add the `self_improve` cluster/draft/shadow/promote pipeline.
- **Do not** add learning streaks or leaderboards (brief-day continuity in `habit` is fine — it is not a streak).
- Personal Gmail send / Google Calendar writes are real execute paths, but only ever behind `ConfirmationGuard`/`gate_connector_write` (preview → per-instance human yes → execute). Apple Calendar stays hard-blocked.

If your audit finds something that *looks* like a gap against one of these, it is a deliberate boundary — note it as "confirmed intentional," don't fix it, don't propose fixing it.

### Pass 1 — Run everything (exhaustive, mechanical)

Goal: every runnable piece of this program actually runs, right now, and you've read its output, not just its exit code.

1. **Inventory the whole tree** before running anything: `AGENTS.md`, `browser/` (SSO sync scripts), `src/canvas_mcp/` (vendored MCP + `core/` + `tools/` + `resources/`), `skills/*/SKILL.md`, `app/` (Tauri shell — check `git log`/`git status` for whether it's genuinely parked or being actively edited), `plugins/`, `schools/`, `mcp-servers/` (apple-cal, gcal, gmail), `tools/` (manifest + schemas), `docs/`, `tests/`. Build a real mental map of what calls what — don't rely on directory names alone.
2. **Run every test suite that doesn't need live credentials**, and read the actual failures, not just pass/fail counts:
   - `uv run python -m pytest tests/ -q` — then re-run any failing file alone with `-v` to see what actually broke
   - `cd browser && npm run test` (`node --test tests/*.test.mjs`)
   - Any tests under `mcp-servers/*/` or `app/src-tauri/` (`cargo test` if Rust tests exist and the crate builds)
3. **Run every static check**:
   - `uv run ruff check .`
   - `uv run mypy` (config in `pyproject.toml`)
   - `cd app && npm run build` if `app/` has uncommitted or recent changes (tsc + vite); if truly parked, skip the build but still read the source for dead wiring
   - `cd browser && node scripts/validate-profiles.mjs` if present and cheap
   - Any other `npm run <script>` / `uv run <script>` you find in `package.json` / `pyproject.toml` that's cheap and doesn't require live network, SSO, a PAT, or sends real email/calendar writes
4. **Exercise the tool layer directly**, not just via pytest: for each `@mcp.tool()` in `src/canvas_mcp/tools/`, confirm it has `@validate_params`, confirm its `readOnlyHint`/write classification matches what it actually does, and spot-check a few with representative inputs against `tools/TOOL_INPUT_SCHEMAS.json` / `tools/TOOL_MANIFEST.json` to see if the manifest is still accurate.
5. Skip only what genuinely can't run headless here: live Canvas SSO/PAT calls, real Gmail send, real Calendar writes, anything needing a paid credential you don't have. Say explicitly what you skipped and why — don't silently omit it.

### Pass 2 — Wire audit (mechanical, cross-referencing)

Goal: everything that's supposed to be connected to everything else actually is.

- Every `SKILL.md` cross-reference (`[text](../other-skill/SKILL.md)`, doc links) — does the target exist at that exact path?
- `skills/_SESSION.md` and `src/canvas_mcp/core/skill_router.py` — does the router's trigger table match the skill index in `AGENTS.md`? Any skill directory with no router entry, or router entry with no directory? Check for a stray `skill_route.py` vs `skill_router.py` — if both exist, read both fully and flag it as a same-window duplicate, don't assume one is dead.
- Bucket-A connector writes go through `canvas_mcp.core.connector_guards.get_connector_guard` — trace every write path and confirm no bypass branch exists.
- `plugins/*/` directories vs. their registry entries in `browser/scripts/lib/connector-registry.mjs` (or wherever the registry lives now) — every plugin registered, every registry entry backed by a real directory.
- Personal Gmail/GCal write tools (`send_email`, `create_event`, `update_event`) — confirm `ConfirmationGuard`/`gate_connector_write` sits in front of every execute call, with no standing/automatic posture anywhere in the call graph.
- Dead imports, unused exports, TODO/FIXME/XXX comments older than the most recent related commit, config keys read by nothing, `.env.example` vs. actual env var usage drift.
- `docs/architecture.md` and `docs/handoff/*.md` claims vs. actual code — flag doc drift (don't necessarily fix all of it; large doc rewrites can go to the report).
- **Do a fresh out-of-scope grep across the whole tree** (`examples/`, `skills/`, `docs/`, `src/`) for grading/bulk-grade/quiz-solve/educator-automation/hosted-Azure/RateMyProfessors-scraping language. A prior pass claiming a category is "swept" is not proof — re-grep it yourself.

**Fix inline** anything small, mechanical, and low-risk: broken relative links, genuinely dead code with no callers, mismatched router/skill entries, failing lint/type errors, an obviously-wrong logic bug caught by a failing test, a missing `@validate_params`, an unregistered plugin.

**Don't fix inline — log to the report** anything that needs a product judgment call, touches the guardrails above, needs live credentials to verify, or is non-trivial in size.

Follow the repo's git safety rules throughout: no `git add -A`, no destructive commands, no force-push, never commit `.env` or `browser/.auth/`. Stage and describe fixes; don't commit unless asked.

### Pass 3 — Shape (open-ended, structural — take real leeway here)

Goal: is the program's *shape* right, not just its wiring. This is deliberately the least constrained part of the exercise — after two passes of mechanical verification you've earned the right to zoom out, so use it. Don't just annotate a list of nitpicks; look for the few things that, if changed, would make the rest of the codebase easier to reason about.

Read whole files/modules in the area you're judging, not excerpts — a macro judgment from grep hits isn't one. For each major module/directory, you should be able to state in one sentence what it owns and why nothing else could own it; if you can't, that's a finding.

Prompts to work from, not a checklist to complete mechanically:

- **Redundant/competing implementations.** Where does the same concern get implemented twice in different layers (`browser/` scripts vs. `src/canvas_mcp/core/` vs. `skills/`)? Where do two files land in the same window solving the same problem (the repo has precedent for this — `skill_route.py`/`skill_router.py`, `learning_profile.py`/`learning_profile_cli.py` were past instances; check whether new ones have appeared)?
- **Truth-path integrity.** Is "SSO → `/api/v1` → inbox, PAT as optional fallback" actually followed everywhere, or have shortcuts crept in that read Canvas some other way?
- **Proportionality.** Is the tenant/user_root/permissions/ledger split proportionate to the actual current scale (one school, effectively one real user), or is it paying a tax for N schools that don't exist yet? Is the skill-router/SKILL.md-per-capability pattern straining at the current skill count, or still comfortable? Don't reflexively say "collapse it" — say what you'd actually observe if it were straining, and whether you see that observation or not.
- **Vendor drift.** Is `src/canvas_mcp/` (the upstream `canvas-mcp` fork) drifting from `vendor/README.md`'s stated boundary in a way that's getting harder to merge?
- **App shell coherence.** If `app/` (Tauri) has real recent activity: is the Tauri-command/daemon-loop/dock-inbox split coherent, or did each land as its own file without a shared ownership model? Is there one IPC convention or several ad hoc ones? If it's genuinely parked, don't force a finding here — say so and move on.
- **Actuator contract.** `mcp-servers/{apple-cal,gcal,gmail}` and any sibling actuator wiring — is there a shared contract for dry-run/live switching, undo_ptr shape, and credential handling, or does each integration reinvent it? If a third/fourth actuator is coming, is now the cheap time to extract the shared contract?
- **Test suite shape.** Unit vs. integration balance, anything structurally untested (not just uncovered lines — whole categories of behavior), tests that assert on a code path that no longer exists.
- **Anything structurally thin** you noticed in Pass 1/2 that didn't fit those passes' mechanical frame — surface it here instead of dropping it.

**You're explicitly allowed to go outside the repo for this pass** — look at how comparable projects are built: the upstream `vishalsachdev/canvas-mcp` this repo forks, other "read-only assistant with human-confirmed write gate" architectures, other local-first SSO-cookie-sync tools, other skill/tool-routing patterns. The point isn't to import someone else's stack — it's to sanity-check whether this repo's own patterns have calcified into something more complicated than the problem needs, or whether they're actually the right shape. Bring back concrete comparisons ("project X gates writes with Y pattern — here's how that does or doesn't map onto `connector_guards.py`"), not vague inspiration.

**For this pass, propose — don't implement**, with one exception: if a structural fix is genuinely trivial (a same-window duplicate file with zero callers on one side, a doc that flatly contradicts the code next to it) you may apply it, but only if you can state the before/after and the test command that proves nothing broke. Anything bigger than that — even if you're confident — goes to the report as a proposal with a size/risk estimate (trivial / small / needs a real plan), not a diff. Structural changes are too risky to land unreviewed in an audit sweep; the value of this pass is a sharp, well-argued proposal the user can approve, not a surprise refactor in the working tree.

**Escalate-only, propose only, never execute:**
- Anything that would change the product's core interaction model (replacing the app shell, replacing the skill/permission/ledger model).
- Anything requiring a real paid credential you don't have.
- Anything that would delete or rewrite the *design* of a subsystem the user hasn't reviewed yet.
- Anything already logged as an open decision in `docs/handoff/pre-ship-decisions.md` — point at that row instead of re-litigating it.

If your Pass 3 output contains zero structural observations worth naming, that's a signal you stayed mechanical — go back over the prompts above before concluding the shape is sound. It's equally a bad outcome to force consolidations where none are warranted just to have something to report; say "proportionate, no change" where that's the honest read.

### Output

Produce a single dated report at `docs/handoff/audit-2026-09-15.md` with four sections:

1. **Ran** — every command you actually executed (Pass 1), pass/fail, and for any failure: what broke and whether you fixed it or logged it.
2. **Fixed** — each inline fix from Pass 1/2, one line, with the file(s) touched.
3. **Findings, not fixed** — each issue from Pass 1/2 you didn't fix inline, why, and what a real fix would require.
4. **Shape observations** — from Pass 3, each as: what you observed (with the specific files/modules), why it matters, the concrete proposal, size/risk estimate, and any external comparison that informed it. Include explicit "proportionate, no change" verdicts where you looked and found nothing wrong — don't only report problems.

Then stop. Don't commit. Tell the user what's in the working tree (if anything was fixed inline) and hand them the report.

---

## Notes for whoever launches this

- Run it in a worktree or a throwaway branch — Pass 1/2 can produce a real diff even when scoped to "safe, mechanical" fixes.
- It can't verify anything gated behind live Canvas SSO, a PAT, or real Gmail/Calendar sends — those stay manual, and the report should say so plainly rather than silently skip them.
- Re-run periodically rather than treating one run as exhaustive — Pass 3 in particular is meant to surface different things depending on what's changed since the last pass.
