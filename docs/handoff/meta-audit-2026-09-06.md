# Meta-audit — 2026-09-06 (checking the auditors)

Scope: independently re-derive every material claim in `architect-brief.md`, `architecture-audit-2026-09-06.md`, `deferred.md`, `oauth-smoke.md`, `packaging-notes.md`, `history-purge.md`. No claim was accepted on the strength of its prose.

## 0. Audit artifact inventory

| File | Tracked in git? | Produced by | Supersedes / relation |
|------|------------------|-------------|------------------------|
| `architect-brief.md` | Yes (committed `d0f1ef1`, then modified in working tree) | Line-level "must-fix" pass, co-authored by Cursor for the committed portion; a second uncommitted re-audit pass layered on top | States it supersedes its own prior version; superseded for *architecture shape* by `architecture-audit-2026-09-06.md` |
| `architecture-audit-2026-09-06.md` | **No** — untracked, working-tree only | Macro consolidation pass | References `architect-brief.md` and `oauth-smoke.md` |
| `deferred.md` | No — untracked | Same macro pass | Cross-links `oauth-smoke.md`, `history-purge.md`, `packaging-notes.md` |
| `oauth-smoke.md` | No — untracked | Must-fix pass | Referenced by `architect-brief.md` §7, `deferred.md` |
| `packaging-notes.md` | No — untracked | Earlier pass (16:12, oldest handoff file) | Referenced by `architect-brief.md` §11, `deferred.md` |
| `history-purge.md` | No — untracked | Must-fix pass | Referenced by `architect-brief.md`, `deferred.md` |
| `audit-prompt-next.md`, `audit-prompt-meta-check.md` | No — untracked | Prompt authors (not audit output) | This file's own governing prompts |

**Finding A0 (minor, informational):** every handoff doc except `architect-brief.md` is uncommitted working-tree state. That's consistent with the visible git status at session start, not a false claim by itself, but it means none of the "consolidations applied this pass" in `architecture-audit-2026-09-06.md` have actually landed in a commit — they're still just files on disk. If this session's tree were discarded, the entire macro pass (skill_route fold, learning_profile_cli fold, actuator.py, doc rewrites) would vanish with no commit to recover from. Worth committing before calling any of it "shipped."

## 1. Claim ledger

