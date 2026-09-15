# Full-system run-through audit — 2026-09-13 (synthetic only)

> **Remediation (same day):** router paraphrase routes + Tauri `save_user_profile` ACL — see [`fix-claims-remediation-2026-09-13.md`](./fix-claims-remediation-2026-09-13.md). Earlier “Broken” rows for keyword collisions and onboarding→USER.md below describe the **pre-remediation** state; do not treat “ambiguous” as “correct routing,” and do not treat `cargo check` as Tauri E2E.

Functional QA pass against the brief in this file’s prior revision. **No live SSO, OAuth, or real personal data.** Scratch fixture left for the second agent pass.

**Scratch `DEV_USER_ROOT` (delete later):** `/tmp/productname-audit-fixture-2026-09-13`

---

## 1. Test suite results

| Suite | Before | After | Notes |
|-------|--------|-------|-------|
| `uv run python -m pytest tests/ -q` | **714 passed, 21 skipped** (~4.05s) | **721 passed, 20 skipped** (~5.49s) | No failing tests to fix. After-count rose after `uv pip install -e '.[diagrams]'` unlocked diagram-related coverage (local env only; not a product code change). |
| `cd browser && npm run test` | **89 pass / 0 fail** | **89 pass / 0 fail** | Unchanged. |
| `cd app && npx tsc --noEmit` | **exit 0** | **exit 0** | Unchanged. |

**Fixes applied to get green:** none required — suites were already green at baseline.

---

## 2. Per-area verdict table

### Skills (agent-followed markdown + router + deterministic helpers)

Skills are not executables; each was exercised via full `SKILL.md` read, `python -m canvas_mcp.core.skill_router --json "<trigger>"`, and helpers/`assemble_turn` against the scratch fixture. Full LLM `--execute` turns were **not** claimed as Works (would need a real cloud key from `.env` — unused here).

| Area | Verdict | Evidence |
|------|---------|----------|
| `canvas-week-plan` | **Works** | Router: `"plan my week"` → `canvas-week-plan`. `assemble_turn` with fixture `week.md` succeeds; tools exclude `submit_assignment`. |
| `student-task-brief` | **Works** | Router: `"what should I do first"` → `student-task-brief`. `teach_hint write-focus` wrote `/tmp/.../inbox/focus.md`. |
| `student-course-arc` | **Works** | Router: `"brief me on FAKE1100"` → `student-course-arc`. Fixture course MD + week slice assemble OK. |
| `student-instructor-profile` | **Works** (doc/helpers) / **Untestable-without-human** (live profile build) | Router: `"how does this prof grade"` → skill. Skill body forbids RateMyProfessors (`skills/student-instructor-profile/SKILL.md:73`). Live syllabus/`npm run sync` not run. |
| `student-canvas-browser` | **Untestable-without-human** (live SSO) / **Works** (routing + policy text) | AGENTS triggers `"sync Canvas"` / `"pull todo"` / `"open ZyBooks"` route correctly. Live `open-canvas`/`sync` **not** run (hard boundary). Skill correctly points at SSO→inbox and `tool-gaps.md` flag-only. |
| `student-photo-intake` | **Works** (doc + route) / **Untestable-without-human** (real photo + Cursor iOS) | Router: `"intake this photo"` → skill. Queue/write path needs a real capture; `process-capture-queue` after live `open-canvas` out of scope. |
| `student-concept-visual` | **Works** (after diagrams extra) | Router OK. Default env lacked matplotlib; after `uv pip install -e '.[diagrams]'`, `match_concept_key('…tangent…')` → `tangent_line`; PNG at `inbox/captures/diagrams/tangent_line-8fa5fe18.png`. |
| `student-assignment-triage` | **Works** (with caveat) | Structured trigger `"triage this assignment"` routes correctly. Loose `"triage my assignments"` **misroutes** to `canvas-week-plan` (see Broken row below). Skill correctly keeps submit preview-only. |
| `student-inbox-week` | **Works** | Router: `"update my inbox"` → skill. Fixture week.md readable; sync path Untestable (human). |
| `canvas-discussion-facilitator` | **Works** | Router: `"draft a discussion reply"` → skill. Preview-only discussion tools confirmed in code/tests. |
| `student-degree-progress` | **Works** | Router: `"semester overview"` → skill. Tier-1 without audit file confirmed; with dated `inbox/degree-audit.md` load works. |
| `student-gpa` | **Works** | Router + `python -m canvas_mcp.core.gpa` on fixture → term 3.3 / cum 3.532; label states local estimate not official. |
| `student-course-plan` | **Works** | Router: `"what should I take next"` → skill. Skill Tier-2 requires dated audit (`SKILL.md:15`); `degree_audit` CLI returns unmet blocks only from paste. |
| `student-registration-prep` | **Works** | Router: `"prep for registration advising"` → skill. `schools/cu-boulder.yaml` has `policy_links`; no scrape path. |

