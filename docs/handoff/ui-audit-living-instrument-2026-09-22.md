# UI/UX audit against Living Instrument (MASTER.md) — 2026-09-22

Scope: `app/src` (all views, tokens, chrome) and `landing/`, audited against
`design-system/productname/MASTER.md`. Live inspection at `localhost:1422`
(night + paper themes, 375px, keyboard). Outside Tauri every IPC returns empty,
so populated Home/Plan/Study were audited from source — there is no browser
fixture mode.

## Verdict

**The token layer passes MASTER. The composition layer fails the §20
five-second test on every screen.** `.workspace` is the forbidden default
stack: dark field → frosted 240px sidebar → `h1` + segmented header → stacked
rounded panels. Removing color or motion leaves a generic layout.

## Passes

- §04/§06/§09 tokens — `app/src/styles.css:3-104`: full ink/paper/signal set,
  role radii, motion verbs, one `--accent` per theme. No `transition: all`,
  no radial gradients, no shimmer, no Inter/Geist.
- §13 a11y — skip link, `role=tablist` + arrow keys, 44px buttons,
  `focus-visible` rings, `data-motion="reduced"` and `prefers-reduced-motion`
  honored, contrast theme strips blur (`spatial.css:14-22`).
- Study prose — panels `backdrop-filter: none`, 17px/1.45
  (`spatial.css:484-496`).
- Semester line (`spatial.css:1037-1068`) — the one authored object in the
  app: course-colored ticks, today rule, kind-shaped glyphs. It is buried
  third in the Home stack.

## Failures

### §02 Stage model — no screen has a subject

| Screen | Renders | Problem |
|---|---|---|
| Home | `h1 "Home"` → segmented → banner → course segmented → four `.glass` sections (`HomeView.tsx:165`) → semester line | Hero measure is the word *Home*; the only object is last; course map is a 4-up card stack |
| Plan | `h1 "Plan"` → banner → `.glass.work-week` → `Top3Sticky` (own `h1 "Today"`) → Commitment form inline | Two `h1`s (`PlanView.tsx:286`, `Top3Sticky.tsx:104`); Commitment form duplicated on Calendar |
| Study | header + `.panel` × N at `radius-outer` | Prompt is a card in a panel, not a page (§08) |
| Calendar | Commitment form → lone primary button → 35-cell `.month-grid` | Grid of equal cells dominates |
| Settings | "Canvas data" heading rendered twice (h2 + h1) | Duplicate heading bug |
| ExamPrep | `.exam-orb.glass` circle (`ExamPrepView.tsx:41`) | §12/§20 floating glass orb |

No screen meets the §20 "four of these" requirement. `.workspace-main` is a
centered `max-width: 920px` column (`styles.css:1439`) — no optical axis.

### §03 Material — glass is not "temporary chrome only"

`.glass` on persistent content: course-map sections, `work-week`, `prep-day`,
`exam-orb`, `sync-card`. Onboarding is one full-viewport glass sheet over a
flat field (`styles.css:631-637`). `.month-grid li` uses `surface-0` as a cell
background. No paper grain or ink texture exists; Paper theme is flat.

### §05 Typography — identity fonts are not in the app

`app/index.html:7` disables remote fonts (CSP `style-src 'self'`) and there is
no `@font-face`, so `--font-display` resolves to Iowan/Palatino, `--font-ui`
to system-ui. The landing page *does* load Source Serif 4 + Plex from Google
Fonts (`landing/index.html:10`) — app and landing render different faces.
`--type-display` (56–104px) is never used; every `h1` is ~34px. No index
language (`01 / 05`, `TODAY`, `NEXT`) anywhere.

### §06 Geometry — role system not applied

`.panel` uses `--radius-outer` (window radius) for a content cluster
(`styles.css:1524`). `.prep-day`, `.month-grid`, `.sync-card`, `.suggest`
hardcode `16px` (`spatial.css:1074-1108`); `.bubble` hardcodes `20px`.
43 hardcoded `ms` values bypass `--motion-*`.

### §07 Navigation

Active tab is a filled `surface-1` pill (`spatial.css:424`) — §07 wants
light/rule/glyph. No position rail. Icons reused (Home/Study share
`IconStudy`, Plan/Calendar share `IconPlan`, `App.tsx:15-21`). At 375px the
bottom bar is correct but content is the desktop stack compressed (§17.6).

### §09 Motion — effects without state

- `LetterFlip` character animation on the objective label and outcome label
  (`StudyView.tsx:268, 746`) — banned on comprehension-critical copy (§05, §22).
- `.brand-echo` (`spatial.css:637`) — 12% offset duplicate of the wordmark;
  reads as a rendering glitch at 34px.
- `card-fly` / `cursor-click` run `infinite` on the Connect mark
  (`spatial.css:955-975`) — §12 decorative loop.
- `skeleton-pulse` defined twice (`styles.css:1046`, `spatial.css:790`).
- No §16 signal vocabulary (steady/travelling/pulse/lock), no "commit" on
  completion, no "calibrate" on Study entry.

### Landing

Two 4-up `card-icon` + title + description grids (`landing/index.html:86-110,
142-166`) with `repeat(auto-fit, …)` — §20 "card cemetery". Hero is the
"template hero".

### Product-rule conflicts

- `readBriefStreak`/`streakLine` (`PlanView.tsx:183`) — allowed as brief-day
  continuity, but the name will keep tripping §12 review. Rename to
  `continuityLine`.
- `Onboarding.tsx` (554 lines) still mounted from Settings "Open preferences"
  (`SettingsView.tsx:146`) as a second onboarding composition.

## Plan, in MASTER §14 order

1. Self-host Source Serif 4 / IBM Plex Sans / IBM Plex Mono under
   `app/public/fonts` with `@font-face` (CSP allows `'self'`).
2. Rebuild Home from the semester line: paper field, line at display scale
   bleeding past the column, vertical mono index rail of the next 3 ticks
   (replaces `Top3Sticky`), cobalt today-rule. Delete the course-map 4-up;
   move Start/Learn/Do/Check into the tick popup.
3. Plan = one subject. Commitment form moves to a sheet; remove it from
   Calendar.
4. Study as a page: drop `.panel` around the prompt, 60ch column, one
   tape-position progress mark, margin feedback. Remove `LetterFlip` from
   labels.
5. Retire `.glass` on content — keep only nav, palette, now-playing, sheets.
6. Sidebar active state → 2px left rule + accent glyph; unique icon per tab.
7. Replace `exam-orb` with display-serif title over paper and a dated ledger
   of prep days.
8. Landing: convert both card grids to a numbered vertical ledger.

Per §23, produce the composition / typography / material / responsive studies
before the coded rebuild.