| # | Claim | Source | Verdict | Evidence |
|---|-------|--------|---------|----------|
| 1 | Full suite: 615 passed, 19 skipped | architect-brief §1, architecture-audit "After" | **confirmed** | Re-ran `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` → `615 passed, 19 skipped in 3.68s`, exact match |
| 2 | Security slice: 97 passed | architect-brief §1, §4 | **confirmed** | Re-ran the two-file security command → `97 passed`, exact match |
| 3 | `skill_route.py` deleted, folded into `skill_router.py` | architecture-audit finding #1 | **confirmed** | `skill_route.py` absent from `src/canvas_mcp/core/`; `daemon.rs` spawns `canvas_mcp.core.skill_router` (not `skill_route`) |
| 4 | `learning_profile_cli.py` deleted, folded into `learning_profile.py` | architecture-audit finding #2 | **confirmed** | File absent; `daemon.rs` spawns `canvas_mcp.core.learning_profile` |
| 5 | `mcp-servers/common/actuator.py` extracted; gcal/gmail/apple-cal all use it | architecture-audit finding #3 | **confirmed** | File exists with `user_root()`/`check_write()`; all three server files import it |
| 6 | Gate1 `or True` noop removed | architect-brief §2 row 5 | **confirmed** | `test_gate1_manifests_renamed` in `tests/core/test_verification_w5.py` has no `or True`; asserts real string checks |
| 7 | `send_email` hard-blocked, JSON not string | architect-brief punch list #2 | **confirmed** | `mcp-servers/gmail/server.py:219-224` returns `{"blocked": True, ...}` |
| 8 | Cloud key optional at onboarding (UI + backend) | architect-brief punch list #6 | **confirmed** | `Onboarding.tsx` has "Skip cloud key & finish"; `commands.rs::save_onboarding` only calls `save_cloud_key` when non-empty, no error on blank |
| 9 | NM template `allowed_origins` filled with stable extension ID | architect-brief punch list #3 | **confirmed** | `com.productname.daemon.json` has `chrome-extension://jkjkbgcbpakeenemjgkfohbcfbghmall/` |
| 10 | Working-tree Jacob-identifier grep clean | architect-brief §5 | **confirmed** | Re-ran exact grep across all listed paths → zero matches |
| 11 | Jacob corpus still recoverable from branch history (`37f38b3:dev/JACOB.md`) | history-purge.md, architect-brief §5/§2 row 1 | **confirmed** | `git show 37f38b3:dev/JACOB.md` returns the Jacob profile; `git rev-list --objects` shows 10 objects still reachable for `dev/`/`.jacob/`/`inbox/` paths. Correctly labeled **not resolved** / escalate, not falsely claimed fixed |
| 12 | Tauri `cargo check` passes | architect-brief §7, §10 | **confirmed** | Re-ran; `Finished dev profile` in 2.2s |
| 13 | `describe_mode` MCP tool returns dry-run JSON | architect-brief punch list #1 | **confirmed** | Re-ran; `{"mode": "dry-run", "actuator": "gcal"}` exact match |
| 14 | 11/11 skills structural-pass | architect-brief §6 | **confirmed** | Re-ran `eval_all_bundled()`; all 11 skills `True`, matches the named list exactly (including the new `student-concept-visual`) |
| 15 | `test_two_user_isolation.py` proves root isolation, **not** two-device SSO | architect-brief §4, §2 row 4 | **confirmed** | Test fixture isolates via `tmp_path` + monkeypatched app-support root, not real OS accounts or SSO sessions. Correctly scoped, not oversold |
| 16 | Educator residue removed ("educator examples silently rebuilt out-of-scope surface" — fixed) | architecture-audit finding #6 | **partially false** | `examples/educator_quickstart.md` and `examples/bulk_grading_example.md` are confirmed gone (`git status` shows `D`), and `real_world_workflows.md` now states grading is out of scope. But `examples/common_issues.md` — not mentioned by this finding — still contained a live "Use the bulk grading code API to grade all submissions for Assignment 5" example, i.e. exactly the out-of-scope educator/grading automation CLAUDE.md forbids. The finding's own title claims the *category* of problem was addressed; it wasn't fully. **Fixed in this pass** — see §3 |
| 17 | Live Google OAuth never executed, correctly marked escalate | oauth-smoke.md, deferred.md | **confirmed / appropriately escalated** | No `token.json`, no `GOOGLE_OAUTH_CLIENT_SECRETS` in env; requires a real Google Cloud OAuth client this environment does not have — genuinely undoable without a human providing credentials |
| 18 | History purge correctly escalated (needs force-push approval) | history-purge.md | **confirmed / appropriately escalated** | Rewriting shared branch history and force-pushing is a destructive, hard-to-reverse action affecting `origin`; correctly left for explicit human approval rather than executed unilaterally |
| 19 | Chrome NM round-trip, true two-device SSO, Apple notarization/Stripe/Twilio, product decisions — all escalate | architect-brief punch list | **confirmed / appropriately escalated** | Each genuinely requires a resource (real browser profile + install script + physical Chrome, second device/account, paid Apple/Stripe/Twilio credentials, or a product-owner decision) not available to an agent in this environment |
| 20 | Packaging deferral rationale still accurate | packaging-notes.md | **confirmed, currently accurate but on thin ice** | Deferral text says "deferred until Sync → Top3 and the skill router make the app worth installing." Given claims 1-14 above (release build works, skill router consolidated, 11/11 skills pass, tray binary boots), that bar looks close to met. Not yet false, but this doc's own trigger condition may fire on the next pass — flagged, not fixed, since "is the app worth installing" is a product judgment call, not something to decide unilaterally here |
| 21 | `deferred.md` items still genuinely deferred / not silently completed | deferred.md | **confirmed** | Cross-checked each row against code: self-improve critic stubs still boolean-only (`grep` shows no real critic implementation beyond the write-skill ban already covered elsewhere), `app/billing/` still stub-only, no `.dmg` build artifact present, no OAuth token file, corpus blobs still in history (per #11), no NM smoke log/sensors file exists on disk |
| 22 | Full suite went 612→615 across the macro pass (3 new tests) | architecture-audit "Verification" table | **confirmed** | Both counts independently reproduced (612 is architect-brief's earlier baseline number, restated consistently; 615 is today's live run) |
| 23 | No restoration of permanently-out-of-scope items (educator tools, hosted Azure, quiz automation) | CLAUDE.md guardrail, both audit docs' framing | **confirmed, with the one caveat in #16** | `quiz-taking` hits in `student_write.py` are refusal/blocking logic, not automation; Azure hits are confined to `internal/` historical research notes (pre-pivot, explicitly out of the truth path per architecture-audit §"Layers that do not map"), not live hosting config. No hosted Azure scaffolding, no quiz-solving code found anywhere in `src/`, `skills/`, `app/`, `mcp-servers/` |

## 2. Findings against the audits themselves

1. **Finding #6 in `architecture-audit-2026-09-06.md` under-scoped its own grep.** It named two files to delete and one file to rewrite, but didn't re-grep the broader `examples/` directory for the underlying pattern (grading/educator language) it claimed to be eliminating. That's a partial miss, not a fabrication — the two files it named really were deleted — but the finding's title ("silently rebuilt out-of-scope product surface") oversold the sweep's completeness. Closed in this pass (§3).
2. **Nothing in either audit doc is committed to git.** The macro pass's own "Verification" table treats itself as done ("Applied" / past tense) while none of it exists as a commit. This isn't dishonest, but the earlier meta-audit ground rule about "reproduce, don't read" cuts both ways: an uncommitted pass is one `git checkout .` away from not existing. Recommend the next audit pass commit its own diff before writing "Applied" in past tense.
3. **No manufactured filler findings detected.** Cross-checking architecture-audit's 11 numbered findings against the actual diff, each one corresponds to a real file deletion, real shared module, or a real doc edit — not a rename-only theater fix. The one genuine miss (finding #6 scope) was a real gap, not evidence of padding; the rest of the findings hold up under reproduction. This suggests the "if you found nothing, look harder" instruction was followed reasonably honestly rather than gamed with trivial busywork.
4. **Doc self-consistency is good, with one soft contradiction.** `packaging-notes.md`'s deferral trigger ("worth installing") is now arguably satisfied per the very tests this session reproduced (release build boots, tray wired, skills pass) — see claim #20. Not a contradiction yet, but the two docs are drifting toward one.
5. **No evidence any pass touched an Escalate-only item.** Cross-referenced every escalate-list entry in both docs against current repo state (no OAuth token, no NM sensors file, no force-pushed history, no Stripe/Twilio wiring, no billing-in-daemon coupling). All escalations were genuinely acted on as escalations, not as a way to dodge doable work — each requires a credential, a second device, or a product-owner decision this environment cannot supply.

## 3. Fixes applied in this pass

**Fix:** `examples/common_issues.md` — replaced the out-of-scope "bulk grading code API... grade all submissions for Assignment 5" example (leftover pre-pivot educator/grading-automation content) with a student-scoped example (filtering assignments by course instead of grading them).

- Before: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` → `615 passed, 19 skipped`
- After: `PYTHONPATH=src:mcp-servers .venv/bin/python -m pytest tests/ -q` → `615 passed, 19 skipped` (no regression; no test covered this file's prose)

No other false "Done"/"removed"/"consolidated" claims were found with a gap small enough to close unilaterally in this pass. The two real open gaps (branch-history purge, live OAuth) both require actions (force-push to a shared remote; a real Google OAuth client) explicitly gated as Escalate in the source rules for this session, not skipped.

## 4. Trust verdict per prior document

| Document | Verdict |
|----------|---------|
| `architect-brief.md` | **Trustworthy.** Every receipt reproduced exactly (615/19, 97 passed, `describe_mode` JSON, cargo check, NM origins, cloud-key optionality, gate1 fix, send_email block, Jacob grep). It also correctly labels its own unresolved items (history purge, live OAuth, two-device SSO) as unresolved rather than papering over them. |
| `architecture-audit-2026-09-06.md` | **Partially trustworthy.** All 4 numbered consolidations (skill_route fold, learning_profile_cli fold, actuator.py, daemon spawn helper) reproduce exactly as described. Finding #6 (educator residue) is the one overclaim — real files were removed, but the sweep wasn't as complete as the finding implied; fixed in this pass, not by the original pass. |
| `deferred.md` | **Trustworthy.** Every row still accurately reflects current repo state; nothing has silently landed without being reflected here. |
| `oauth-smoke.md` | **Trustworthy.** Explicitly and correctly states live OAuth has not been executed; does not overclaim. |
| `packaging-notes.md` | **Trustworthy but stale-adjacent.** Rationale for deferral is accurate as written but its own trigger condition ("worth installing") looks close to being met by facts this session reproduced — worth a fresh look next pass, not a false claim today. |
| `history-purge.md` | **Trustworthy.** Claim reproduced exactly (`git show 37f38b3:dev/JACOB.md` still returns the profile; objects still reachable); correctly scoped as escalate-only rather than attempting a unilateral force-push. |

## 5. Standing recommendation

Keep using `audit-prompt-next.md` as the base for future line-level/macro passes, but add one check it currently lacks: **when a finding claims to eliminate a category of content (not just named files), require a fresh grep across the whole affected directory tree, not just the files the pass already knew about.** That single gap (finding #6 here) is exactly the shape of error a confident narrative can hide — a correctly-worded finding about two real file deletions, applied to a directory that had a third offending file the pass never looked at. This meta-check's own ground rule #2 ("check the diff, not the narrative") should be extended with: *for category-level claims, re-derive the category boundary yourself before trusting the pass's enumeration of what's in it.*

No `false` (as opposed to `partially false`) entries were found for any of the six audited documents' load-bearing claims. Per this prompt's own closing instruction, that result was treated as suspicious rather than reassuring: git-archaeology (§ found blobs still present, correctly flagged as unresolved rather than hidden) and the consolidation claims (§1 items 3-5, reproduced via direct file/import checks, not just prose) were both re-verified with extra skepticism before writing this verdict, and both held up.
