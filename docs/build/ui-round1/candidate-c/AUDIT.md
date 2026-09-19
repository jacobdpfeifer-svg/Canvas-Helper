# UI round 1 — candidate C — front-end AUDIT

Walk of every view and control on a fresh synthetic profile. Two instruments:

1. **Scripted walk** (`app/dev/audit.mjs`, Playwright + system Chrome) over the fixture harness, run against the **production bundle** (`app/dev/vite.audit.config.ts` → `vite preview`), recording per interaction: outcome, wall time, IPC commands issued (from the shim's call log), console errors. Dev-mode numbers double every mount-time IPC because of React StrictMode; production numbers below are the real ones.
2. **Daemon-side timing** in Rust (`cargo test plan_surface_is_one_process_not_six -- --nocapture`) on this machine, fresh profile, repo venv Python.

## Bugs Jacob named — before / after

| Symptom | Root cause found | Fix | Evidence |
|---|---|---|---|
| Plan tab takes ~1 s to open | `PlanView` fired 6 independent `invoke`s on mount; **each Tauri command was a sync `fn`, which Tauri 2 runs on the main thread**, so the webview could not paint until all six Python processes (cold MCP-package imports) had exited. | All process-spawning commands are `#[tauri::command(async)]`; the six reads collapse into one `read_plan_surface` (one Python process, `canvas_mcp.core.plan_surface`); the tab renders skeletons on the first frame and fills in. | Daemon timing, fresh profile: **six processes 4.12 s → one process 0.64 s**. Production walk: Calendar tab paint 46 ms with the surface arriving 78 ms later (shim latency); IPC per open = `read_plan_surface, read_calendar, read_semester` (3, was 6 + 0). |
| Settings goes white at the bottom when scrolling | `html, body, #root { background: transparent }` left the window backing colour (white) visible below the scrolled content once the window stopped being transparent. | `#root`/`body` and `.workspace-main` paint `var(--surface-solid)`. | Production walk step "Settings: scroll to bottom": `main bg = rgb(12,16,24)` (Night); screens `*-09-settings-bottom.png` in Paper and Night. |
| Clicking Plan "doesn't work" | Same main-thread block as above: the click registered but nothing painted for the duration of six process spawns (≈ 1–4 s depending on import cache), so the tab looked dead. A second contributor on a fresh profile: any one of the six reads throwing left its section permanently in the skeleton state. | Async commands + one batched read whose sections are individually try/except-isolated (`plan_surface.py`, tested: one broken section reports in `errors[]`, the rest render). | `tests/core/test_plan_surface.py` (3), `CalendarView.test.tsx` "loads the learning surface in ONE IPC", production walk "Tab: Calendar (paint) 46 ms". |
| Settings text doesn't match the rest | Settings' `<p>`/`<li>`/`<dd>` inherited `13.5px` from `:root` while the other views set their own sizes; no shared scale. | One token scale (`--text-xs…xl`) applied under `.workspace-main` for headings, body, labels, muted. | `styles.css` "UI round 1" block; screens `*-09-settings-bottom.png`. |
| Buttons "loading slowly" elsewhere | Only reproducible instance was the Plan tab (above). Every other control in the walk completes in < 260 ms with the shim's 40 ms simulated latency. | — | Table below. |

## Scripted walk (production bundle)

| Step | ok | ms | IPC issued |
|---|---|---|---|
| Home: first paint | ✓ | 69 | (read_semester on mount) |
| Home: range → 3 months | ✓ | 136 | read_semester |
| Home: hover a tick (bubble) | ✓ | 60 | — |
| Home: Open in Canvas (bubble) | ✓ | 29 | open_external |
| Home: click exam → popup | ✓ | 124 | read_exam_prep |
| Popup: View plan → Exam Prep | ✓ | 84 | read_exam_prep, study(status) |
| Exam Prep: Redo this plan | ✓ | 174 | read_exam_prep (was + study; fixed A-05) |
| Exam Prep: Open in Canvas | ✓ | 31 | open_external |
| Exam Prep: Let's test your knowledge → Study | ✓ | 44 | study(offer), study(status) |
| Study: first paint | ✓ | 24 | — |
| Study: Canvas data → Settings | ✓ | 44 | study×5, runtime_info, list_profiles (A-04) |
| Tab: Calendar (paint) | ✓ | 46 | read_plan_surface, read_calendar, read_semester |
| Calendar: commit one thing | ✓ | 113 | set_commitment, read_plan_surface |
| Calendar: suggestion Dismiss / Add | ✓ | 220 / 133 | decide_calendar_suggestion |
| Calendar: Add to calendar → Add | ✓ | 155 | add_calendar_event, read_calendar |
| Calendar: remove event pill | ✓ | 138 | delete_calendar_event, read_calendar |
| Calendar: month next/prev | ✓ | 51 | — |
| Calendar: command palette open/close | ✓ | 33 | — |
| Tab: Settings (paint) | ✓ | 29 | study×5, runtime_info, list_profiles (A-04) |
| Settings: theme ×4 | ✓ | 130 | — |
| Settings: reduce motion | ✓ | 66 | — (`data-motion=reduced`; animation freezes on the static frame) |
| Settings: Check session | ✓ | 35 | check_canvas_session |
| Settings: Canvas data Inspect | ✓ | 30 | — |
| Settings: View terms & privacy → Esc | ✓ | 40 | — |
| Tab: Home (paint) | ✓ | 111 | read_semester |
| Keyboard tab order (Home) | ✓ | — | skip-link → tabs → range radio → ticks in row order |

Console: one `404` for `/favicon.ico` (no favicon shipped; harmless in Tauri, listed as A-08).

## Findings

| # | Finding | Status |
|---|---|---|
| A-01 | `check_canvas_session` and `bootstrap_canvas_sync` were never listed in `build.rs`'s command manifest nor in `capabilities/default.json`; Tauri's ACL had no `allow-*` permission for them. | **Fixed** (registered). |
| A-02 | Baseline `npm run build` failed: `src/test/realCore.ts` uses Node globals with no `@types/node`. | **Fixed** (`@types/node` dev dep, `types: ["vite/client","node"]`). |
| A-03 | Six independent Python spawns on Plan mount, on the main thread. | **Fixed** (D-15, D-16). |
| A-04 | Settings mount spawns 7 processes (`ai-status`, `status`, `connectors-status`, `canvas-sources`, `packets`, `runtime_info`, `list_profiles`). Async now, so nothing blocks, but ≈ 1–2 s of background churn per open on a cold cache. | **Open** — proposed: a `settings-surface` study command returning ai/connectors/canvas-sources/packets in one process, mirroring `plan_surface`. |
| A-05 | Exam Prep re-read `study.status` on every "Redo" because the effect depended on the whole `prep` object. | **Fixed** (depends on course label/code). |
| A-06 | Dead code: `components/NarrateAfter.tsx`, `components/ApprovalSheet.tsx` have no importers (dock-era). `inbox.rs::week_md_path` / `parse_week_top3` unused (`read_top3` is registered but no view calls it). | **Open** — proposed: delete `NarrateAfter`; keep `ApprovalSheet` only if a connector approval UI lands next round; drop `read_top3` + `inbox.rs` parsing or wire Home's status line to it. |
| A-07 | Browser-mode product branches (`!isTauri()` early returns in `ipc.ts`, `study/api.ts` runtime helpers, `SourcesView`, `SettingsView`, `FirstRun`) let a user proceed without Canvas. | **Fixed** (removed; tests mock `ipc`). Only the study dev bridge keeps `isTauri()`. |
| A-08 | No favicon → one 404 per load in a browser; Tauri's asset protocol also logs it. | **Open** — trivial: add `app/public/favicon.svg` (brand-mark placeholder). |
| A-09 | `Onboarding.tsx` (the long preferences wizard embedded in Settings) still calls `bootstrapCanvasSync()` after a session check — harmless (fire-and-forget), but Settings → Open preferences can now trigger a deep week sync the student did not ask for. | **Open** — proposed: remove the call from the preferences path; the daemon already schedules the deep sync after source sync. |
| A-10 | `CommandPalette` "sync" action calls `sync_canvas` (week sync) not the study-source sync; Home's "Sync Canvas" button calls the source sync. Two different "sync"s. | **Open** — proposed: one `sync_all` command (sources → week) used by both. |
| A-11 | Accessibility: onboarding Accept toggle is `role=checkbox` + `aria-checked`; ticks are buttons with full labels (`Exam: Midterm 1, due …, 15% of grade`); bubble is `role=tooltip`; popups are `role=dialog aria-modal` with focus moved in and Esc to close; month grid uses `role=grid`. Focus is not trapped inside dialogs (Tab can leave). | **Open** — proposed: small focus-trap hook shared by ItemPopup / AddEventSheet / TermsSheet. |
| A-12 | Reduced motion: system `prefers-reduced-motion` and the app's Reduce-motion switch both freeze the Connect animation on its final frame (verified: `.anim-cursor animation-name: none`, `.anim-line` painted accent); tick bubbles have no animation; sync cards use a 320 ms land animation that the global reduced-motion rules zero. | ✓ |
| A-13 | The harness's `read_semester` for "2 months" returns the 1-month fixture (no `semester-2m.json`); the daemon computes 2m correctly (`window_for`). | Harness only — noted. |
| A-14 | Native-window screenshots and click-driving were impossible from this process (macOS denied Screen Recording / Accessibility to the agent host). The native app launched with the stubbed core and the daemon path was exercised by `daemon::round1_tests::stubbed_sync_streams_events_and_feeds_home` (session probe → SSO stub → streamed sync → `read_semester` → `canvas-import` → study status). | Documented; `scripts/dev-app-stub.sh` lets Jacob walk the native app in one command. |
