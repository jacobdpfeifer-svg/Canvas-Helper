# UI round 1 — candidate C — STATUS

Re-entry point for `docs/handoff/ui-rebuild-round1-build-prompt.md`, candidate C. Read this, then `DECISIONS.md` and `AUDIT.md`; screens are in `screens/`.

- **Worktree / branch:** `~/.cache/productname-cand-c` → `candidate-c`, based on `phase1-productname-pivot @ 7c73fb8` **plus** that checkout's uncommitted student-beta work imported as the first commit (`3ab2164`, see DECISIONS D-01). `main` and `phase1-productname-pivot` untouched; nothing pushed.
- **Agent:** Claude Opus 5, 2026-09-18 (evening).
- **Toolchain used:** node 26.8.2 / npm, cargo (Rust 1.98), uv venv `.venv` (Python 3.12, `pytest-asyncio` + `types-PyYAML` added to the fresh venv — they were missing and produced 163 spurious failures until installed), Playwright via system Google Chrome for screenshots.

## Done

| Surface | What | Where |
|---|---|---|
| Data model (§2) | Schema-2 `inbox/study-sources/<course>.json`: per item `kind`, `points_possible`, `assignment_group_id`, `group_weight`, `group_name`, `due_at`, `html_url`, `submission_types`, submission state, computed `weight_share`; per course `term {start_at,end_at,source}` and `color`; `grading` block. Pure, tested module. Schema-1 readers unaffected. | `browser/scripts/lib/semester.mjs`, `study-sources.mjs`, `tests/semester.test.mjs` (9), fixtures `browser/tests/fixtures/canvas-semester/` |
| Sync | Fetches `include[]=term`, assignment groups, `include[]=submission`; streams NDJSON progress; stub-free. | `browser/scripts/sync-study-sources.mjs` |
| `read_semester` | Native Rust read → rows + ticks for `1m/2m/3m/semester`; labeled terms; honest empty state. 4 tests against the synthetic profile. | `app/src-tauri/src/semester.rs`, `civil.rs` |
| Home | Per-course rows, one axis, today line, weighted ticks with kind shapes, past dimming, submission dot, 7 px clustering, immediate glass hover bubble (keyboard-navigable, viewport-clamped, Open in Canvas), click popup with synced description + View plan, persisted range selector, legend. | `app/src/home/*`, `views/HomeView.tsx`; tests `home/ticks.test.ts` (3), `views/HomeView.test.tsx` (5) |
| Onboarding | School + Accept toggle (filled state) + View terms sheet → Connect Canvas (CSS/SVG animation, mandatory, Try again, auto-advance on existing session) → Syncing (cards land per `study-sync-progress` event, partial-failure Retry / Continue with N) → Home. Waitlist ends the flow. No paragraphs. Desktop-only. | `components/FirstRun.tsx`, `CanvasAnimation.tsx`, `TermsSheet.tsx`, `Markdown.tsx`; tests `FirstRun.test.tsx` (5) |
| Exam Prep | Circular glass header, day-by-day draft plan (deterministic seam `build_exam_plan(exam, sources, today, seed)` in Rust, 3 tests), Redo (seeded, labeled honestly), Let's test your knowledge → Study with course preselected or honest empty state. | `app/src-tauri/src/exam_plan.rs`, `views/ExamPrepView.tsx` |
| Calendar tab | Renamed from Plan. Glass commitment card (same IPC), due checks, Suggested-from-email (Add / Dismiss, local only), real **Add to calendar** button → sheet → `inbox/calendar.jsonl`, month grid at the bottom with Canvas due items + local events, learning record collapsed. | `views/CalendarView.tsx`, `calendar/*`, `app/src-tauri/src/calendar.rs` (2 tests); tests `CalendarView.test.tsx` (3) |
| Suggestions contract | `inbox/calendar-suggestions.jsonl` `{source_message_id,title,start,end,confidence,why}` + decisions file; reader + fixture shipped; **producer pending** (Q3). | `calendar.rs`, `make-synthetic-profile.mjs` |
| Perf fixes | All process-spawning commands async; six Plan reads → one `read_plan_surface` / one Python process (4.12 s → 0.64 s on a fresh profile); tab paints first frame, fills later. | `commands.rs`, `daemon.rs`, `src/canvas_mcp/core/plan_surface.py` (+3 tests) |
| Bugs | White-below-Settings, Plan slowness, Plan "doesn't work", Settings type drift, Accept checkbox not filling — all fixed with before/after in `AUDIT.md`. | |
| Shell | Tabs Home / Study / Calendar / Settings; Sources removed; read-only **Canvas data** panel under Settings; `open_external` (https only). | `App.tsx`, `views/CanvasDataPanel.tsx` |
| Themes / glass | One `.glass` surface + course palette validated on Paper/Night/Forest/Contrast; one type scale; reduced-motion static states. | `styles.css` (round-1 block) |
| Legal | Complete beta-draft Terms of Service + Privacy Policy dated 2026-09-18, single source loaded via `?raw`; per-school preamble kept. | `docs/legal/terms.md`, `privacy.md`, `app/src/legal.ts` |
| Harness | Stubbed-SSO core + one-command native launch; dev fixture page; Playwright screens; scripted audit. | `scripts/stub-core.sh`, `scripts/dev-app-stub.sh`, `app/dev/*` |
| Build record | this file, `DECISIONS.md` (30 decisions), `AUDIT.md`, `screens/` (31 PNGs: every onboarding screen, Home at 1m/3m/semester, hover bubble, exam popup, Exam Prep, Calendar, add-event sheet, Settings bottom — Paper + Night; bubble also Forest + Contrast; reduced-motion Connect). | |