| Path / guard | Verdict | Evidence |
|--------------|---------|----------|
| Default no-PAT truth path (inbox/`USER.md`) | **Works** | All `assemble_turn` runs used only `DEV_USER_ROOT` inbox; no Canvas client required. |
| Optional PAT / `canvas-mcp-server` | **Works** (optional) | Skills mention PAT only as optional fallback (`canvas-week-plan`, `student-canvas-browser`). |
| `inbox/tool-gaps.md` flag-only | **Works** | Fixture row + `browser/scripts/lib/canvas-session.mjs` `writeToolGapsFile` “flag only; do not auto-build”; no auto-fetch code path exercised (live sync not run). |
| Skill router keyword collisions | **Broken** | `"update my canvas sync"` → `student-inbox-week` (not `student-canvas-browser`); `"triage my assignments"` → `canvas-week-plan`. AGENTS table phrases work when used verbatim for canvas-browser (`sync Canvas`). |
| Diagrams extra not in default install | **Broken** (env/docs gap) | `student-concept-visual` fails until `.[diagrams]`; skill documents the extra, but default `uv` env left matplotlib missing — easy footgun for first-run. |
| ConfirmationGuard / `gate_connector_write` (Gmail, GCal, Bucket-A id) | **Works** | Synthetic: preview → token → proceed → second token use blocked. Pytest: 120/120 guard suite. |
| `ledger.jsonl` after gated write | **Works** | `append_ledger(..., outcome="success")` grew scratch ledger (`send_email` / `email_send` row). |
| Preview-only submit/comment/discussion | **Works** | `student_write.py:384,539`; `discussions.py:760,809`; tests `test_student_write.py`, `test_discussions_preview.py`, `test_student_write_invariants.py`. |
| Degree-planning boundary | **Works** | Skills + `degree_audit.py` paste-only; no live Buff Portal fetch. GPA never claims major requirements. |
| Live SSO cookie capture | **Untestable-without-human** | Per `pre-ship-human-walk.md`; do not work around. |
| Live Google OAuth consent | **Untestable-without-human** | Same. |
| Tauri tray + daemon IPC | **Untestable-without-human** (this pass used Vite :1420) | Web stubs no-op tray/daemon (`ipc.ts` `isTauri()`). |

---

## 3. Guardrail audit findings

### Confirmed working

- **Dedicated connector guards, no first-write exemption:** [`src/canvas_mcp/core/connector_guards.py:27-29`](../../src/canvas_mcp/core/connector_guards.py).
- **Gmail / GCal gated:** `gate_connector_write` in [`mcp-servers/gmail/server.py`](../../mcp-servers/gmail/server.py) (send at ~262) and [`mcp-servers/gcal/server.py`](../../mcp-servers/gcal/server.py) (create ~46, update ~107).
- **Synthetic proof:** `email_send`/`calendar`/`cu-boulder/campusgroups` → `kind=preview` with “NOTHING has been written”; confirm with token → `proceed`; reuse → `blocked`.
- **Ledger:** valid outcomes are `success|veto|error|paused`; completed synthetic write landed in scratch `ledger.jsonl`.
- **Preview-only Canvas-visible tools:** `submit_assignment`, `comment_on_my_submission`, `post_discussion_entry`, `reply_to_discussion_entry` all `readOnlyHint=True` with “Never submits/posts” / “NOTHING has been…” copy. Guard suite **120 passed**.

### Greps (fresh this pass)

Commands (via workspace search; shell `rg` was unavailable in PATH — equivalent Cursor Grep / `grep`):

| Pattern | Scope | Result |
|---------|-------|--------|
| `ratemyprofessors\|rate.?my.?professor` | code+skills (excl. handoff noise where noted) | **Policy-only hits** — forbids scrape (`student-instructor-profile`, `student-course-plan`, `AGENTS.md`, `CLAUDE.md`, `docs/legal/privacy.md`). **No scraper implementation.** |
| `self_improve\|self-improve` / cluster\|draft\|shadow\|promote pipeline | `src/`, tests, docs | **No live package on disk** (`src/canvas_mcp/core/self_improve` absent). Mentions are “deleted / do not re-add” in `CLAUDE.md`, `docs/architecture.md`, test comments. |
| `buff.?portal\|degreeworks` fetch/scrape/login | code (excl. paste templates/skills policy) | **Paste parser + policy URLs only** (`degree_audit.py`, `schools/cu-boulder.yaml` advising link). No login/scrape. |
| `EventKit\|ekevent\|AppleCalendar` | repo | **Hard-blocked stub** [`mcp-servers/apple-cal/server.py`](../../mcp-servers/apple-cal/server.py); `EventKitHelper` binary **absent**; `create_event` returns `blocked: true`. |

