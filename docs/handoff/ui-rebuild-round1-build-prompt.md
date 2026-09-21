# UI rebuild, round 1: onboarding, semester line, calendar, front-end audit

Prepared September 18, 2026 from Jacob's unfiltered walkthrough of the current app. This is a **build execution prompt** for two competing coding agents plus a comparison, in the same shape as `docs/handoff/student-beta-agent-build-prompt.md` (read that prompt's §3 "Hard boundaries" and §8 "Verification strategy" — they still apply and are not repeated here).

**How Jacob should run it:** give each agent this repository and say: "Execute `docs/handoff/ui-rebuild-round1-build-prompt.md` as candidate **C** [or **D**]. Create your own worktree first (§0). Start now." When both finish, give a third agent (or one of the two) §9 to produce the comparison and integrate.

**Scope in one sentence:** make onboarding show instead of tell, make Canvas sign-in mandatory and automatic, replace the "import a source" model with a Canvas-fed home screen built around a per-course semester number line, fix the Calendar/Plan surface, and audit the front end for slowness and bugs — without touching the study/learning session itself.

---

## 0. Operating rules (read before anything else)

1. **Separate worktrees, always.** Last round two agents edited the same iCloud checkout and clobbered each other. Before any edit:
   ```bash
   git worktree add ~/.cache/productname-cand-c -b candidate-c phase1-productname-pivot   # or -d / candidate-d
   ```
   Work only inside your worktree. Native builds (`cargo`, `tauri build`) must go through `scripts/native-mirror.sh` because iCloud paths break them (see `docs/build/` and memory note "iCloud checkout blocks native builds"). Tooling lives in `/opt/homebrew/bin`.
2. **Branch discipline:** commit to your candidate branch only. Never touch `main` or `origin/main`. Do not push unless Jacob asks.
3. **Inventory the dirty checkout first** (`git status`). `phase1-productname-pivot` has uncommitted work from the student-beta build; your worktree starts from the committed tip, so read `docs/build/student-beta/STATUS.md` and `COMPARISON.md` to know what exists and what was adopted from candidate B.
4. **Synthetic data only.** Use a synthetic `DEV_USER_ROOT` with fixture course JSON under `inbox/study-sources/`. Never trigger a personal Canvas sync or read Jacob's real inbox for coding context. Build fixtures that exercise: 4 courses, ~40 assignments, 6 quizzes, 3 exams, one course with no term dates, one course with assignment-group weights and one without.
5. **Learning side is out of scope.** `StudyView.tsx`, `ReviewSession.tsx`, the study engine, `learn_loop`, grading, and the 5–10 minute session are **not** to be redesigned. You may route *into* them and read their state. If the semester line needs a hook the study side doesn't expose yet, add a minimal read-only IPC and note it.
6. **Product boundaries from CLAUDE.md are unchanged:** Canvas submit/post/discussion stay preview-only; Gmail send and Google Calendar writes only behind `ConfirmationGuard` / `gate_connector_write`; no streaks, leaderboards, or "exam-ready %"; no self-rewriting prompts; no Buff Portal/DegreeWorks.
7. **Desktop-only from now on.** Jacob wants the app to feel like an app, not a web page. The non-Tauri browser fallback (`!isTauri()` branches that let a user proceed without Canvas) is removed from onboarding. Keep the Vitest/jsdom tests working by mocking `ipc.ts`, not by keeping a browser-mode product path.

---

## 1. What Jacob said, translated

These are the owner's words rendered as requirements. Where he gave a design detail, it is a requirement; where he said "figure it out," it is your call and must be recorded in `docs/build/ui-round1/<candidate>/DECISIONS.md`.

### 1.1 Onboarding — "show, don't tell"

The onboarding theme: **college students will not read.** Every screen is visual first; explanatory paragraphs are deleted, not shortened. Three screens total: **School + Accept → Connect Canvas → Syncing → Home.** The old "Ready for a first check / Open Study" screen is cut.

**Screen 1 — School + terms**
- School picker stays (`cu-boulder`, `waitlist`).
- The terms are **not displayed on the screen**. A "View terms" control opens a modal/sheet with the full text (scrollable there, dismissable). Nothing to scroll on the onboarding screen itself.
- Two stacked buttons, **same width and height**, in this order: **Accept terms** above **Continue**.
  - "Accept terms" is a toggle with an obvious filled/checked state when tapped (the current checkbox does not visibly fill — that is the bug he named). Tapping again un-accepts.
  - "Continue" is dim/disabled until Accept is on. (He liked that behavior; keep it.)
