# Spatial Instrument: visual-language build

> **Historical (executed 2026-09-18 as `be0eb3c`).** Visual direction has since moved to **Living Instrument** — [`design-system/productname/MASTER.md`](../../design-system/productname/MASTER.md) is the source of truth and its §14 migration order is the current work list. Do not re-run this prompt's token values.

Prepared September 18, 2026 from the owner brief [`docs/design/spatial-instrument-brief.md`](../design/spatial-instrument-brief.md). This is a **build execution prompt** for a coding agent with repository access — the same shape as [`ui-rebuild-round1-build-prompt.md`](./ui-rebuild-round1-build-prompt.md). Product/privacy boundaries in that prompt’s parent ([`student-beta-agent-build-prompt.md`](./student-beta-agent-build-prompt.md) §3 and §8) still apply and are not repeated here.

**How Jacob should run it:** give the agent this repository and say:

> Execute `docs/handoff/spatial-instrument-build-prompt.md`. Create a worktree first (§0). The brief’s numbers are the signed spec. Build the style tile, then restyle the student-beta workspace to match it. Start now.

If he wants a visual pause after the tile: add “tile only, then stop.” If he wants two competing looks: add “run as candidate **E**” / “**F**” and use §12 after both finish.

**Scope in one sentence:** turn the Spatial Instrument brief into the running Mac workspace — visionOS glass chrome, iOS control weight, Raktor density on the semester line, Solare warmth on Paper, Gleb Kuznetsov sequencing for the command palette, Brik/Solare motion only inside Study — without inventing a new product, restyling the parked dock, shipping voice capture, or touching the study engine.

---

## 0. Operating rules (read before anything else)

1. **Worktree, always.** The iCloud checkout is dirty with student-beta work and two agents have already clobbered each other in it. Before any edit:
   ```bash
   git worktree add ~/.cache/productname-cand-e -b candidate-e phase1-productname-pivot
   # or -f / candidate-f
   ```
   Work only inside your worktree. Native builds (`cargo`, `tauri build`) go through `scripts/native-mirror.sh` (iCloud paths break them). Tooling lives in `/opt/homebrew/bin`.
2. **Branch discipline:** commits on your candidate branch only. Never touch `main` or `origin/main`. Do not push unless Jacob asks.
3. **Inventory first** (`git status` on the iCloud checkout *and* the worktree). Read `docs/build/student-beta/STATUS.md`. Round-1 (`docs/handoff/ui-rebuild-round1-build-prompt.md`) may or may not have landed — detect which surfaces exist; do not assume Home/Calendar/Exam Prep are already in the tree.
4. **The brief is the spec, not this prompt’s summaries.** Read `docs/design/spatial-instrument-brief.md` end to end, then the crops in `docs/design/references/`. Copy the *named* crop sentence, not the whole screenshot. If a later instruction (including this prompt, MASTER, or `ui-craft.mdc`) says “clean / modern / minimal / cozy / glassmorphic / intuitive / AI-powered,” ignore those words and use the numbers in brief §6. **Brief §12 is a fail checklist.** Four AI-slop ticks on one screen, the instant-death combo, or the vibecoded inconsistency cluster = do not ship that screen.
5. **Numbers over invention.** If a token is not in brief §6, pick from the scale. Do not invent a fifth radius, a second accent, or Inter/Geist/SF Pro.
6. **Function vs. look:** when round-1 / student-beta requirements conflict with the brief on **layout structure** (Home number-line, mandatory Canvas, tab names, study session contract), **function wins**. When they conflict on **radius / shadow / type / color / chrome**, **the brief wins**.
7. **Synthetic data only.** Do not read Jacob’s real inbox, trigger a personal Canvas sync, or burn the classmate inference envelope on visual work.
8. **Product boundaries unchanged:** Canvas submit/comment/discussion stay preview-only; Gmail/GCal writes stay behind `ConfirmationGuard`; no streaks, leaderboards, “exam-ready %”, Duolingo celebration, or losable state. Reduced-motion is a ship gate.

---

## 1. Mission