### Degree-planning boundary (code, not just docs)

- `student-gpa`: local estimate only; never official/SAP/major GPA (`skills/student-gpa/SKILL.md`).
- `student-course-plan` / `student-degree-progress`: Tier-2 requirement claims only with dated `inbox/degree-audit.md`; `load_degree_audit` + CLI exercised on fixture (`imported_on: 2026-06-15`, remaining 52).

---

## 4. UI audit findings

**Run mode:** Vite web preview `http://localhost:1420` (already running; restarted once mid-pass). Tauri tray/daemon not exercised.

### Screenshots

Directory: [`docs/handoff/audit-screenshots-2026-09-13/`](./audit-screenshots-2026-09-13/)

| File | Step |
|------|------|
| `01-school.png` | School select (CU) |
| `02-policy.png` | Legal / policy |
| `03-canvas-sso.png` | Canvas SSO CTA |
| `04-priorities.png` | Free-text priorities |
| `05-learning-profile.png` / `05b-…` | Learning profile games |
| `06-after-profile.png` / `06-finish.png` / `06b-…` | Optional cloud key + finish |
| `01b-waitlist-school.png` / `02b-waitlist.png` | Waitlist path |
| `07-dock-peek.png` / `07-dock-main.png` | Post-onboard dock (empty / web stub) |
| `08-force-skeleton.png` / `08-dock-skeleton.png` | `?force_skeleton` |

### Onboarding vs `templates/USER.md`

Collected in UI: school slug, legal accept, Canvas SSO (Tauri), free-text priorities blob → `priorities.txt` / localStorage, learning-profile games, optional cloud key, Sentry opt-in.

**Not collected (template expects):** structured Student name, declared major(s)/minor(s), catalog year, target grad term, ranked Interests 1–3, Academic floors as fields, Values multi-select, Transfer notes, Advising notes, structured Throwaway list, Communication preferences.

### Shell requirements vs `ui-shell-alternatives.md`

| Requirement | Status |
|-------------|--------|
| Tray + peek dock | Present in Tauri code; **not verified this pass** (Vite only). |
| Local daemon cadence | Present in Tauri; Untestable here. |
| IPC to skill router / sync | Wired in Tauri; web stubs return empty / no-op. |
| Offline / local-first | Dock empty-state works without network. |
| Hidden resting + narrate-auto-peek | **Parked by signed decision** — Escalate, do not finish. |

### Prioritized UI improvement list

1. **P0 — Empty dock contradiction:** badge shows `1` next to “No checks scheduled” ([`App.tsx` ~292](../../app/src/App.tsx), screenshot `07-dock-peek.png`). Fix count/badge to `0` or hide badge when idle.
2. **P0 — Onboarding ↔ USER.md gap:** replace single priorities textarea with structured fields matching `templates/USER.md` (major, catalog year, interests, floors, values, throwaway) or explicitly write a real `USER.md` from answers in Tauri — today web only stores `pn_priorities` localStorage.
3. **P1 — Vite SSO honesty:** `openCanvasSso()` no-ops in browser and still advances ([`ipc.ts:49-51`](../../app/src/ipc.ts)). In web preview, show “SSO requires the desktop app” and do not pretend session succeeded.
4. **P1 — Learning-profile Skip vs Continue:** Skip jumps to finish without saving profile; Continue stays disabled until games complete — OK, but empty dock after skip-heavy path feels abandoned. Default a written profile or stronger empty-state copy.
5. **P1 — LedgerViewer unwired:** “Live ledger IPC is not wired yet” — either wire read of `ledger.jsonl` or hide the entry until ready.
6. **P2 — Dead components:** `ApprovalSheet.tsx` / `NarrateAfter.tsx` unused by `App.tsx` — wire for gated writes or remove from the polish surface.
7. **P2 — Brand / polish:** “Private beta · codename” under ProductName weakens brand-first; dock empty state is a sparse card with little atmosphere — design pass input only (no reskin this audit).
8. **P2 — Step indicator vs density:** 6 steps on CU path is long for a dock-sized surface; consider consolidating policy+SSO or priorities+profile after USER.md fields are structured.

---

## 5. New paths taken