- If school = waitlist, Continue goes to a waitlist screen and the flow ends there; the student does not enter the app. Mandatory Canvas sign-in means unsupported schools cannot proceed.

**Screen 2 — Connect Canvas**
- Everything centered; **rule-of-thirds layout**: title in the top third, animation in the middle third, buttons pinned in the bottom third.
- Delete the paragraph ("Signing in lets the app pull your course pages…"). Replace with a **CSS/SVG animation** built in code (no video, no Lottie, no external assets, theme-aware, honors `prefers-reduced-motion` with a static final frame): a stylized Canvas window → a cursor moves to and clicks "Sign in" → course cards fly out of the Canvas window into a stylized ProductName window. Loop it gently.
- **Sign-in is mandatory. No "Skip for now."** The only button is **Sign in to Canvas**.
- Failure/abandon path: stay on this screen, keep the animation, show a **Try again** button and *one* short line of what went wrong (login window closed, no session found, network). There is no way past this screen without a session.
- If a session already exists (returning device), auto-advance to Screen 3 after a brief "Already signed in" state so the student sees why they skipped a step.

**Screen 3 — Syncing**
- New. Runs `sync_study_sources` (and the week sync) immediately after sign-in. This is the strongest "show don't tell" moment: **courses appear one at a time as they finish loading**, each as a card in its assigned course color (see §1.2 colors), with a small count of what was found (assignments / quizzes / exams). No paragraphs.
- On completion, transition into Home. If sync partially fails, show which courses loaded and a retry for the rest; the student still enters Home with what loaded. Never invent data for failed courses.
- Sync must stream progress to the UI. If the current `sync_study_sources` command is fire-and-wait, add a Tauri event per course (like `onInboxUpdated`) or a polled progress file — your choice, record it.

### 1.2 Home — the semester number line

This is the central UI. Everything from Canvas lives here and is reachable by clicking.

