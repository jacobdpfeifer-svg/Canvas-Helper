# Pre-ship decisions and human walk — 2026-09-07

Unsigned product calls and credentialed checks. Agents must not implement these, re-audit them as code health, or treat "escalate" as done. Jacob signs a row by editing its Status to `signed` and writing the choice.

Audit consolidations this list used to warn were uncommitted are already in git: `328c97b` (skill_route / learning_profile CLI fold, shared actuator gate) and `fca8da2` (audit trail, billing/mobile out of truth path). Do not recommit that work. Unrelated working-tree type-hygiene is not part of this list.

## Product decisions (unsigned)

Do not pick these in an audit pass. Leaving them escalated is how the product stays undefined.

| # | Decision | Options | Current facts | Status |
|---|----------|---------|---------------|--------|
| 1 | `src/canvas_mcp/` identity | **Vendored:** stop ProductName-only edits inside it; pin/upstream; keep `CHANGELOG.md` as upstream's. **Owned:** ProductName changelog/identity; stop treating vishalsachdev/canvas-mcp issue numbers as this product's history. | `CHANGELOG.md` still reads as upstream (own versions, FERPA history, canvas-mcp issues). CLAUDE.md step 4 treats it as optional PAT MCP. | unsigned |
| 2 | `app/billing/` and `app/mobile/` | **Ship:** wire only after this row is signed (Stripe/Twilio stay off the truth path until then). **Delete:** remove the directories after this row is signed. | Stubs only. [`app/billing/STATUS.md`](../../app/billing/STATUS.md) and [`app/mobile/STATUS.md`](../../app/mobile/STATUS.md) already say out of truth path. | unsigned |
| 3 | Tauri ambient-dock model | **Keep and finish** Hidden-as-default and narrate-auto-peek. **Park:** leave peek/expanded as-built and mark the rest design-only. **Replace:** new shell — do not start without this signature. | [`docs/design/ambient-dock-ui.md`](../design/ambient-dock-ui.md) is partially built. Mock NarrateAfter / STOP in React are stubs, not a decision. | unsigned |
| 4 | Packaging trigger | **Worth installing:** schedule the walk item 5 below. **Not yet:** rewrite the trigger again with a new code bar. | Skill router consolidated, skills structural-pass, tray boots. That bar looks met. It is not approval to notarize. | unsigned |

Until row 1 is signed, do not add ProductName-only features under `src/canvas_mcp/` that would make the fork harder to track upstream, and do not rewrite `CHANGELOG.md` to pretend the identity is settled.

Until rows 2–3 are signed, do not wire Stripe/Twilio, do not delete `app/billing/` or `app/mobile/`, and do not replace the Tauri shell.

Until row 4 is signed, do not start notarization or a distribution `.dmg`.

## Human verification walk (not agent work)

Legitimate escalations. They need credentials, hardware, or an explicit force-push. Schedule one pass; do not let a later audit rediscover them.

Order is privacy first, then "can we claim this works." Billing/Twilio stay off this walk until decision 2 is signed **ship**.

| # | Check | Needs | Procedure | Done |
|---|-------|-------|-----------|------|
| 1 | Git-history purge of the Jacob corpus | Explicit approval to rewrite and force-push `phase1-productname-pivot` | [`history-purge.md`](./history-purge.md). Working tree is clean; `git show 37f38b3:dev/JACOB.md` still returns the profile. Do not merge this tip to a public default branch until this completes. | |
| 2 | Live Google OAuth smoke | Real Google Cloud OAuth client; do not commit secrets or `token.json` | [`oauth-smoke.md`](./oauth-smoke.md). Dry-run is tested; consent + Calendar/Gmail round-trip is not. | |
| 3 | Chrome Native Messaging round-trip | Loaded extension + install script on a real Chrome profile | Host framing is unit-tested only. | |
| 4 | Real two-device SSO | Second device or account | `test_two_user_isolation.py` proves separate roots, not two SSO sessions. | |
| 5 | Packaging / Apple notarization | Decision 4 signed, then Developer ID env (`APPLE_ID`, `APPLE_TEAM_ID`). Never commit them. | [`packaging-notes.md`](./packaging-notes.md). Unsigned `tauri build` may precede notarization. | |

## What agents must not do

- Do not open another consolidation pass on pairs already folded (`skill_route.py`, `learning_profile_cli.py`, the three actuator gates).
- Do not add a generic actuator protocol, billing enforcement, or a second LLM framework to "finish" a row above.
- Do not add `llm_provider_cli.py` or a chat call site besides `prompt_assembly.chat_assembled` / `chat_skill`. Scan on 2026-09-07: one factory (`get_provider`); embed goes through that factory from `skill_router`; no Ollama chat path left in `*.py` / `*.rs` / `*.ts` / `*.tsx`.