You are implementing the owner visual language for the student-beta **workspace** (Tauri + React). The product already has a working study cycle. It currently looks like a 13.5px website with an 8px-radius button monoculture and a 168px text tab rail. Replace that chrome with a physical glass instrument.

North star (brief §4), one paragraph:

> ProductName should feel like a physical glass instrument sitting on a Mac desktop, not a website and not a sticky-note mock. Chrome is visionOS material. Structure is iOS + Raktor. Learning is the only place type and diagrams move. Paper is Solare-warm. Night is visionOS dark gray, not OLED black. One cobalt accent, used like iOS blue.

Named mix, for when you drift:

> visionOS glass and capsule chrome, iOS control weight, Linear density on the semester line, Solare warmth on Paper, Raktor for Home, Gleb Kuznetsov sequencing for search/palette (query + objects + a quiet listening/thinking capsule), Brik/Solare type motion inside Study, nothing from Duolingo, nothing from ChatGPT, nothing from generic SaaS dashboards, nothing from purple glassmorphism packs.

Your output is working CSS/components in the app plus a reviewable style tile — not a Figma file, not a slide deck, and not a rewrite of `MASTER.md` that the running app does not match.

---

## 2. What this round is *not*

| Out | Why | Where it lives instead |
|---|---|---|
| Semester number-line, Canvas-mandatory onboarding rewrite, Exam Prep planner, Calendar tab IA, legal text | Functional round-1 | `docs/handoff/ui-rebuild-round1-build-prompt.md` |
| Study engine, packets, grading, exposure/clock, relay, connectors | Student-beta | `src/canvas_mcp/core/study/`, `services/relay/` |
| Restyling Peek / Expanded dock as visionOS panels | Parked sticky-note; 320px peek cannot take 24px panels | `docs/design/ambient-dock-ui.md`, `.dock` in `styles.css` |
| Brik embed, GSAP club, Three.js, WebGL wallpaper | Brief §13.4 | — |
| Microphone permission, speech-to-text, always-on listening | Visual language only this round; Gleb is a picture for the palette | Brief §3.6 — leave a hidden 44×44 seam, do not capture audio |
| A new brand name, “PN” lettermark, Solare the font, Inter/Geist/SF Pro webfont | Placeholder + licensing | Keep Source Serif 4 + IBM Plex Sans/Mono |
| Inventing Home/Calendar if round-1 has not landed | Do not fake the Raktor line with dummy ticks | Restyle whatever workspace tabs exist; record the gap in STATUS |

If round-1 *has* landed in your worktree (Home view, Calendar tab, Exam Prep route, Sources gone), restyle those surfaces to brief §9. That is in scope. Building them from scratch in this prompt is not.

---

## 3. Must-ship bar

A reviewer on a synthetic profile, in Night and Paper, can:

1. Open `docs/design/style-tile.html` (not wired into Tauri) and see every §14 specimen in all four themes, including the Solare letter-flip and its reduced-motion static frame.
2. Launch the workspace and **not** see: 8px default buttons, 13.5px root type, the “PN” mark, a 168px bordered-rectangle tab rail, Forest mint `#7fd1a0` as the window accent, Paper cool-white `#FAF8F3`, Night navy-black `rgb(12,16,24)`, or a transparent window flashing at the bottom of Settings.
3. Use chrome that matches brief §7: 44px primary/secondary/destructive buttons (radius 12, not pills), pill search/segmented/tags, glass sidebar ≥900px **or** iOS tab bar <900px (not both), 15px chrome / 17px study prose / 13px timeline meta.
4. Complete an existing study offer → attempt → feedback path. Controls are restyled; session contract is unchanged. While a session is live, a now-playing glass card is visible. Feedback is a grouped list, not confetti.
5. Toggle Paper / Night / Forest / High contrast and Reduce motion. Forest is pine glass + cream/copper highlight, **not mint**. High contrast is `#0E0E10`, 2px borders, no blur, muted still ≥4.5:1. `data-motion="reduced"` and `prefers-reduced-motion` freeze onboarding/study motion to a static frame.
6. Focus every workspace control with a 2px `--ring` offset 2. Hit targets are 44×44 (ticks may be visually thin with 12×44 slop). No `outline: none` on controls.