## Not done (honest list)

- **Native-window screenshots / click-through:** this agent process has no macOS Screen Recording or Accessibility permission, so it could launch the native app (`tauri dev`, stub core, fresh `DEV_USER_ROOT`, boot log verified) but not drive or capture it. Screens come from the real bundle in Chrome via the dev harness. **Jacob:** `PN_DEV_PORT=1430 scripts/dev-app-stub.sh` walks the native onboarding → Home in one command with no Canvas.
- **Perf timing in the native webview** (tab-switch paint in ms) — not measured natively for the same reason; daemon-side before/after is recorded (4.12 s → 0.64 s), and production-bundle interaction timings are in AUDIT.
- Gmail-triage **producer** for calendar suggestions (contract + reader + fixture only, per Q3).
- Google Calendar write from the new Calendar tab (not this round; the existing guarded preview→confirm flow is reachable under Settings → Calendar and email).
- Item authoring UI (removed with Sources; study-core commands intact) — see DECISIONS D-23.
- Open audit items A-04, A-06, A-08–A-11 (each has a proposed fix in AUDIT).
- `docs/build/ui-round1/COMPARISON.md` / integration (§9) — for the third agent.

## How to run

```bash
cd ~/.cache/productname-cand-c
# checks
(cd browser && npm test)                       # 101 pass
(cd app && npm run build && npm test)          # build ok; 26 pass
.venv/bin/python -m pytest tests/ -q           # 830 passed, 21 skipped
.venv/bin/ruff check src/ tests/ && .venv/bin/mypy src/
(cd app/src-tauri && cargo test --locked)      # 21 pass (1 ignored fixture dumper)
# native app, no Canvas, fresh profile (uses port 1420 unless PN_DEV_PORT is set)
scripts/dev-app-stub.sh
# screens (needs a Vite dev server for app/ on 1430)
(cd app && node dev/screens.mjs http://localhost:1430 ../docs/build/ui-round1/candidate-c/screens)
```

Baseline observed on this checkout before any change: browser 92 pass; app 11 pass but `npm run build` **failed** (`realCore.ts` Node types — fixed); Python 827 pass (after venv deps); cargo 8 pass (after creating the empty `runtime/{python,node,browser-node_modules}` dirs `tauri.conf.json` requires).

## Owner questions (§8) — how this candidate proceeded

- **Q1** tab = Calendar, page = Exam Prep. Done.
- **Q2** commitment rebuilt at the top of Calendar. Done.
- **Q3** contract + reader + fixture only; no producer, no account-scope assumption.
- **Q4** cluster at 7 px centre distance (small ticks only). Done.

## Blockers / notes

- Port 1420 was held by another agent's Vite during this build; everything here ran on 1430/1431. `dev-app-stub.sh` honours `PN_DEV_PORT`.
- A stub marker file (`auth/stub-logged-in`, 24 bytes) was briefly written into the default `dev` profile by an early run of the daemon e2e test before D-28; it was deleted. Nothing else in a real profile was read or written.
