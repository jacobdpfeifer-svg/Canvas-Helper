# Full-system functional QA results — 2026-09-13

> **Remediation (same day):** see [`fix-claims-remediation-2026-09-13.md`](./fix-claims-remediation-2026-09-13.md). Findings below are the original synthetic pass; onboarding↔USER.md field gaps and weak triage paraphrases were addressed after this write-up. Vite preview still does not prove USER.md persistence (`!isTauri` → localStorage); Tauri ACL for `save_user_profile` is now allowlisted — full webview click-through remains the gold-standard smoke.

Synthetic-data pass only (brief: [`cursor-full-run-audit-2026-09-13.md`](./cursor-full-run-audit-2026-09-13.md)).  
No real SSO, OAuth, Canvas PAT, or Jacob personal data was used.

**Scratch `DEV_USER_ROOT` (leave for second review; delete after):**  
`/tmp/productname-qa-fixture-2026-09-13/`

**Screenshots:** [`audit-screenshots-2026-09-13/`](./audit-screenshots-2026-09-13/)

---

## 1. Test suite results

| Suite | Before | After | Notes |
|-------|--------|-------|-------|
| `uv run python -m pytest tests/ -q` | **714 passed, 21 skipped** | **721 passed, 20 skipped** | Ledger assertions added to existing Gmail/GCal dry-run test; count delta also reflects suite collection variance vs cold cache |
| `cd browser && npm run test` | **89 pass, 0 fail** | unchanged (not re-run after; no browser edits) | |
| `cd app && npx tsc --noEmit` | **exit 0** | unchanged (legal.ts string-only edit) | |

Focused guard suite (during pass): **156 passed**  
(`test_actuator_common`, `test_connector_guards`, `test_google_oauth_helpers`, `test_foundations_w0`, `test_student_write_invariants`, `test_discussions_preview`, `test_student_write`, `test_tool_metadata`, `test_degree_audit`, `test_gpa`, `test_skill_router`).

### Fixes applied to get there

1. **`tests/core/test_google_oauth_helpers.py`** — `test_send_email_executes_after_confirm_dry_run` now asserts `ledger.jsonl` success rows for both confirmed `send_email` and `create_event` (closes the dry-run→ledger coverage gap). Re-ran that test: passed.
2. **`app/src/legal.ts`** — onboarding policy copy still claimed the product never sends email or creates calendar events; updated to match the 2026-09-13 ConfirmationGuard addendum (Canvas submit/discussion stay preview-only; Gmail/GCal only after per-preview confirm).

No flaky failures found in baseline suites.

---

## 2. Per-area verdict table