**Layout**
- **One row per course**, stacked vertically, all rows sharing one horizontal time axis so "today" is a single vertical line down the whole page.
- Each course gets a **unique color** assigned at first sync (deterministic from course id, chosen from a palette that stays distinguishable in every theme and for common color-vision deficiencies — validate with the `dataviz` skill's palette guidance if available). The color is used for the course's ticks, its card on the Syncing screen, and its accents elsewhere.
- Right end of the axis = end of semester. Source of truth: Canvas term/course `end_at` when present; otherwise fall back to (last due date + 7 days). Left end = term `start_at` or (first due date − 7 days). Record the fallback per course in the data model and show nothing that implies certainty you don't have.
- **Range selector**: **1 month / 2 months / 3 months / Full semester**, starting at today. Default: 1 month. Persist the choice.

**Ticks**
- Every graded item is a tick on its course row at its due date. **Tick height encodes grade weight**: the smallest ticks are the items with the least grade impact; quizzes are taller; exams are tallest. Compute weight as the item's share of the course grade:
  - If the course uses assignment-group weights (`GET /api/v1/courses/:id/assignment_groups` → `group_weight`), weight = `group_weight × points_possible / group_total_points`.
  - Otherwise weight = `points_possible / total_points_possible`.
  - Zero-point / ungraded items get the minimum tick.
  - Map weight to height with a monotonic scale that has a visible floor (small homework must still be hoverable — see hit targets below) and a cap. Exams/quizzes detected by the existing `EXAM_TITLE_RE` / `quiz_type` logic are additionally shape- or weight-distinguished so a low-point quiz still reads as a quiz.
- This requires extending `browser/scripts/sync-study-sources.mjs` + `lib/study-sources.mjs` to fetch assignment groups and record `assignment_group_id`, `group_weight`, `points_possible`, `due_at`, `html_url`, `submission_types`, and a `kind` (`assignment | quiz | exam | discussion | other`) on every item. Add tests in `browser/tests/`.
- Ticks in the past are dimmed; a tick with a recorded submission/grade (if the API returns it via `include[]=submission`) can show a small completed state. Do not fabricate completion.

**Hover bubble**
- Hovering any tick — including the tiniest — pops a **glass bubble** (translucent, blurred backdrop, soft rounded corners, matches the existing surface style in `styles.css`) **immediately** (no delay) showing: kind badge (Homework / Quiz / Exam / Discussion…), title, course, due date/time, points and computed weight, and an **Open in Canvas** link that opens `html_url` in the system browser (Tauri opener/shell — check `capabilities/default.json` and add the permission).
- Hit target: at minimum 12px wide regardless of tick height; keyboard focusable, arrow keys move between ticks in a row, Enter opens the bubble. Bubble must never clip off-window.

**Click on exam or quiz tick → prep popup**
- Clicking an exam/quiz tick opens a larger glass popup (same style as the hover bubble): what the exam is, what it covers (from the syllabus/assignment description already synced into `inbox/study-sources/<course>.json`), when, and a button at the bottom: **View plan**.
- **View plan** navigates to the **Exam Prep page** (§1.3). Clicking a non-exam tick opens the same popup without the plan button (info + Open in Canvas).

### 1.3 Exam Prep page

- Header: the exam name **top-center, small**, inside a **circular translucent glass bubble** (same material as the popups).
- Body: a **day-by-day plan from today until the exam**, laid out as a vertical list or timeline (one entry per day, what to study and how — chunked from the synced source material for that course/exam). Each day is a card; today's is emphasized.
- The plan is **deterministic in this round** (no model call): split the exam's covered sources across the available days, weight recent/heavier topics later, leave the last day as review. Label it as a draft plan. Keep a seam (`buildExamPlan(exam, sources, today) → Plan`) so a model-backed planner can replace it later without UI changes.
- Two actions:
  - **Redo this plan** — re-generates (with a different chunking seed this round; later this is "have the agent redo it"). Must be honest that it's a reshuffle until the model path exists.
  - **Let's test your knowledge** — bottom, prominent. Routes into the **existing** Study session for that course/exam if source-backed items exist (`StudyView` entry with a preselected course/exam — add a prop/route, do not redesign the view). If no practice items exist yet, show an honest empty state ("No practice items for this exam yet") — never a fake quiz.
- Do not build the adaptive evaluation. It is explicitly next round.

### 1.4 Calendar tab (formerly Plan)

- The tab is renamed **Calendar** (the word "Plan" now belongs to the Exam Prep page — see open question Q1).
- The **calendar moves to the bottom** of the tab; it is not the main focus.
- Above it: the **commitment** concept survives (pick one thing to do today, resolve it later) but its UI is rebuilt to match the glass/tick visual language. Keep the existing `set_commitment` / `resolve_commitment` / `read_commitment` IPC.
- A real **button** (not a hyperlink) — **Add to calendar** — opens a sheet to add: **study block, class meeting, exam, personal event**, with course/color, date, time range, optional note. Storage is **local** (`{user_root}/inbox/calendar.jsonl` or similar; record schema). Writing to Google Calendar is *not* wired in this round; leave the seam and the `ConfirmationGuard` requirement documented.
- **Email-suggested events (backend seed):** Jacob wants the email-triage agent to *suggest* calendar events it finds in mail. This round: define the contract only — a `inbox/calendar-suggestions.jsonl` file written by the Gmail triage path (see `mcp-servers/gmail/`, `skills/`), each row `{source_message_id, title, start, end, confidence, why}`, and a read-only "Suggested" section in the Calendar tab where each suggestion has **Add** (local calendar) / **Dismiss**. Do not build Outlook. Do not auto-add anything. If time is short, ship the schema + reader with a fixture and record the producer as pending.

### 1.5 Navigation and shell

- Tab bar becomes **Home / Study / Calendar / Settings**. **Sources is removed** as a tab. "Import a source" as a user-facing concept is gone; Canvas sync is the only ingestion path. If `SourcesView` logic is still needed for provenance/inspection, move it under Settings → "Canvas data" as a read-only inspection panel, not an import flow.
- Home is the landing tab after onboarding and on every launch.
- Keep the Tauri window sizing/dock behavior Jacob likes: onboarding at the small centered size, workspace expanding to the larger window (`dock.rs` modes). Do not change the window animation.
- Themes (Paper / Night / Forest / High contrast) stay. "Clean up" means: consistent tokens (surface, glass, accent, course palette) across all four, no theme where the glass bubbles or ticks lose contrast, and consistent typography across every view (Settings currently uses a different type treatment than the rest — unify to one scale in `styles.css`).

### 1.6 Bugs and front-end audit

Fix these, with a reproducible before/after in your build record:

| Symptom (Jacob) | Lead | Requirement |
|---|---|---|
| Plan tab takes ~1s to open | `PlanView` mounts six independent daemon round-trips (`readDueReviews`, `readCheckIntention`, `readBriefStreak`, `readLearnProgress`, `readEvaluationCompare`, `readCommitment`), each a Python process hop | Batch into one IPC (`read_plan_surface`) or render skeletons instantly and stream; tab switch must paint within one frame and populate < 300 ms on the fixture profile. Measure and record |
| Settings goes white at the bottom when scrolling | `body { background: transparent }` on a transparent Tauri window; nothing paints below content | Paint the theme surface on the scroll container / window background; verify in all four themes and both window sizes |
| Clicking Plan "doesn't work" | Unknown — reproduce first. Suspects: the slow load above, a thrown promise in one of the six reads when state files are missing on a fresh profile, or the tab button's keyboard handler | Reproduce on a fresh synthetic profile; fix root cause; add a test |
| Settings text doesn't match the rest | Separate font-size/weight/line-height in Settings styles | Unify type scale (see §1.5) |
| Buttons "loading slowly" elsewhere | Not reported broadly; Jacob said mostly the Plan button | Part of the audit below |

**Front-end audit (required deliverable):** walk every view and every button on a fresh synthetic profile and record, in `docs/build/ui-round1/<candidate>/AUDIT.md`: what each control does, any control that does nothing / throws / needs >300 ms, any console error, any IPC call that fires more than once per interaction, dead code paths (e.g. the removed browser-mode branches), and accessibility regressions (focus order, reduced motion). Fix what is bounded; list the rest with a proposed fix. **Do not restyle buttons globally** — Jacob wants that to be gradual; only fix broken states (like Accept's missing filled state).

### 1.7 Legal text

Write a **complete first-draft Terms of Service and Privacy Policy** and replace `docs/legal/terms.md`, `docs/legal/privacy.md`, and the strings in `app/src/legal.ts` (which should now load from a single source, not duplicate prose). Not lawyer-reviewed; label the draft with a date and "beta draft." It must accurately describe: local-first storage under the user profile; what is read from Canvas via the student's own SSO session; that nothing is submitted/posted to Canvas on the student's behalf; Gmail send / Google Calendar writes only after per-action confirmation; optional opt-in usage counts only; no persistence of study/email content by any ProductName service; provider (Claude/Gemini) processing and retention disclosed as separate; FERPA/academic-integrity responsibility stays with the student; no affiliation with CU Boulder or Instructure; beta, as-is, no warranty; contact and revocation/deletion (delete the profile folder = delete the data). Keep the per-school variation (`LEGAL_BY_SCHOOL`) as a short preamble, with the full text shared.

---

## 2. Data model additions (both candidates must produce these; shape may differ)

- `inbox/study-sources/<course>.json` (schema bump to 2): per-item `kind`, `points_possible`, `assignment_group_id`, `group_weight`, `due_at`, `html_url`, `submission_types`, and computed `weight_share`; per-course `term { start_at, end_at, source: "canvas" | "inferred" }`, `color`.
- A Rust/daemon read command for the Home screen (`read_semester` or similar) that returns all courses + ticks for the range in **one** call, computed from the JSON — the front end must not parse Canvas payloads itself.
- `inbox/calendar.jsonl` (local events) and `inbox/calendar-suggestions.jsonl` (contract only).
- Sync progress events for Screen 3.

Put the tick-weight and term-inference logic in a pure, unit-tested module (JS in `browser/scripts/lib/` if the sync computes it, or Python in `src/canvas_mcp/core/` if the daemon does — pick one and justify). Do not compute weights in React.

---

## 3. Visual language (shared constraints)

- **Glass**: one reusable `.glass` surface — translucent fill, `backdrop-filter: blur`, 1px hairline border at low alpha, large radius (≥16px; the exam header bubble is a circle). Must read correctly on all four themes.
- **Motion**: purposeful, short (≤ 240 ms for UI, the onboarding animation can loop longer), all gated by `prefers-reduced-motion` with a meaningful static state.
- **No subtext on onboarding screens.** A title and controls. If you believe a screen genuinely needs one line, argue it in DECISIONS.md — the default is zero.
- **Course palette**: 8 colors minimum, deterministic assignment, verified distinguishable on light and dark surfaces and under deuteranopia simulation. Record the hexes and the check you ran.
- Keep the existing brand-mark placeholder; `ProductName` is still not a brand.

---

## 4. Verification (in addition to the student-beta prompt §8 table)

| Check | Requirement |
|---|---|
| Frontend | `cd app && npm run build && npm test`. Add Vitest + Testing Library coverage for: Accept/Continue gating; terms modal open/close; sign-in failure keeps the user on Screen 2; Syncing screen renders courses from progress events; semester line renders N rows / correct tick heights from a fixture; range selector; hover bubble content + Open in Canvas; exam click → popup → Exam Prep route; Calendar add sheet writes a local row; Plan-surface load is a single IPC |
| Browser sync | `cd browser && npm test`; new tests for assignment-group weighting, term inference, `kind` classification |
| Python | `uv run python -m pytest tests/ -q`, `ruff`, `mypy` clean if you touched `src/` |
| Native | `scripts/native-mirror.sh cargo test --locked`; the app must launch, run onboarding end-to-end against the synthetic profile with a **stubbed** SSO (do not sign in to real Canvas during the build), and reach Home |
| Perf | Record tab-switch and Home first-paint timings on the fixture profile before and after |
| Visual | Screenshots of every onboarding screen, Home at each range, a hover bubble, the exam popup, Exam Prep, Calendar — in Paper and Night at minimum — saved under `docs/build/ui-round1/<candidate>/screens/` |
| Hygiene | `git diff --check`; no `.env`, `browser/.auth/`, or real user data committed |

---

## 5. Build record (per candidate, under `docs/build/ui-round1/<candidate>/`)

- `STATUS.md` — one page: what's done, what's not, how to run, blockers.
- `DECISIONS.md` — every judgment call this prompt left open, with the alternative you rejected.
- `AUDIT.md` — the front-end audit (§1.6).
- `screens/` — screenshots (§4).
- Keep commits small and messaged by surface (onboarding / semester-line / calendar / audit / legal).

---

## 6. Order of work (default; reorder with a reason)

1. Worktree + baseline checks + fixtures (≤ 30 min).
2. Data model + sync extension + `read_semester` (the line cannot be designed against fake shapes).
3. Home semester line: rows, ticks, range, hover bubble, click popup.
4. Onboarding rewrite (Screens 1–3) with the animation and Syncing progress.
5. Exam Prep page (deterministic plan + routes).
6. Calendar tab rebuild + local events + suggestions reader.
7. Bug fixes + front-end audit + theme/typography unification.
8. Legal text.
9. Build record, screenshots, final integrated pass on a fresh synthetic profile.

If you run out of time, the must-ship subset is **2–4 + the Plan-tab slowness fix**. Everything else must appear in STATUS.md as not done, not as done.

---

## 7. Explicitly not in this round

- Any change to the study session, review flow, grading, or spacing logic.
- The adaptive "test your knowledge" evaluation (button routes to existing study or an honest empty state).
- Model-generated exam plans (deterministic seam only).
- Google Calendar / Gmail writes (contract + local storage only).
- Outlook anything.
- A global button restyle or a new design system.
- Videos/Lottie assets (CSS/SVG only; video is a possible later swap).
- Browser-only build support.

---

## 8. Owner questions still open (proceed on the recommendation; flag in STATUS.md)

- **Q1 Naming:** the tab was "Plan"; the exam page is also a "plan." Recommendation: tab = **Calendar**, page = **Exam Prep**. Proceed unless Jacob objects.
- **Q2 Commitment:** rebuild in place at the top of Calendar (recommendation) vs. fold into Home as a small card. Proceed with Calendar.
- **Q3 Email → calendar suggestions:** Gmail only this round, contract + reader + fixture; producer wired only if the Gmail triage path already runs in-app. Confirm account scope with Jacob before building a producer.
- **Q4 "Everything on the line":** Jacob wants every graded item as a tick (small → large). If a course has 100+ tiny items in a month, cluster overlapping small ticks into one hoverable group at the current zoom. Recommendation: cluster; record the threshold.

---

## 9. Comparison and integration (run after both candidates finish)

Produce `docs/build/ui-round1/COMPARISON.md` in the same form as `docs/build/student-beta/COMPARISON.md`: per subsystem (data model + sync, `read_semester`, semester-line rendering, onboarding + animation, Syncing progress, Exam Prep, Calendar, perf fixes, audit quality, legal text, tests), state which candidate is adopted and why, with evidence (test counts, timings, screenshots), not preference. Then integrate the adopted pieces onto `phase1-productname-pivot` in a third worktree, run the full §4 table again, and write `docs/build/ui-round1/STATUS.md` as the re-entry point. Both candidate branches stay intact.