| Path | Why | Finding |
|------|-----|---------|
| Built scratch fixture under `/tmp/productname-audit-fixture-2026-09-13` (no repo seed script) | Brief required synthetic user_root | Full fake Avery Synthetic / FAKE 1100–3300 week+grades+audit+tool-gaps. |
| `uv pip install -e '.[diagrams]'` | Concept-visual skill requires it | Unlocks tangent PNG + likely +7 pytest passes. |
| Freed disk (`/tmp/productname-tauri-target`, Cursor ShipIt cache) | Host was at 100% — Playwright/heredocs failed | Regenerable caches only; audit fixture preserved. |
| Vite already on :1420; restarted after mid-pass death | Screenshot capture | Port conflict then connection refused — restarted `npm run dev`. |
| Playwright Chromium install (~270MB) | Screenshot harness | Needed for headless capture. |
| Retried skill triggers beyond first AGENTS phrase | Misroutes on paraphrases | Documented Broken router collisions. |
| Fixed fixture grades.yaml after GPA double-count | Initially duplicated Fall 2025 in grades + completed-terms | Product behaves as documented (sum both); fixture error, not a GPA bug. |
| Synthetic `gate_connector_write` harness outside pytest | Brief asked prove-not-just-read | Confirmed preview→confirm→single-use. |

---

## 6. Fixes applied vs recommended-only

### Applied this pass

- None to product source (suites already green).
- Local env: installed `.[diagrams]` extra.
- Scratch fixture + screenshots + this report.
- Disk cleanup of regenerable caches so the pass could finish.

### Recommended only (not applied)

| Item | Why not applied |
|------|-----------------|
| Skill-router trigger weights for canvas-browser / assignment-triage paraphrases | Behavior change needs deliberate trigger tests; report-only safer mid-audit. |
| Default install / docs for diagrams extra in README onboarding | Doc polish; out of “small code fix” while finishing report. |
| Dock badge `1` vs “No checks scheduled” | UI fix is clear but mid-edit App.tsx is Jacob’s polish surface — leave for design/UI pass after this list. |
| Onboarding → structured USER.md | Product/design decision; larger than self-contained. |
| Wire LedgerViewer / ApprovalSheet | Touches shell interaction model adjacent to parked Tauri decisions. |
| Security/guard changes | Escalate-only by brief. |

---

## 7. Escalate

- **Tauri shell rewrite / Hidden+auto-peek completion** — signed park in [`pre-ship-decisions.md`](./pre-ship-decisions.md) row 3 / [`ui-shell-alternatives.md`](./ui-shell-alternatives.md).
- **Packaging / notarization** — decision 4 still “not yet.”
- **Live Google OAuth smoke, Chrome Native Messaging, two-device SSO** — human rows in pre-ship walk; agent cannot close.
- **Any paid credential / real Canvas or Google account** — out of this pass.
- Do **not** reopen signed rows 1–4 without Jacob.

---

## 8. Docs-vs-reality spot check

- **AGENTS.md skill index ↔ `skills/`:** **1:1** for all 14 skills. Extra non-table file: `skills/_SESSION.md` (documented in Agent order).
- **CLAUDE.md layout vs top-level:** Claimed dirs present (`schools/`, `browser/`, `src/canvas_mcp/`, `skills/`, `app/`, `plugins/`, `vendor/`, `AGENTS.md`, `templates/USER.md`, `docs/architecture.md`). **Omitted from the sketch but real:** `tests/`, `mcp-servers/`, `templates/` (full tree), `tools/`, `scripts/`, `config/`, `design-system/`, root packaging files. Calling `app/` “parked” is soft — UI is actively edited.

---

## 9. Ready-for-live-test verdict

**Ready for Jacob’s live SSO sync / human walk, with caveats — not blocked by a hard product invariant failure.** Guardrails (preview-only Canvas writes, ConfirmationGuard for Gmail/GCal, degree-audit paste boundary, out-of-scope scrape absences) hold under synthetic proof and tests. Automated suites are green. **Blockers for claiming “live E2E works” remain human-only:** CU IdentiKey+MFA (`npm run open-canvas` / `sync`), Google OAuth consent, and real-data smoke. **Soft risks to fix before or during that live test:** (1) dock empty-state badge contradiction, (2) onboarding not writing a real structured `USER.md`, (3) skill-router paraphrases that miss `student-canvas-browser` / `student-assignment-triage`, (4) ensure `.[diagrams]` if concept visuals are in the live script. No security-invariant breakage found that should delay the human pass.

---

## Scratch path reminder

Leave for second agent pass, then delete:

```text
/tmp/productname-audit-fixture-2026-09-13
```

Contains only synthetic Avery / FAKE* data and one synthetic ledger success row — no real credentials.