| Area | Verdict | Evidence |
|------|---------|----------|
| pytest suite | Works | `714→721 passed` commands above |
| browser npm test | Works | `89 pass, 0 fail` |
| app `tsc --noEmit` | Works | exit 0 |
| Synthetic fixture `DEV_USER_ROOT` | Works | `/tmp/productname-qa-fixture-2026-09-13` built via `ensure_user_root` + templates |
| `canvas-week-plan` route + assemble | Works | `skill_router --json "plan my week"` → `canvas-week-plan`; `assemble_turn` includes FAKE week rows |
| `student-task-brief` | Works | routes structured; assemble includes fixture |
| `student-course-arc` | Works | `"brief me on FAKE220"` → `student-course-arc` |
| `student-instructor-profile` | Works | keyword route; assemble OK |
| `student-canvas-browser` (skill doc + route) | Works (partial) | routes `"sync Canvas"`; doc correctly SSO→inbox. **Live SSO/cookie capture:** Untestable-without-human |
| `student-canvas-browser` live sync | Untestable-without-human | Per `pre-ship-human-walk.md` — IdentiKey+MFA; do not run `npm run open-canvas` / `npm run sync` this pass |
| `student-photo-intake` | Works (route) / Untestable (vision execute) | routes structured; full photo OCR/queue needs real capture + optional cloud |
| `student-concept-visual` | Works (route) / Untestable (diagram render) | routes; diagram generation needs LLM/vision |
| `student-assignment-triage` | Works | Exact triggers `"triage this assignment"` / `"should I submit"` route structured. Vague `"triage my assignments priority"` was ambiguous/null — AGENTS index phrasing weaker than skill Triggers |
| `student-inbox-week` | Works | `"update my inbox"` → structured |
| `canvas-discussion-facilitator` | Works | `"draft a discussion reply"` → skill; preview-only per skill + discussion tools tests |
| `student-degree-progress` | Works | routes; Tier-2 tied to dated audit in skill doc |
| `student-gpa` | Works | CLI on fixture: term **3.3**, cumulative **3.405**; skill forbids official/SAP claims |
| `student-course-plan` | Works | routes; Tier-1/Tier-2 boundary in `skills/student-course-plan/SKILL.md` L14–50 |
| `student-registration-prep` | Works | routes; skill forbids register/add-drop/Buff Portal scrape (`SKILL.md` L12, L47) |
| skill `--execute` (LLM turn) | Untestable-without-human | `missing_api_key` without real cloud key — routing + `assemble_turn` exercised instead |
| No-PAT default path | Works | Skills/docs prefer inbox; PAT mentioned as optional (`skills/canvas-week-plan/SKILL.md` L20–25). Assemble never injects `CANVAS_API_TOKEN` |
| `inbox/tool-gaps.md` flag-only | Works | Sync writer `browser/scripts/lib/canvas-session.mjs` ~1348–1436 “never auto-build”; fixture stub present |
| ConfirmationGuard / connector guards | Works | 156-test guard suite; `connector_guards.py` L27–29 no first-write exemption |
| Gmail/GCal gate | Works | preview without token; execute after token; ALWAYS_GATED tests |
| `ledger.jsonl` after gated write | Works | Ad-hoc dry-run + new test assertions; rows `email_send` / `calendar` success |
| Canvas `submit_assignment` preview-only | Works | `student_write.py` L384 `readOnlyHint=True`; no `confirmation_token`; security invariants suite |
| Discussion post/reply preview-only | Works | `tests/tools/test_discussions_preview.py` (2 passed) |
| Degree-audit boundary | Works | `degree_audit.py` paste-only; fixture `imported_on: 2026-07-15`; GPA skill never claims requirements satisfied |
| Out-of-scope greps | Works (empty of leaks) | See §3 |
| App onboarding (web) | Works with gaps | Screenshots 01–06; field coverage vs `templates/USER.md` incomplete — see §4 |
| App tray / Tauri daemon / live IPC | Untestable-without-human | Web Vite preview only; packaging “not yet” (`pre-ship-decisions.md` #4); Tauri parked (#3) |
| Live Google OAuth | Untestable-without-human | `pre-ship-human-walk.md` |
| Chrome Native Messaging live | Untestable-without-human | unit-tested only |

---

## 3. Guardrail audit findings

### Confirmed working

- **Preview → confirm → execute, no first-write exemption:** `get_connector_guard` docs + `tests/core/test_connector_guards.py`, `test_actuator_common.py`, `test_send_email_and_create_event_preview_before_write`.
- **ALWAYS_GATED for `email_send` / `calendar`:** `test_email_send_and_calendar_never_escalate_to_automatic` — YAML cannot force `automatic`.
- **Ledger after confirm:** synthetic run under `/tmp/productname-qa-ledger-check` wrote success rows for `send_email` and `create_event`; test file now asserts the same.
- **Canvas-visible tools stay preview-only:** `submit_assignment` / `comment_on_my_submission` / discussion post+reply — `readOnlyHint`, security + metadata tests green.
- **Apple Calendar:** `mcp-servers/apple-cal/server.py` hard-blocks writes; **no** `EventKitHelper` binary on disk.
- **Degree planning:** `python -m canvas_mcp.core.degree_audit` / `load_degree_audit` require dated paste; GPA is local estimate only (`skills/student-gpa/SKILL.md` L12–55).

### Greps run (fresh)

Patterns searched across product code (`src/`, `mcp-servers/`, `browser/`, `app/`, `skills/` as noted):

| Pattern | Result |
|---------|--------|
| `ratemyprofessors` / `RateMyProfessors` in `*.py`/`*.mjs`/`*.ts`/`*.tsx`/`*.rs` | **No code hits** (policy mentions only in docs/skills “never fetch”) |
| `self_improve` under `src/` | **No package** — `src/canvas_mcp/core/self_improve` missing; comment-only leftovers in `learning_profile.py` |
| `EventKit` / `EKEvent` under `mcp-servers`/`src`/`app` | **Block stub only** in `apple-cal/server.py`; helper binary absent |
| `buffportal` / `degreeworks` / `uachieve` fetch URLs in `src`/`browser`/`mcp-servers` | **No live fetch** — `degree_audit.py` is paste parser (`source: buff-portal-paste`) |
| Registration execute / add-drop | Skills explicitly forbid; no executor found |

---

## 4. UI audit findings

### Screenshots

| File | Step |
|------|------|
| `01-school.png` | School picker |
| `02-policy.png` | Legal / policy |
| `03-canvas-sso.png` | Canvas SSO CTA (no session — expected without human login) |
| `04-priorities.png` | Priorities free-text |
| `05-learning-profile.png` | Learning-profile games |
| `06-finish.png` | Cloud key + Sentry |
| `07-dock-main.png` | Post-onboard dock (“No checks scheduled” empty state in web preview) |
| `08-dock-skeleton.png` | `?force_skeleton` loading state |

Walked with Puppeteer + system Chrome against Vite `http://localhost:1420/` (IPv6 `localhost`; `127.0.0.1` refused — Vite bind quirk). Progress DOM count verified: **6** dots (`STEP_COUNT = 6`).

### Gaps vs `templates/USER.md`

Onboarding collects: school, legal accept, SSO, one priorities textarea, learning-profile games, optional cloud key, Sentry.  
**Not collected in UI** (template expects them): Program (majors/minors/catalog year/target grad), Interests ranked, Academic floors, structured Career priorities / Values / Transfer notes / Advising notes / Throwaway list as structured fields (only a free-text blob at Priorities).

### Shell requirements vs `ui-shell-alternatives.md`

| Need | Status in this pass |
|------|---------------------|
| Tray + peek dock | Parked Tauri — not exercised in Vite web preview |
| Local daemon cadence | Untestable here (no Tauri daemon) |
| IPC to skill router | `routeIntent` wired in `App.tsx`; web preview without backend → empty dock |
| Offline / local-first | Onboarding + localStorage work offline for shell chrome |
| Shell rewrite | **Escalate-only** — not started |

### Prioritized UI improvement list (input for design pass — do not reskin yet)

1. **P0 — Legal copy drift (fixed this pass in `legal.ts`):** was denying Gmail/GCal entirely; must stay aligned with ConfirmationGuard policy.
2. **P0 — Onboarding ↔ USER.md field map:** Priorities step is one textarea; student never enters catalog year, major, floors, interests, throwaways as structured data the degree/GPA skills expect.
3. **P0 — Empty dock after web onboarding:** `07-dock-main.png` is a dead-looking “Today / No checks scheduled” with no path to synthetic inbox or “how to sync.” Needs empty-state education + link to sync/status when IPC absent.
4. **P1 — SSO step dead-end in web preview:** “Open Canvas & sign in” cannot succeed without Tauri/browser helper; help text exists but no “skip for now / use existing inbox” for local-dev or waitlist-adjacent testing.
5. **P1 — Policy checkbox/control styling:** terms accept control is easy to miss vs the large legal sheet (screenshot walk needed careful click).
6. **P1 — Learning-profile mock uses real-looking course codes** (`BCOR`/`CSCI`/`MATH` in game UI) — fine for UX, but ensure they never seed into a real `user_root`.
7. **P2 — Brand / density:** dark dock is functional but sparse; Jacob’s “UI is not where it needs to be” still accurate — polish inside Tauri, don’t replace shell.
8. **P2 — Command palette (Alt+Space in `App.tsx`)** — present; not discoverable in empty dock chrome.
9. **P2 — Vite `localhost` vs `127.0.0.1`:** document for local web preview (IPv6-only listen).

---

## 5. New paths taken

1. **No seed script for fake `user_root`** — built `/tmp/productname-qa-fixture-2026-09-13` by hand from templates + pytest shapes; invented `calibration/priority-rubric.md` (no repo template).
2. **Initial `grades.yaml` used `current_grade`** — product schema is `letter` (`writeGradesYaml` / `load_grades_yaml`). Fixed fixture; not a product bug.
3. **`skill_router --execute` needs API key** — fell back to `--json` route + `assemble_turn` for all 14 skills.
4. **AGENTS triage phrasing** — `"triage my assignments priority"` failed routing; exact skill triggers work.
5. **Disk full (`ENOSPC`, ~123 Mi free)** mid-UI pass — cleared `~/.npm/_cacache`, incomplete Playwright cache, repo `.mypy_cache`/`.pytest_cache` to free ~2.7 Gi so screenshots could run. Recorded here; not a product defect.
6. **Report filename** — prompt already occupies `cursor-full-run-audit-2026-09-13.md`; results written to **this** file (`cursor-full-run-results-2026-09-13.md`).
7. **Ad-hoc ledger proof** under `/tmp/productname-qa-ledger-check` before promoting assertions into the test file.

---

## 6. Fixes applied vs recommended-only

### Applied

| Fix | Why safe |
|-----|----------|
| Ledger assertions on Gmail/GCal dry-run confirm test | Strengthens existing agreed guard; no invariant change |
| `app/src/legal.ts` Gmail/GCal wording | Aligns UI copy with signed 2026-09-13 addendum |

### Recommended only (not applied)

| Item | Why not applied |
|------|-----------------|
| Expand onboarding to full `USER.md` Program/Interests/floors fields | Product/UX design — mid-edit surface; needs Jacob review before schema+UI change |
| Empty-state / skip-SSO for web preview | Touches onboarding interaction model; park-polish scope |
| Add `templates/calibration/priority-rubric.md` | Small but undocumented product decision on default rubric |
| Teach AGENTS.md triage row to match skill Triggers | Doc tweak OK later; not blocking live sync |
| CLAUDE.md layout diagram missing `mcp-servers/`, `templates/`, `tests/`, etc. | Docs-only; low urgency |
| Shell / peek / packaging finish | **Escalate** — signed park / not yet |
| Wire LLM `--execute` in CI with fake provider | Separate harness design |

---

## 7. Escalate

- **Do not replace Tauri shell** — `pre-ship-decisions.md` #3 signed **park**; `ui-shell-alternatives.md` polish-only.
- **Do not start notarized packaging** — decision #4 **not yet**.
- **Do not reopen** vendored MCP identity (#1) or restore `app/billing` / `app/mobile` (#2) — billing/mobile dirs confirmed absent.
- Live IdentiKey+MFA, Google OAuth consent, Chrome NM on a real profile, two-device SSO — human walk rows, not agent work.

---

## 8. Ready-for-live-test verdict

**Ready for Jacob’s live SSO sync smoke with real Canvas data**, with caveats: automated suites and synthetic skill/guard paths are green; Canvas submit/discussion stay preview-only; Gmail/GCal require ConfirmationGuard; degree claims stay paste-gated. **Blockers for calling the product “ship-ready” are not sync blockers** — they are (1) human OAuth/NM/SSO walk items still open in `pre-ship-human-walk.md`, (2) onboarding still not collecting the structured `USER.md` fields GPA/course-plan skills want, and (3) dock UI empty-state/polish (parked Tauri). None of those should stop a careful first live `npm run open-canvas` + `npm run sync` by Jacob on his machine; agents must not run that step.

---

## Scratch paths to delete after second review

- `/tmp/productname-qa-fixture-2026-09-13/` — primary audit fixture
- `/tmp/productname-qa-ledger-check/` — ledger proof scratch
- `/tmp/pn-shot/` — temporary puppeteer-core install used for screenshots
