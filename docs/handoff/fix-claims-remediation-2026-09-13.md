# Fix-claims remediation — 2026-09-13

Follow-up to the independent audit of two claimed fixes (skill-router
misroutes + onboarding → USER.md). This note states what landed and what
still does **not** count as proof.

## Verdicts after remediation

| Claim | After this pass |
|-------|-----------------|
| Router misroute “fixed” | **Correct structured routes** for the two audit paraphrases (`triage my assignments` → `student-assignment-triage`, `update my canvas sync` → `student-canvas-browser`), via skill `## Triggers` + week-plan prose hygiene + keyword bonus stopwords. Keyword ambiguity margin remains a safety net for true collisions — it is **not** the same math as embedding `COSINE_MARGIN`. |
| Onboarding → USER.md “fixed” | Writer + Profile UI remain; **Tauri ACL now allowlists `save_user_profile`**. Institution fills from `schools/{slug}.yaml` when blank; Program preserves Years at school; empty Values no longer overwrite the template. |

## Honesty boundaries

- **`cargo check` ≠ desktop E2E.** Compiling and registering the command is necessary but not sufficient; ACL allowlisting was the missing piece. A full Tauri-webview click-through of Profile → `{user_root}/USER.md` on disk is still the gold-standard smoke (packaging/signing may still block a local shell launch).
- **Vite web preview ≠ USER.md write.** `saveUserProfile` still stubs to `localStorage` when `!isTauri()` — intentional for preview; do not treat browser Continue as persistence proof.
- **“Ambiguous” was never “correct routing.”** The earlier keyword-only patch stopped silent wrong picks by returning `skill=None`. That was a safety net, not a product fix. This pass adds the intended skill selection for the two documented paraphrases.

## What changed (product)

- Tauri: `save_user_profile` in `build.rs`, `capabilities/default.json`, and autogen permission toml.
- `user_profile.py`: registry institution, preserve Years at school, leave empty Values / Throwaway alone.
- Onboarding Profile copy: transfer notes only; documents dual-write to `priorities.txt` at finish.
- Skills: week-plan description/triggers softened; triage + canvas-browser triggers cover the audit paraphrases.
- `skill_router.py`: bonus stopwords (`my`, `the`, …); comment no longer claims keyword ratio “mirrors” embedding margin.

## Smoke (non-Tauri)

```bash
# Writer path the daemon invokes
DEV_USER_ROOT=/tmp/pn-user-profile-smoke \
  uv run python -m canvas_mcp.core.user_profile --json save \
  --name "Avery" --school-slug cu-boulder --major "CS" --interest "infra"

# Router paraphrases
uv run python -m canvas_mcp.core.skill_router --json "triage my assignments"
uv run python -m canvas_mcp.core.skill_router --json "update my canvas sync"
```