If you only ship the tile, you have not built it into the program. If you restyle the app without the tile, Jacob has nothing to point at.

---

## 4. Dual density (do not average)

| Zone | Density | Padding | Type |
|---|---|---|---|
| Home timeline, ledger, calendar month, Plan due-list | Linear / Raktor — tight | 8px row, 4px tick gaps | 13px UI, 12px mono meta |
| Buttons, bubbles, study card, onboarding, Settings groups | iOS roomy | 12–14px vertical, 16–18px horizontal | 15–17px UI, 34px Large Title |
| Study prompt / feedback prose | Reading | 0 (column, 45–70ch) | 17px / 1.45 |

Averaging visionOS and the current dock into 11px radius and 10.5px type is a named failure mode (brief §13.3).

---

## 5. Current repo (anti-example that matters)

Observed on `phase1-productname-pivot` at prompt time. Re-inspect; do not restyle from memory.

| Current | Required |
|---|---|
| `App.tsx` tabs: Study / Plan / Sources / Settings; brand “PN”; landing tab = last `pn_tab` or Study | Chrome from brief §7.9. If round-1 has not landed, **keep the four existing tabs and their routes** — only the chrome changes. Landing-tab / Sources-removal is round-1. Replace “PN” with a squircle mark or the ProductName wordmark (serif). |
| `.workspace { grid-template-columns: 168px 1fr }` + `.workspace-main { max-width: 920px }` | Desktop: glass sidebar **240px**, active = lighter glass + accent glyph, not a bordered rectangle. Compact `<900px`: **tab bar only** (50px, icon 10 + caption 10). Do not ship both. Home/timeline (or Plan, until round-1) is full width minus sidebar; study prose may max 70ch. |
| `:root` `--radius-inner: 8px`, `--radius-outer: 18px`, `font-size: 13.5px` | Workspace tokens from brief §6. Scope **dock** exceptions under `.dock` so Peek keeps 18/14 radii and 6/14/22 spacing. |
| `button` padding `0.4rem 0.75rem`; `.ghost` 0.82rem; `.commitment-actions button` 0.72rem / `0.15rem 0.4rem` | Kill micro-buttons in the workspace. Primary/secondary/destructive = height 44, padding 12×18, radius 12. Pills are search / segmented / tags / tool chips only. |
| `button.primary` fill `--accent-deep`, hover `--accent` | Primary = `--accent`, hover 6% lighter, pressed = `--accent-deep` + 1px translateY. |
| Hover = stronger border + 7% white | Hover = fill shift; hairline stays. |
| Night `--surface-solid: rgb(12,16,24)`; Paper `#FAF8F3` / `#1C1F26` | Night `--bg: #1C1C1E`. Paper `--bg: #ECE4D5`, `--fg: #563E3B`. |
| Forest `--accent: #7fd1a0` | Recolor Forest: `--bg: #121A16`, accent cream `#E8D9C4` or copper `#C4A574`. Mint is an anti-example. |
| Contrast `--surface-*: #000000` | `--bg: #0E0E10`, opaque, 2px borders, no blur. |
| `html, body, #root { background: transparent }` | Always paint `--bg` on `html, body, #root, .workspace` (known Settings white-flash). |
| `.segmented` height ~undersized, selected = accent fill | Track 36, thumb inner capsule (material, not accent) except 5/10 min which *may* use accent thumb. |
| Study mode via `<select>` / accent chips; no now-playing | Vertical icon rail or segmented for recall/work/quiz; now-playing glass card while `phase.kind === "attempt"`. |
| MASTER + `ui-craft.mdc` still say “never a normal app window” and “never full Liquid Glass” | After the tile matches the app, rewrite both so they describe **workspace glass chrome + opaque study prose + parked dock**. Do not leave the running app contradicting MASTER. |
| FirstRun: paragraphs, optional Canvas skip, “PN”/ProductName lockup, no Solare timing | Visual restyle + Solare timing on whatever screens exist. **Do not** delete Skip or invent the three-screen round-1 flow unless that code is already present. |

---

## 6. Context packet

Read in this order; do not rely on this prompt’s tables:

