# Pre-ship decisions and human walk — 2026-09-07

Product calls and credentialed checks. Jacob signs a row by editing its Status to `signed` and writing the choice. Agents must not invent signatures.

## Product decisions (signed 2026-09-12)

| # | Decision | Choice (signed) | Status |
|---|----------|-----------------|--------|
| 1 | `src/canvas_mcp/` identity | **Vendored** upstream [vishalsachdev/canvas-mcp](https://github.com/vishalsachdev/canvas-mcp). Keep upstream `CHANGELOG.md`; do not rewrite it as ProductName history. Prefer ProductName features outside the vendored MCP tree (`app/`, `browser/`, `skills/`, `plugins/`, `mcp-servers/`). Document the boundary in [`vendor/README.md`](../../vendor/README.md) and the banner atop `CHANGELOG.md`. | **signed — vendored** |
| 2 | `app/billing/` and `app/mobile/` | **Delete.** No monetization this phase. Scrub Stripe/Twilio/billing stubs from the product tree. Revisit only if a later product call reopens charging. | **signed — delete** |
| 3 | Tauri ambient-dock model | **Park.** Keep peek/expanded/onboarding as built; do not finish Hidden/auto-peek or replace the shell in this pass. UI quality is acknowledged as not ship-ready; alternatives compared in [`ui-shell-alternatives.md`](./ui-shell-alternatives.md). Stay on Tauri until a later signed replace. | **signed — park** |
| 4 | Packaging trigger | **Not yet.** Needs more product/UI work before “worth installing.” No notarized `.dmg`; local `cargo`/unsigned build only for dev. | **signed — not yet** |

## Human verification walk (not agent work)

Order is privacy first, then “can we claim this works.”

| # | Check | Needs | Procedure | Done |
|---|-------|-------|-----------|------|
| 1 | Git-history purge of the Jacob corpus | Explicit approval to rewrite and force-push | [`history-purge.md`](./history-purge.md). **Completed 2026-09-12:** `git filter-repo` stripped `dev/` / `.jacob/` / `inbox/`; `git show 37f38b3:dev/JACOB.md` now fails; `phase1-productname-pivot` force-pushed. Local `pre-purge-backup` tag deleted earlier. | **done** |
| 2 | Live Google OAuth smoke | Real Google Cloud OAuth client | [`oauth-smoke.md`](./oauth-smoke.md) — Jacob runs (read/draft only) | |
| 3 | Chrome Native Messaging round-trip | Loaded extension + real Chrome profile | Host framing unit-tested only — Jacob runs | |
| 4 | Real two-device SSO | Second device or account | Root isolation tests ≠ two SSO sessions — Jacob runs | |
| 5 | Packaging / Apple notarization | Decision 4 signed **worth installing** first | Deferred — decision 4 is **not yet** | n/a until decision 4 flips |

## Agent progress

- 2026-09-12 pre-ship audit: discussion/photo preview-only, dock honesty, legal drafts, CI on phase1.
- 2026-09-12 decisions signed (this file): vendored MCP, delete billing/mobile, park Tauri, packaging not yet.

## What agents must not do

- Do not reopen rows 1–4 without a new Jacob signature.
- Do not re-add `app/billing/` / `app/mobile/` or Stripe/Twilio wiring.
- Do not replace the Tauri shell or start notarization while decisions 3–4 remain park / not yet.
- Do not rewrite upstream `CHANGELOG.md` to look like a ProductName product history.
- Do not add `llm_provider_cli.py` or a chat call site besides `prompt_assembly.chat_assembled` / `chat_skill`.