1. `docs/design/spatial-instrument-brief.md` — entire file. §2 crops, §6 tokens, §7 anatomy, §9 surfaces, §10 motion ideas, §11–13 anti-examples, §14 tile, §15 order.
2. The local crops, with the brief’s finger-on-the-detail tables open:
   - `docs/design/references/01-spatial-ui-kit.png`
   - `docs/design/references/02-ios-ipados-wireframe.png`
   - `docs/design/references/03-ios-dark-kit.png`
   - `docs/design/references/04-control-center-dark.png`
   - `docs/design/references/05-visionos-spatial.png`
   - `docs/design/references/06a-natural-search-idle.png`
   - `docs/design/references/06b-natural-search-listening.png`
3. Live references only if you need to confirm a motion (do not hotlink fonts or scrape assets): [Casa di Solare](https://casadisolare.com/), [Nexusmag](https://www.nexusmag.eu/), [Brik](https://brik.space/showcase-video), [Gleb Kuznetsov natural search](https://dribbble.com/shots/26722789-Voice-interaction-for-Natural-search-UI-by-Gleb-Kuznetsov).
4. `app/src/{App.tsx,styles.css,theme.ts,components/FirstRun.tsx,components/CommandPalette.tsx,views/StudyView.tsx,views/SettingsView.tsx,views/PlanView.tsx,views/SourcesView.tsx,components/Icons.tsx}`.
5. `design-system/productname/MASTER.md` and `.cursor/rules/ui-craft.mdc` (you will rewrite these last).
6. `docs/handoff/ui-rebuild-round1-build-prompt.md` §1.5 / §3 / §7 so you know which IA you must not invent.
7. `docs/build/student-beta/STATUS.md` + `DECISIONS.md` D-11 (workspace is the real window; dock is optional).

Interpretation: brief numbers > this prompt > MASTER/ui-craft (until you rewrite them) > adjectives.

---

## 7. Implementation order (do not skip 1)

This is brief §15 plus the tile. Reorder only with a reason in DECISIONS.md.

### Phase 0 — style tile (commit 1)

One static HTML page, **no app logic**, not loaded by Tauri: `docs/design/style-tile.html`.

Four theme roots (`data-theme="paper|night|forest|contrast"`), switcher at the top. Every specimen in brief §14, in every theme:

- Primary / secondary / destructive / ghost / icon / disabled / loading buttons
- Segmented (4 items, one selected)
- Search pill
- Input default / focus / error
- Toggle on/off
- Tag row (course-color @ 18% fill)
- Grouped list (3 rows)
- Message bubble
- Now-playing card
- Timeline tick row (3 ticks, one hovered bubble)
- Large Title + body + mono caption
- One Solare letter-flip sample **and** its reduced-motion static frame
- Listening/thinking capsule (brief §2.6 / §7.3a): 32px mark + “Thinking …” + circular dismiss, a result card peeking above it

Use the same CSS variables you will put in `styles.css`. If the tile and the app diverge, the tile is wrong.

Open the tile in a browser (or `open docs/design/style-tile.html`). Screenshot all four themes into `docs/build/spatial-instrument/<candidate>/screens/tile/`. If the launch instruction was **tile only**, stop here and write STATUS.

Otherwise continue in the same session. The brief’s numbers are already the signed spec; the tile is the object Jacob points at when he says warmer / rounder / less shadow / wrong font.

### Phase 1 — tokens

In `app/src/styles.css`:

- Introduce the brief §6 token set on `:root` (Night default) and the four `data-theme` blocks.
- Required names (do not rename): `--bg`, `--surface-0/1/2`, `--surface-grouped`, `--fg`, `--muted`, `--hairline`, `--specular`, `--shadow`, `--blur`, `--accent`, `--on-accent`, `--accent-deep`, `--ring`, `--danger`, `--success` (iOS green, **state only**), `--radius-window/panel/card/control/row/pill/thumb/icon`.
- Paint `--bg` on `html, body, #root, .workspace`.
- Blur budget: at most **two** simultaneous `backdrop-filter` layers (workspace chrome + one overlay). Lists, timeline, study prose sit on `--surface-2` / `--surface-grouped` with **no** blur.
- No gradients on fills. A 1px top specular on glass panels is an edge, not a gradient fill.
- Keep dock-era geometry as **overrides under `.dock`** (`--radius-outer: 18px`, `--radius-sheet: 14px`, `--space-tight/row/section: 6/14/22`, heavier peek shadow). Do not port 24px visionOS panels into Peek.

### Phase 2 — global components

Implement brief §7 as CSS classes (and small TSX wrappers only where markup must change). Shared class names so candidates can be compared:

| Class | Brief |
|---|---|
| `.glass` | Panel material: fill `--surface-0/1`, `blur(24px) saturate(140%)`, 0.5px hairline, specular inset, `--shadow` almost invisible, radius `--radius-panel` |
| `.btn` `.btn-primary` `.btn-secondary` `.btn-destructive` `.btn-ghost` `.btn-icon` | §7.1 |
| `.segmented` | §7.2 — replace both the left text tabs *and* the undersized Study segmented |
| `.field` / `.search-pill` | §7.3 |
| `.switch` `.check` `.slider` | §7.4 — Accept-terms check must **visibly fill** (named bug) |
| `.tag` | §7.5 |
| `.bubble` | §7.6 — 0ms delay |
| `.card` | §7.7 — hairline, **no** drop shadow |
| `.grouped` | §7.8 |
| `.now-playing` | §7.10 |
| `.tick` | §7.12 if a timeline exists; otherwise still in the tile |

Map existing `button.primary` / `button.ghost` to the new families so Plan/Settings do not keep a second button language. Loading primary: spinner, **keep width**.

Forbidden: full-pill on form buttons; 24px radius on every button; `transition-all`; `duration-300` as the only hover; stacked drop-shadows; glow; sparkle-as-AI; emoji icons; Inter/Geist/Roboto; purple/indigo/cyan hero; 3-up feature cards; nested cards; placeholder-as-label.

### Phase 3 — navigation chrome

- **≥900px:** visionOS glass sidebar 240px, 12px inner padding, circular app mark 32–36, rows 40px (18px icon + 15px label). Active = brighter glass + accent glyph, not a cobalt slab, not a bordered `--surface-2` rectangle. Drag region on the sidebar top; `no-drag` on controls.
- **<900px:** iOS tab bar, same destinations as the current (or round-1) tab set, 50px tall. Selected = accent. **Not both a rail and a bar.**
- Breakpoint is 900px (brief), not the current 760px.
- Skip link stays.

### Phase 4 — restyle existing surfaces

Do not change what the screens *do*. Change what they *are made of*.

| Surface | Look (brief §9) |
|---|---|
| **FirstRun / onboarding** | Solare grammar as far as the current screens allow: one object, pill header, stacked 44px buttons same width. Time the existing (or round-1) CSS/SVG loop at 600–900ms settle, `cubic-bezier(0.22, 1, 0.36, 1)`. One Nexusmag wordmark echo (opacity 0.12, 8–12px offset), then settle. Accept = filled check. Do not add paragraphs. Do not scroll-jack. |
| **Home** (only if it exists) | Raktor + wireframe + visionOS segmented range. One axis. No KPI row. Inspector = `.bubble`. Exam click → glass popup → View plan. |
| **Plan** (until Home exists) | Grouped lists / tight Linear density. Commitment actions use real 44px buttons, not `.commitment-actions` micro-pills. |
| **Exam Prep** (only if it exists) | Title in a circular/capsule glass bubble. Day cards radius 16, today = hairline accent. Primary **Let’s test** at bottom; **Redo this plan** secondary. |
| **Study** | Quiet iOS chrome. Prompt 17px / 45–70ch on **opaque** `--surface-2`. Mode switch = icon rail or segmented, not a native `<select>` if you can avoid it. Feedback = grouped list of right/wrong, never confetti. `.now-playing` while attempting (course color bar 3px, title, elapsed 12px mono, pause/stop circular; stop = destructive-ghost). |
| **Calendar** (only if it exists) | iOS month: 7 columns, selected = accent **circle**, events = 3px course pip + 13px title. Commitment = glass card + primary **Add to calendar**. Suggestions = grouped list. |
| **Settings** | iOS inset grouped lists. Theme picker = four 44×44 glass swatches. Connectors = rows with a green switch when connected (`#34C759` / Paper `#1F7A4D` — state only). Unify type onto the §6.2 scale. |
| **Sources** (until round-1 moves it) | Grouped list / cards, not a marketing grid. |
| **Command palette** | Brief §7.3a / §3.6. Kill “Jump to”. Large query, object rows, Raycast keys unchanged. Thinking capsule at the bottom for slow/empty-loading states. **No microphone.** |

Empty states: one still object, one line, one button. Skeletons: 8px bars at 12% white, pulse 0.6↔1 over 1200ms, **no shimmer**.

### Phase 5 — one Study concept-motion primitive

Pick **one** idea from brief §10 (recommend **letter-flip** for a newly introduced term, or **path-draw** for a diagram). CSS/SVG only. At most one living diagram per item. Reduced-motion = final frame, no loop.

Never put Brik motion on: tab bar, settings rows, calendar cells, primary buttons, success/fail.

A small squircle mark (cobalt or cream, **not lime**) may sit in empty states. It does not celebrate.

Existing tests in `StudyView.test.tsx` / `StudyView.realcore.test.tsx` / `FirstRun.test.tsx` must still pass. Update selectors; do not drop coverage; do not change IPC or reducer behavior.

### Phase 6 — rewrite the craft docs

Only after the tile and the app share tokens:

1. `design-system/productname/MASTER.md` — Spatial Instrument for the **workspace**; parked dock keeps the sticky-note geometry. Glass **allowed on chrome**; still forbidden on 17px study prose. Dual density table. Four themes. Anti-examples from brief §12. Kill “never a normal app window” for student-beta (D-11). Kill Forest mint. Kill 8px default control radius.
2. `.cursor/rules/ui-craft.mdc` — same. Point at the brief + MASTER. Workspace is a real window; Peek is still not a dashboard.

### Phase 7 — parked dock

Only if the new `:root` tokens make Peek look broken (wrong type size, mint accent leaking, transparent flash). Minimal `.dock` overrides. Do not redesign Peek.

---

## 8. Four themes (every component, or it is not done)

| Theme | `--bg` | Glass | Accent |
|---|---|---|---|
| **Paper** | `#ECE4D5` | White 62–78% | `#2F5BD8` |
| **Night** | `#1C1C1E` | White-alpha | `#6B8CFF` |
| **Forest** | `#121A16` | Green-white 8% | cream `#E8D9C4` or copper `#C4A574` |
| **High contrast** | `#0E0E10` | None | `#FFD60A` |

If glass fails contrast on a wallpaper, fall back to `--surface-2`. Course colors stay categorical (6–8, CVD-safe, 18% fill in tags); they are not a fifth theme. Lime `#C6FF00` is an anti-accent.

---

## 9. Motion numbers

| Kind | Duration | Easing |
|---|---|---|
| Chrome (hover, tab, toggle) | 160–180ms | `ease-out` |
| Panel enter | 220ms | `cubic-bezier(0.16, 1, 0.3, 1)`, 8px up |
| Segmented thumb | 200ms | `ease-out` |
| Onboarding object / letter | 600–900ms | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Study concept loop | 1600–2400ms | linear or gentle in-out; **one** motion at a time |
| Reduced | 0.01ms / static frame | — |

Never bounce on chrome. Never shimmer. Honor `data-motion="reduced"` and `prefers-reduced-motion`. Window peek↔expand timing stays in `dock.rs` (180ms) — do not change the native animation.

---

## 10. Verification

| Check | Requirement |
|---|---|
| Tile | `docs/design/style-tile.html` renders four themes; screenshots in the build record. Contrast: body text vs effective surface ≥4.5:1 in Paper/Night/Forest; High contrast AAA intent. |
| Frontend | `cd app && npm run build && npm test`. Existing FirstRun / Study / PlanEvent tests pass. Add (or extend) tests that: primary button is not `disabled` styling-only; segmented 5/10 still changes minutes; theme data attributes still apply; reduced-motion class/data freezes the letter-flip to a static node; now-playing is in the tree during attempt. |
| Visual | Screenshots of workspace nav, Study offer, Study attempt (now-playing), Settings grouped list, FirstRun screen 1 — Paper **and** Night, plus Forest swatch proof (no mint) and High contrast (no blur). Compact width (<900) tab bar. Desktop sidebar. |
| Native (if time) | `scripts/native-mirror.sh` launch against a synthetic profile; confirm `--bg` paints (no Settings white flash) in all four themes. |
| A11y | Keyboard through sidebar/tab bar; 44px hits; focus ring on every control; no `outline: none` on buttons/inputs. |
| Hygiene | `git diff --check`; no webfont piracy; no new runtime deps; no `.env` / `browser/.auth/`. |
| **§12 audit** | Fill `docs/build/spatial-instrument/<candidate>/AUDIT.md` using brief §12.G. One row per surface. **Fail and restyle** any screen with ≥4 ticks in 12.A, the instant-death combo, a 12.C cluster (3+), or a blocking 12.E item. A pretty screenshot with four AI tells is a failed build. |
| Non-goals | Do not require Python/relay/browser-sync changes. If you did not touch those trees, do not “fix CI” there. |

If browser MCP / a running Vite server is available, click the real controls (theme switch, 5/10 segmented, start a fixture item, open Settings). A single screenshot is not verification.

---

## 11. Build record

Per candidate, under `docs/build/spatial-instrument/<candidate>/`:

- `STATUS.md` — done / not done / how to open the tile / how to run the app / blockers.
- `AUDIT.md` — brief §12.G table. No empty “looks good.”
- `DECISIONS.md` — sidebar vs tab-bar breakpoint, Forest accent cream vs copper, which §10 primitive, wordmark vs squircle, anything the brief left open.
- `screens/` — tile + app, as in §10.
- Commits small and by surface: `tile` / `tokens` / `components` / `nav` / `study-chrome` / `onboarding` / `craft-docs`.

Do not commit Jacob’s unrelated dirty files from the iCloud checkout.

---

## 12. Comparison (only if candidates E and F both finish)

Produce `docs/build/spatial-instrument/COMPARISON.md`. Per subsystem (tile fidelity to §14, token accuracy vs §6, button/segmented anatomy, nav chrome, Study now-playing + motion, theme correctness especially Forest/Paper, reduced-motion, test honesty), pick with evidence (screenshots, computed styles, test counts) — not taste. Then integrate the adopted pieces onto `phase1-productname-pivot` in a third worktree, re-run §10, and write `docs/build/spatial-instrument/STATUS.md`. Both candidate branches stay intact.

---

## 13. Owner questions (proceed on the recommendation)

- **Q1 Tile pause:** this prompt’s default is tile + product in one run, because Jacob asked to build the brief into the program. Recommendation: keep going; he reviews from the tile and the app. If he says “tile only,” stop after Phase 0.
- **Q2 Tab set:** if round-1 has not landed, keep Study / Plan / Sources / Settings as destinations; only the chrome changes. Do not rename Plan → Calendar here.
- **Q3 Forest:** restyle, do not drop. Cream highlight on pine glass.
- **Q4 Wordmark:** squircle mark in the sidebar (32–36, cobalt or cream), “ProductName” as serif Large Title on FirstRun. No “PN”.

---

## 14. Agent operating rules (from the brief, binding)

1. If you cannot point at a crop sentence or a token in brief §6, you are guessing — stop and use the scale.
2. Do not average densities or radii.
3. Do not import Brik, GSAP club plugins, or Three.js.
4. Do not restyle Peek in the same pass unless tokens leaked.
5. Course color is categorical data, not a theme.
6. Reduced-motion is a ship gate, not polish.
7. Do not restore educator tools, hosted Azure, quiz-taking, or Canvas execute paths.
8. `ProductName` is still a placeholder. Do not invent a brand.

9. After restyle, run brief §12 as an audit. Four AI-slop ticks, instant-death combo, or vibecoded cluster = fail the surface and fix it. Do not ship and explain.

When you run out of time, the must-ship subset is **Phase 0–3 + paint `--bg` + Forest/Paper token fix + Study type scale / now-playing**. Everything else is STATUS.md “not done,” not silently skipped.
