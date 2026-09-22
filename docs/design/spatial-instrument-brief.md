# ProductName visual language — Spatial Instrument

> **Superseded on visual direction (2026-09-21).** [`design-system/productname/MASTER.md`](../../design-system/productname/MASTER.md) — *Living Instrument* — is now the source of truth for tokens, material, type, geometry, motion, and anti-patterns, and wins over this file and the style tile wherever they conflict. Keep using this brief for product behavior, screen anatomy, and the owner reference crops.

**Status:** owner-sourced brief, 2026-09-18. Landed as Spatial Instrument in commit `be0eb3c`, then re-tokened to Living Instrument on 2026-09-21.

**Build prompt:** [`docs/handoff/spatial-instrument-build-prompt.md`](../handoff/spatial-instrument-build-prompt.md) — execute that file to put this brief into the Tauri workspace (style tile first, then tokens/chrome).

**How an agent should use this file:** this is the look-alike spec. Read it before touching `app/src/**/*.{tsx,css}`, `design-system/productname/MASTER.md`, or `.cursor/rules/ui-craft.mdc`. Copy the *named* thing in each crop/app, not the whole screenshot. If a later instruction says “make it clean / modern / minimal / cozy,” ignore those words and use the numbers in §6.

**Product this has to fit:** a Mac-first student study workspace (Tauri + React) that prepares for exams. Home is a semester number-line. Study is a 5–10 minute session. Calendar and Settings are supporting. The old ambient dock still exists as parked chrome; the student-beta workspace is the surface this brief is for. Product boundaries in `CLAUDE.md` / `AGENTS.md` are unchanged (no streaks, no leaderboards, Canvas writes stay preview-only, reduced-motion is mandatory).

**What this brief replaces in spirit:** `design-system/productname/MASTER.md` still forbids *marketing* glassmorphism (purple packs, glow orbs, Liquid Glass on paragraph text). It does **not** win against the owner references below. The new direction is **visionOS spatial glass for chrome + iOS HIG density for controls + Gleb Kuznetsov sequencing for search/palette + Solare/Nexusmag/Brik kinetic type only inside learning**. After Jacob signs the style tile, MASTER and `ui-craft.mdc` get rewritten to match this file.

---

## 0. How to read references (locked pipeline)

Do not ingest a whole-app screenshot as “make it look like this.” That is how agents copy the wrong three things.

1. **Crops + one sentence.** Each image in `docs/design/references/` is annotated in §2. Copy only the named detail.
2. **Named apps, named steal.** §1. “Things 3 warmth” is a steal. “Looks like Apple” is not.
3. **Anti-examples are sharper than likes.** §12–13 beat any adjective.
4. **Numbers over words.** §6. If a token is not listed, pick from the scale — do not invent a fifth radius.
5. **Style tile before product restyle.** §14. Buttons in all states, a bubble, a card, an input, a tag, type, in all four themes. Jacob says warmer / rounder / less shadow / wrong font. Two or three rounds, then code.

---

## 1. Steal-from list (named)

Format: **source → steal this, leave that.** More information than three paragraphs of adjectives.

| Source | Steal | Leave behind |
|---|---|---|
| **visionOS / Apple Spatial UI Kit** (`01`, `05`) | Frosted panels; inner 1px specular highlight; almost-invisible shadow; capsule segmented controls; circular icon clusters; now-playing card; list rows with a hairline, not a card-per-row; Continue as a capsule on glass | Full refractive “Liquid Glass” on body copy; floating panels that ignore a layout grid; Apple logo; SF Pro as a webfont (use our faces, SF metrics) |
| **iOS / iPadOS wireframe** (`02`) | Shared gutters; card grid with equal gap; tab bar vs sidebar as a *decision*, not both; nested containers; content that aligns across columns | The blue instructional color; placeholder squares as UI; designing without a grid |
| **iOS dark kit** (`03`) | Large Title → grouped inset list; context menu stacking; 7-column calendar; filled circular selected-day; destructive red vs default blue vs cancel ghost; color as a *control* (swatches), not decoration | Spectrum rainbow as chrome; stacking every settings row as a unique card; all-caps list labels |
| **iOS Control Center / dark components** (`04`) | Capsule search (36–44px tall); capsule toolbars; primary = saturated fill, secondary = glass, destructive = red fill; green switches; continuous sliders with circular thumbs; media card with artwork + transport | Making every button a pill; neon green as a brand accent; icon soup; notification banners as the main IA |
| **Casa di Solare** ([casadisolare.com](https://casadisolare.com/)) | Warm paper `#ECE4D5` + chocolate `#563E3B` + ochre sun; pill nav (circle + serif wordmark); letter-by-letter `rotateX` reveal; one big object on screen; “scroll to discover” as onboarding grammar; paper grain at 4–8% opacity | Licensing Solare the font (do not hotlink or pirate); WebGL as app chrome; scroll-jacking the workspace; cream/terracotta as the *only* theme |
| **Nexusmag** ([nexusmag.eu](https://www.nexusmag.eu/)) | Overlapping staggered wordmark; floating capsule category tags; sticker-offset logo; button trio (text / outline / filled); high-contrast black on white for Paper; kinetic home that is *still a grid* | Acid lime as the product accent; all-caps HUD section labels; cookie-wall energy; overlapping chaos on data (timeline, grades, study prompt) |
| **Brik** ([brik.space/showcase-video](https://brik.space/showcase-video)) | For **Study only**: kinetic type, text-on-path, layer-depth, bounce-line, rotating type as *concept explainers*; motion that teaches a structure (orbit, stack, morph) | Brik as a dependency; WebGL/3D in chrome; chaotic type on buttons/nav; motion that celebrates a score |
| **Fractiona** ([Dribbble 27655966](https://dribbble.com/shots/27655966-Fractiona-Fractional-Investing-Mobile-App)) | One hero visual per object (course / exam); progress as a bar or ring, not a paragraph; layered data (title, weight, due, status) on a quiet field; trust through photography-scale imagery and sparse type | Luxury purple; fintech token-price chrome; treating homework like a marketplace card grid |
| **Raktor drone dashboard** ([Dribbble 26864675](https://dribbble.com/shots/26864675-Raktor-Drone-Mission-Web-Dashboard)) | Home as mission control: one shared time axis, tracks (courses), ticks (items), a detail inspector on hover/click; scan for what changed, don’t read a dashboard | Militaristic HUD, cyan grid, corner brackets, radar sweep, threat-red alarms, operator cockpits |
| **Gleb Kuznetsov — Natural search / voice** ([Dribbble 26722789](https://dribbble.com/shots/26722789-Voice-interaction-for-Natural-search-UI-by-Gleb-Kuznetsov), crops `06a` / `06b`) | Command palette and AI-help: vast empty field; query as large type; results as **real objects** (cards, rows), not a chat transcript; listening/thinking as a **bottom glass capsule** that shares the screen with results instead of covering them; tiny iridescent mark (not a Siri orb); “tap anywhere to type”; Paper warmth (taupe / gold / charcoal, not purple AI) | Always-on microphone; speech recognition this round; ChatGPT bubble stack; full-screen waveform; rainbow as a brand accent; rotating every heading; replacing Home’s semester line with an empty greeting; building a generative OS that invents screens |
| **Existing ProductName (keep)** | Source Serif 4 display + IBM Plex Sans UI + IBM Plex Mono numbers; ink cobalt as the *one* chrome accent; sentence-case titles; thin SVG icons; reduced-motion; blur not on paragraph text | 8px-radius monoculture on controls; 13.5px body everywhere; Forest mint HUD; true-black High Contrast; “PN” lettermark as branding |

Named mental-model mix, in one line:

> **visionOS glass and capsule chrome, iOS control weight, Linear density on the semester line, Solare warmth on Paper, Raktor for Home, Gleb Kuznetsov sequencing for search/palette (query + objects + a quiet listening capsule), Brik/Solare type motion inside Study, nothing from Duolingo, nothing from ChatGPT, nothing from generic SaaS dashboards, nothing from purple glassmorphism packs.**

---

## 2. Crops — finger on the detail

Whole-kit screenshots are in `docs/design/references/`. Copy the sentence, not the collage.

### 2.1 Spatial UI Kit — `01-spatial-ui-kit.png`

| Crop (what to look at) | Copy this |
|---|---|
| Permission dialog | Glass fill ~55–70% opaque over the scene; **radius ~22–26px**; title 15–17px medium; body 13px; **OK = filled capsule**, Don’t Allow = text-only. Shadow is a large blur at ~16–24% black, almost invisible. |
| Continue capsule (right of center) | Height ~36–40px, **full pill**, pale fill slightly lighter than the panel, 13–15px semibold, no border (or 0.5px white 20%). |
| Wi-Fi / VPN list | Rows, not cards. 44px min height. Accent **dot + label**, disclosure chevron, hairline between rows inset ~16px. Selected row = light fill, not a new card. |
| Circular icon cluster (wifi / airplane / bluetooth) | 36–44px circles, 1–2px optical icon, **same fill as the panel** (not a saturated brand color). On-state = white/light fill + colored glyph, not a glow. |
| Transport bar (pause / skip) | Capsule group, icons optically centered, **no labels**. Padding inside ~10–12px. |
| Toggle (green) | Track ~51×31, thumb 27, on-fill **iOS green `#34C759`** for *state only* — never as the product accent. |

### 2.2 iOS / iPadOS wireframe — `02-ios-ipados-wireframe.png`

| Crop | Copy this |
|---|---|
| Shared left/right margin | 16px phone, 20–24px pad. Not 28px clamp-then-hope. |
| Card grid | Equal gap **12px phone / 16px pad**. Cards share one radius (`--radius-card` 16). No random 8 and 24 in the same grid. |
| Nested frame | A screen is a **frame containing frames**. Tab bar is outside the scroll. Sidebar is a column, not a floating pile. |
| Alignment across rows | Ticks, titles, and chevrons share a vertical rhythm. If Home is a number-line, every course row is the same height recipe. |

### 2.3 iOS dark kit — `03-ios-dark-kit.png`

| Crop | Copy this |
|---|---|
| Large Title | 34px, weight **700**, tracking tight (−0.4 to −0.8px), flush left, 8px above the first grouped list. Serif allowed here for ProductName; SF metrics otherwise. |
| Grouped list | Inset 12–16px from screen; **radius 12** on the *group*, 0 on inner rows; 0.5px separators; row height 44. Background of group is one step up from window (`--surface-grouped`). |
| Calendar selected day | **Filled circle** in accent, white numeral, not a rounded-rect highlight behind the whole cell. |
| Destructive vs default | Delete = `#FF453A` fill or label. Continue = accent fill. Cancel = no fill, 17px. Never outline-all-three. |
| Context menu | One frosted panel, 14px radius, 13px rows, separators, no icons unless they carry meaning. |

### 2.4 Control Center kit — `04-control-center-dark.png`

| Crop | Copy this |
|---|---|
| Search field | Full pill, 36–44px tall, leading magnifying-glass 16px, placeholder 17px muted, **no 1px hard border** — fill is glass. |
| Capsule toolbar (Style / Text / Arrange) | Height 36, inner padding 12–14, icon 16 + 6px + label 13 medium. Unselected = glass, selected = slightly lighter glass, not accent-filled unless it is the one primary. |
| Delete / Continue / Copy / Cancel row | **One filled primary, one filled destructive, the rest ghost.** Radius 12–14, not 8 and not full-pill on these (pills are for toolbars/search/segmented). Vertical padding 12, horizontal 16. |
| Switches | Label left, switch right, 12px vertical padding. Green means on. |
| Sliders | Track 6px capsule, thumb 20–24 circle, fill = white or accent to the left of the thumb. |
| Now Playing | Artwork 48–120 rounded 12, title 15 semibold, subtitle 13 muted, transport 44px hit. This is the **Study-in-progress** card. |

### 2.5 visionOS spatial — `05-visionos-spatial.png`

| Crop | Copy this |
|---|---|
| Sidebar (Sandy Walker Chang) | Glass column, radius **24–28**, 12px inner padding, avatar 32–36, rows 36–40. On-state = brighter glass + accent glyph, not a cobalt slab. |
| Segmented `Years / Months / Days / All Photos` | **This is the Home range selector and Study 5/10 min control.** Capsule track; selected segment is a lighter inner capsule; 13px medium; height 32–36; gap 0 (segments share the track). |
| Message bubble | Radius **18–20**, padding 10×14, 15px body, name 13 semibold, meta 12 muted. Border = 0.5px white 18%. Shadow almost none. |
| Vertical icon rail | Circles 40–44, 8px gap, labels 11–12 under or none. Used for Study mode switch (recall / work / quiz) — icons first, words second. |
| Mini player | Same glass as sidebar, radius 20, artwork 16-radius, no drop shadow under the whole window — depth comes from background blur. |

### 2.6 Natural search / voice — `06a-natural-search-idle.png` / `06b-natural-search-listening.png`

Gleb’s own note on the shot: a generative interface and a spoken sequence can exist together **without competing for attention** — timing, hierarchy, intent. Intelligence needs space; the user still needs structure and calm. That is the steal. Observed 2026-09-18 from the 28s clip.

| Crop | Copy this |
|---|---|
| Idle home (`06a`) | Almost empty cream→gold field. Weather is a **tiny chip**, not a widget stack. Greeting is large, slightly rotated editorial type — **one** line of identity, then space. No tab bar, no search field. Bottom-left: 28–32px iridescent mark + 12px muted “Tap anywhere to type.” |
| Invite line | “Start your search by typing or speaking anything.” as **body-size type in the middle**, not a placeholder inside a box. A **quiet 12–16px dot** in the center is the listening affordance — not bars, not a pulsing mic. |
| Result objects (`06b`) | The spoken/typed query becomes a **large title** at the top. Hits are glass cards (radius 16, photo 12, title 15/600, caption 13 muted) and rows — the actual UI, not a transcript. A collapse chevron sits above the stack. |
| Listening capsule (`06b`, bottom) | Frosted **pill ~56px tall**, full width minus 16px. Left: 32px iridescent mark. Center: 13px muted “Listening …” (or “Thinking …”). Right: 36px circular keyboard/dismiss. A faint pearlescent sheen on the capsule only — **not** a rainbow wash on the page. Results stay visible **above** it. |
| Physical set (around the phone) | Honeycomb + glass slabs + warm gold / cool blue light. Steal the *material pairing* (glass UI sitting in a warm physical world) for Paper. Do not illustrate architecture inside the app. |
| Palette (from the shot) | `#383943` charcoal, `#5D5957` warm gray, `#BEB2AD` taupe, `#DCD9DF` lilac-gray, `#D5A563` gold, `#935734` bronze. Gold/taupe **warm Paper**, they are not a second chrome accent. Cobalt stays the interactive accent. |

---

## 3. Live-site motion (what to steal for which surface)

### 3.1 Casa di Solare — onboarding + Paper theme + concept reveal

Observed 2026-09-18: warm paper `rgb(236, 228, 213)`, ink `rgb(86, 62, 59)`, ochre sun, **pill nav** (`rounded-[2.5rem]` on small), circular ochre menu, serif wordmark, WebGL sun, letters in `.js-l` flipping on `rotateX(180deg)` then to 0 as you enter.

**Map to product**

- First-run Screen 1–2: one large object (sun → stylized Canvas window), pill header, almost no paragraph. The existing round-1 prompt already wants a CSS/SVG “Canvas window → cards fly out” loop; **time it like Solare** (slow, heavy, 600–900ms letter/object settle, not a 200ms UI ease).
- Paper theme background = Solare cream, not `#FAF8F3` cool-white. Ink is chocolate-gray, not `#1C1F26` iron.
- **Do not** scroll-jack Home/Study. Solare’s scroll theater is for first-run and for a concept card inside Study.

### 3.2 Nexusmag — first-run identity + tags

Observed: white field, black condensed wordmark repeated and faded (staggered echo), squircle logo with **acid-lime offset**, floating lime/black **capsule tags** overlapping the subtitle, cookie sheet using the button trio (text / outline / filled).

**Map to product**

- Onboarding wordmark can echo once (opacity 0.12 duplicate, 8–12px offset) then settle. One echo, not four.
- Course/mode tags = Nexusmag capsules (see `--radius-pill`), but in **course color at 18% fill + 100% label**, not acid lime.
- Lime (`#C6FF00`) is an anti-accent. Do not introduce it. Cobalt stays the chrome accent; course colors stay the categorical palette.

### 3.3 Brik — Study session only

Steal behaviors, not a toolkit: text on a path (orbit a definition around a diagram), layer depth (a process splits into stacked planes), bounce-line (a waveform that *is* the concept), rotating type (a word that becomes its opposite). Each practice item may have **one** living diagram. Reduced-motion: static final frame, no loop.

**Never** put Brik motion on: tab bar, settings rows, calendar cells, primary buttons, success/fail.

### 3.4 Fractiona — course / exam object

Hero image or color-field at top of the course/exam inspector (the glass popup on a tick). Progress toward the exam = one bar or ring. Numbers (weight, points, due) in mono, small. Title large. No sparkline decoration.

### 3.5 Raktor — Home

The semester number-line **is** the mission map. Courses = tracks. Ticks = units. Today = the playhead. Hover = telemetry inspector (glass bubble, immediate, no delay). Click exam = prep “mission plan.” Dim past ticks. Do not add a second dashboard of KPI cards above the line.

### 3.6 Gleb Kuznetsov — command palette, AI-help, future voice seam

**Map to product (visual now; speech later)**

- **Command palette** (existing `CommandPalette.tsx`, ⌥Space): Raycast *mechanics* (focus, Esc, arrows, Enter) + this *picture*. Query is large type at the top, not a 13px “Jump to” label. Hits render as the object they are (Study item, course row, Settings row) — glass cards/rows, not a flat action list with hints crammed right. Empty: “Tap anywhere to type” + the small mark, not “No matching actions.”
- **Listening / thinking capsule:** dock to the **bottom** of the palette or AI-help sheet. Same object for “Listening” (if voice ever ships) and “Thinking” (relay in flight). It must not cover the results. 200–400ms fade; the mark may breathe opacity 0.7↔1 over 1600ms. Reduced-motion: static “Thinking” label, no sheen animation.
- **Do not** build microphone permission, ASR, or a voice product in the spatial-instrument pass. Leave a trailing 44×44 circular affordance on the search pill as a **disabled/hidden seam** unless a later prompt authorizes capture.
- **Do not** turn Home into Gleb’s empty greeting. Home stays Raktor. The empty field is for palette / first-run / AI-help waiting.

---

## 4. North-star (one paragraph)

ProductName should feel like a **physical glass instrument sitting on a Mac desktop**, not a website and not a sticky-note mock. Chrome (window, nav, sheets, bubbles, segmented controls, now-playing study card) is visionOS material: translucent, large radius, hairline specular, almost no shadow. Structure (Home timeline, lists, calendar) is iOS + Raktor: a grid, grouped lists, one axis. Search and AI-help follow Gleb Kuznetsov: large query, results as objects, a quiet capsule for listening/thinking that does not cover the work. Learning (the 5–10 minute session) is the only place type and diagrams *move*, in the Solare/Brik sense — motion that explains, never motion that rewards. Paper is Solare-warm (cream, taupe, a little gold). Night is visionOS dark gray, not OLED black. One cobalt accent, used like iOS blue: focus, selected segment, the single primary CTA.

---

## 5. Dual density (do not average them)

| Zone | Density | Padding inside controls | Type |
|---|---|---|---|
| **Home timeline, ledger, calendar month** | Linear / Raktor — tight | 8px row padding, 4px tick gaps | 13px UI, 12px mono meta |
| **Buttons, bubbles, study card, onboarding** | iOS roomy | 12–14px vertical, 16–18px horizontal | 15–17px UI, 34px Large Title |
| **Study prompt / feedback prose** | Reading | 0 (it’s a column, 45–70ch) | 17px / 1.45 |

If you feel the urge to pick “one density for the whole app,” you are doing it wrong.

---

## 6. Numbers (tokens)

Adjectives banned in implementation: clean, modern, minimal, cozy, sleek, premium, glassmorphic, delightful.

### 6.1 Radius

| Token | px | Use |
|---|---|---|
| `--radius-window` | 20 | Workspace window / onboarding shell |
| `--radius-panel` | 24 | Sidebar, sheets, now-playing, exam popup |
| `--radius-card` | 16 | Course cards, day cards, grouped list container |
| `--radius-control` | 12 | Default / primary / destructive **buttons**, inputs, calendar cells |
| `--radius-row` | 10 | Inset list highlight |
| `--radius-pill` | 999 | Search, segmented track, tags, icon+label tool chips, onboarding header |
| `--radius-thumb` | 999 | Toggle thumbs, slider thumbs |
| `--radius-icon` | 999 | Circular icon buttons (36–44) |

**Forbidden:** 8px as the default control radius (current `--radius-inner: 8px`). 8 is allowed only for tiny glyphs/chips under 24px. **Forbidden:** 24px on every button (that is the panel, not the control).

### 6.2 Type

Keep the real files. Do not switch to Inter, Geist, Roboto, Arial, or SF Pro webfont.

| Role | Face | Size | Weight | Tracking | Line |
|---|---|---|---|---|---|
| Large Title | Source Serif 4 | 34px | 600 | −0.6px | 1.15 |
| Title 2 | Source Serif 4 | 22px | 600 | −0.3px | 1.2 |
| Headline (sheet) | IBM Plex Sans | 17px | 600 | 0 | 1.3 |
| Body | IBM Plex Sans | 15px chrome / **17px study prose** | 400 | 0 | 1.4 / 1.45 |
| Callout / row | IBM Plex Sans | 15px | 500 | 0 | 1.3 |
| Footnote | IBM Plex Sans | 13px | 400 | 0 | 1.35 |
| Caption | IBM Plex Sans | 12px | 400 | 0.1px | 1.3 |
| Mono meta | IBM Plex Mono | 12px | 500 | 0 | 1.3 |
| Tabular nums | IBM Plex Mono | same as context | 500 | 0 | — |

**Bold means 600** for UI chrome (buttons, selected tabs, row titles). **Bold means 700** only for Large Title if the serif looks thin at 600 — check on retina, do not default to 700 everywhere. Current primary button `font-weight: 600` is correct; do not jump to 700.

Sentence case everywhere in chrome. All-caps is allowed **only** on Nexusmag-style floating course tags, max 14px, tracking 0.4px, and only if the tag is a short code (PHYS, CSCI) — never on “Settings” / “Today” / section labels.

### 6.3 Color — how much

- **Chrome accent:** one. Ink cobalt. Night `#6B8CFF`, Paper `#2F5BD8` (keep; it is the iOS-blue role). Used for: focus ring, selected segmented, the single primary CTA, today-line, links.
- **State green:** `#34C759` (Night) / `#1F7A4D` (Paper) for toggles and “connected” only.
- **Destructive:** `#FF453A` / Paper `#B3261E`.
- **Course colors:** categorical, 6–8, CVD-safe. Fill at 18% in tags and ticks; full hue only on the tick itself. Never rainbow the window chrome.
- **No gradients** on buttons, nav, or panels. A 1px top specular (`linear-gradient(transparent-white-transparent)`) on glass panels is an *edge*, not a gradient fill.
- **No purple, pink, indigo, or mint as accent.** Forest theme may not use `#7fd1a0` as the window accent — restyle Forest to deep pine glass + gold/cream highlight, or drop Forest until the tile is approved.

### 6.4 Surfaces (Night default)

Not true black. visionOS / iOS dark gray.

| Token | Value | Role |
|---|---|---|
| `--bg` | `#1C1C1E` | Window, opaque fallback |
| `--surface-0` | `rgba(44, 44, 46, 0.52)` | Shell / sidebar glass |
| `--surface-1` | `rgba(58, 58, 60, 0.58)` | Raised panel |
| `--surface-2` | `rgba(28, 28, 30, 0.92)` | Grouped lists, study prose plane (must be opaque-enough) |
| `--surface-grouped` | `#2C2C2E` | iOS inset group |
| `--fg` | `#F5F5F7` | Primary text |
| `--muted` | `rgba(235, 235, 245, 0.60)` | Secondary (iOS label-2) |
| `--hairline` | `rgba(255,255,255,0.18)` | 0.5px equivalent (`1px` @ 0.5 scale or `box-shadow: 0 0 0 0.5px`) |
| `--specular` | `rgba(255,255,255,0.28)` | Top inner highlight |
| `--shadow` | `0 12px 40px rgba(0,0,0,0.18)` | Panels only; **almost invisible**. Not `0 10px 28px 0.32` (current dock — too heavy). |
| `--blur` | `24px` | `backdrop-filter: blur(24px) saturate(140%)` on glass chrome only |

**Paper**

| Token | Value |
|---|---|
| `--bg` | `#ECE4D5` (Solare cream) |
| `--surface-0` | `rgba(255, 252, 246, 0.62)` |
| `--surface-1` | `rgba(255, 252, 246, 0.78)` |
| `--surface-2` | `#FFFCF6` |
| `--fg` | `#563E3B` |
| `--muted` | `#7A6560` |
| `--hairline` | `rgba(86, 62, 59, 0.16)` |
| `--accent` | `#2F5BD8` |

**High contrast:** keep WCAG AAA intent, but background `#0E0E10` not `#000000`. Borders 2px. No blur. No 0.6 muted — muted must still pass 4.5:1.

**Blur budget:** at most **two** simultaneous `backdrop-filter` layers (window shell + one overlay). Lists, timeline, and study prose sit on `--surface-2` / `--surface-grouped` with **no blur**. Wallpaper must never wash 15px body text.

### 6.5 Spacing scale

`4, 8, 12, 16, 20, 24, 32, 40, 48`. Prefer 12/16/24 over the current 6/14/22 instrument scale for the **workspace**. Dock peek may keep 6/14/22 so the sticky-note does not suddenly look like Settings.

Hit target **44×44** minimum for every clickable in the workspace (ticks included — visual tick can be 4px wide, hit slop 12×44).

Window padding: 16 phone-width / 20–24 desktop. Section gap 24. Group gap 32.

### 6.6 Elevation

1. Background `--bg`
2. Grouped content `--surface-grouped` / `--surface-2` (no shadow)
3. Glass panel (sidebar, popup) — hairline + specular + `--shadow`
4. Overlay sheet — same as 3, plus 20% dim scrim behind
5. Menu / context — same glass, 4px extra translateY

No stacked drop-shadows. No glow.

### 6.7 Motion numbers

| Kind | Duration | Easing | Distance |
|---|---|---|---|
| Chrome (hover, tab, toggle) | 160–180ms | `ease-out` | — |
| Panel enter | 220ms | `cubic-bezier(0.16, 1, 0.3, 1)` | 8px up |
| Window peek↔expand | 180ms | eased resize (keep `dock.rs`) | — |
| Segmented thumb | 200ms | `ease-out` | slide |
| Onboarding object / letter | 600–900ms | `cubic-bezier(0.22, 1, 0.36, 1)` | rotateX or rise 16–24px |
| Study concept loop | 1600–2400ms loop | linear or gentle in-out | **one** motion at a time |
| Reduced | 0.01ms / static frame | — | 0 |

Never `transition-all`. Never bounce on chrome. Never shimmer. Honor `data-motion="reduced"` and `prefers-reduced-motion`.

---

## 7. Component anatomy (the things not named in the request)

A professional UI spec is mostly this section. Implement these as CSS classes / tokens, not one-off styles.

### 7.1 Buttons

Three visual families. Do not mix padding recipes.

**Primary (Continue, Sign in, Let’s test, Add)**  
- Height 44. Padding `12px 18px`. Radius `--radius-control` (12).  
- Fill = `--accent`. Label = `--on-accent`, 15px / 600.  
- No border. Hover: 6% lighter. Pressed: 8% darker + 1px translateY. Disabled: 40% opacity, no hover.  
- Loading: replace label with 16px spinner, **keep width** (min-width from label) so the layout does not jump.  
- One primary per view. If a second action is equally important, you designed wrong.

**Secondary / glass (Cancel, Skip, Redo plan)**  
- Height 44. Same padding. Radius 12.  
- Fill = `--surface-1` glass. Hairline `--hairline`. Label `--fg` 15/500.  
- Hover: fill +6% white. Not a new border color only (current `button:hover` is that — too weak).

**Destructive (Delete, Disconnect)**  
- Same geometry. Fill `#FF453A`, label white 15/600. Ghost-destructive (Don’t Allow) = no fill, red label.

**Ghost text**  
- No height lock. Padding `8px 12px`. Used in menus and “View terms”.

**Icon button**  
- 44×44 hit, 36×36 visual circle (`--radius-icon`). Glyph 18px, stroke 1.75. Optical center (play triangles shifted +1px right).

**Forbidden:** full-pill on form buttons (Save, Continue, Delete) sitting in a column — those are 12-radius. Pills are search / segmented / tags / tool chips. Current `.commitment-actions button { padding: 0.15rem 0.4rem; font-size: 0.72rem }` is below spec — kill it.

### 7.2 Segmented control

Track: height 36, radius pill, padding 2, glass fill.  
Thumb: inner capsule, height 32, lighter glass (Night) or white (Paper), **no accent fill** except when the segment *is* the primary filter and there are only two options (5 / 10 min may use accent thumb).  
Label 13px/500. Icon optional, 14px, 6px gap.

This replaces both the left text tab list *and* the undersized `.segmented` in Study.

### 7.3 Inputs

Height 44. Radius 12. Padding `12px 14px`. Glass or grouped fill, **not** `rgba(255,255,255,0.06)` on a transparent field. Placeholder `--muted`. Focus = 2px `--ring` offset 2, not a border-color-only change. Error = hairline destructive + 12px caption below.

Search is a **pill 44**, leading icon, no label. Trailing circular 44 may reserve a mic/keyboard swap (Gleb listening capsule’s right control) — **hidden or inert** until voice is a product decision.

Selects match inputs; custom chevron 12px; no native macOS popup if we can avoid it, but native is acceptable in Settings.

### 7.3a Command palette / natural search

The existing palette is Raycast *behavior* and currently looks like a website form (“Jump to”, 13px rows). Restyle:

- Panel: `--radius-panel` 24, glass `--surface-1`, max-width 560, padding 16. No “Jump to” HUD label.
- Query: 22px Source Serif 4 or 17px Plex 400, flush left, no box until the user types — then a hairline under the line, not a bordered input.
- Results: 44px rows **or** 16-radius object cards when the hit is a course/exam. Shortcut hint 12px mono muted, trailing.
- Empty: small mark 32px + 13px “Type to jump. Esc to close.”
- Footer hints (↑↓ ↵ esc) stay, 12px muted, not a status bar.
- **Thinking capsule** (relay / slow search): docked to the panel bottom, height 56, pill, mark 32 left, “Thinking …” 13 muted center. Results remain scrollable above. Same component as a future “Listening …” state.

This is chrome, so 180ms enter. It is **not** Study concept-motion.

### 7.4 Toggles, checks, sliders

- Switch: 51×31, thumb 27, 2px inset, 200ms. Green on.  
- Checkbox (Accept terms): 22×22, radius 6, filled accent + white check when on. The current “checkbox that does not visibly fill” is a named bug — this is the spec.  
- Slider: track 6× full, radius pill, thumb 22.

### 7.5 Tags / chips

Height 28. Padding `6px 12px`. Radius pill. Fill = course color @ 18%. Label 12/500 in course color (or `--fg` if contrast fails). Max one line. Used for kind (Homework / Quiz / Exam) and course code.

### 7.6 Message bubble / hover inspector

Radius 20. Padding 10×14. Glass `--surface-1`. Hairline. Almost no shadow. Immediate (0ms delay). Never clip off-window (flip / shift). Title 15/600, rows 13, Open in Canvas as a text button in accent.

### 7.7 Card

Radius 16. Padding 16. Grouped fill, **hairline, no drop shadow**. Image/hero 12 radius inside, 16:9 or 4:5. Title 17/600, meta 12 mono. Used for exam-prep days and syncing course cards. **Not** used for every list row.

### 7.8 Grouped list (Settings, context, Calendar suggestions)

Outer radius 12, overflow hidden, `--surface-grouped`. Rows 44. Separator 0.5px inset 16. Leading icon 22, trailing chevron 12 muted. Title 15/400, value 15 muted right-aligned.

### 7.9 Navigation

**Workspace chrome (student-beta):** not a 168px left rail of text buttons. Choose one and commit:

- **Desktop (≥900px):** visionOS glass sidebar 240px, circular app mark, rows 40px with 18px icon + 15px label. Active = lighter glass + accent icon, not a bordered rectangle.  
- **Compact:** iOS tab bar, 4 items (Home / Study / Calendar / Settings), 50px tall, 10px icon + 10px caption. Selected = accent.  

Do not ship both a left rail *and* a bottom bar. Current `.workspace { grid-template-columns: 168px 1fr }` + 15px serif h1 is a website.

**Range selector** on Home: visionOS `Years / Months / Days` segmented — map to `1 month / 2 months / 3 months / Full`.

### 7.10 Now-playing = Study-in-progress

When a session is live, a persistent glass card: course color bar 3px, title, elapsed 12px mono, pause/stop as circular icons. Stop is destructive-ghost. This is Control Center’s Now Playing, not a browser tab title.

### 7.11 Calendar

iOS month: 7 columns, 32–36 day cells, selected = accent circle. Events = course-color 3px leading pip + 13px title. Bottom of the Calendar tab, per the round-1 prompt. No Google-calendar restyle.

### 7.12 Timeline ticks (Home)

Visual width 4–8px, height from weight (floor 12 including hit, cap ~48). Radius 2. Past 40% opacity. Exam = taller + diamond or 2px ring. Hover = bubble §7.6. Keyboard: arrows between ticks, Enter opens.

### 7.13 Focus, selection, scroll

- Focus ring: 2px `--ring`, offset 2, radius inherited. Never `outline: none` without a replacement (current `.workspace-main:focus { outline: none }` is only OK on the landmark, not on controls).  
- Text selection: accent @ 30%.  
- Scrollbar: 8px, transparent track, `--muted` thumb 50%.  
- Skip link stays.

### 7.14 Icons

Stroke 1.75, 18–22px in chrome, 16 in rows. No emoji. No unicode `×` `⌥` as chrome (keep current rule). Optical alignment required for play/chevron.

### 7.15 Empty / error / skeleton

Empty: one illustration-or-object (Solare-scale, still), one line, one button. No three feature cards.  
Error: grouped list row or a glass banner, 13px, Retry secondary.  
Skeleton: 8px radius bars at 12% white, **no shimmer** if reduced-motion; even in auto, pulse opacity 0.6↔1 over 1200ms, no sliding highlight.

### 7.16 Overlays

Scrim `rgba(0,0,0,0.28)`. Sheet radius 24, max-width 480, padding 20. Title 17/600. Primary pinned at bottom safe 16. Escape and click-scrim dismiss unless it’s a blocking gate (Canvas sign-in).

### 7.17 Window / Tauri

Onboarding centered 460×640 (keep). Workspace is a real window, not a fake webpage: paint `--bg` on `html, body, #root, .workspace` so Settings cannot flash transparent (known bug). Drag region on the sidebar top / title, `no-drag` on controls. Vibrancy: native `NSVisualEffectView` under the shell if already wired; CSS blur is the fallback. Reduce Transparency → `--bg` opaque.

---

## 8. Four themes (must all pass the same components)

| Theme | Background | Glass | Accent | Feeling to steal |
|---|---|---|---|---|
| **Paper** | Solare cream `#ECE4D5` | White 62–78% | Cobalt `#2F5BD8` | Casa di Solare warmth, black/cream Nexusmag type |
| **Night** | `#1C1C1E` | White-alpha glass | `#6B8CFF` | visionOS + Control Center |
| **Forest** | `#121A16` | Green-white 8% glass | Cream `#E8D9C4` or copper `#C4A574` — **not mint** | Cabin instrument, still glass |
| **High contrast** | `#0E0E10` | None (opaque) | `#FFD60A` | Focusable, 2px borders, no blur |

Every component in §7 must exist in all four. If glass fails contrast on a wallpaper, fall back to `--surface-2`.

---

## 9. Surface map (what each screen is allowed to look like)

### 9.1 Onboarding

Solare grammar: one object, pill header, no paragraphs. Nexusmag echo on the wordmark once. Buttons stacked, **same width and height 44**, Accept = toggle that *fills*, Continue = primary disabled until Accept. Connect Canvas = rule-of-thirds + CSS/SVG animation (existing round-1 requirement) timed like Solare (slow). Syncing = Fractiona-like course cards appearing one by one in course color.

### 9.2 Home

Raktor + wireframe + visionOS segmented. One axis. No KPI row. Inspector is a glass bubble. Exam click → glass popup → View plan.

### 9.3 Exam prep

Header title in a **circular/capsule glass bubble** (already specified in round-1). Days = 16-radius cards, today = hairline accent. Primary at bottom: Let’s test. Secondary: Redo this plan.

### 9.4 Study

Chrome is quiet iOS. The **item** may use Brik/Solare motion. Prompt is 17px, 45–70ch, on an opaque plane. Mode switch = vertical icon rail or segmented, not a `<select>` if we can help it. Feedback is a grouped list of what was right/wrong, not a confetti canvas. Now-playing card while in session.

### 9.5 Calendar

iOS month at the bottom. Commitment rebuilt as a glass card + primary “Add to calendar”. Suggestions = grouped list with Add / Dismiss.

### 9.6 Settings

iOS inset grouped lists. Theme picker = four 44×44 glass swatches, not a mismatched type scale. Connectors = rows with a green switch when connected.

### 9.6a Command palette / AI-help

Gleb sequencing: large query, object results, thinking capsule at the bottom. Do not open a chat thread. Do not put the capsule over Home.

### 9.7 Parked dock

Do not restyle Peek as a dashboard. It may keep the sticky-note radii (18 outer / 14 sheet). Do not port 24px visionOS panels into the 320px peek.

---

## 10. Learning-session idea list (Brik × Solare × product rules)

Use at most **one** per item. Prefer CSS/SVG. No new runtime (no Brik embed, no Three.js unless a spike is approved). Reduced-motion = final frame.

| Idea | What moves | Use when |
|---|---|---|
| Letter flip | `rotateX` per glyph, 60ms stagger, 700ms settle | A term is introduced |
| Weight morph | Variable font-weight 400→600 on the keyword | Emphasis in a definition |
| Text on path | A short formula rides a circle around a diagram | Cycles, orbits, closed loops |
| Layer split | A stack of 2–3 planes easing 12px apart | Processes / “three parts of X” |
| Bounce-line | A 2px path that is the graph | Rates, waves, supply/demand |
| Path draw | SVG `stroke-dashoffset` 800ms | Diagrams, proofs outline |
| Object rise | One Solare-scale shape, 16px, 700ms | Mode start, not success |
| Tag drift | Capsule tags easing into a tray | Categorizing examples |
| Crossfade diagram | Two SVGs, 400ms opacity | Before/after, common mistake |

**Not on this list:** points popping, streak flames, mascot dancing on a correct answer, camera shake, particle bursts, scroll-hijack, looping WebGL backgrounds.

Moderate character: a small squircle / iridescent mark 28–32px (Nexusmag sticker + Gleb listening mark, **cobalt, cream, or a quiet pearlescent — not lime, not a rainbow wash**) may sit in empty states and on the thinking capsule. It does not celebrate.

---

## 11. Against the current repo (do this instead)

Concrete diffs. This is the anti-example that matters.

| Current (`app/src/styles.css` + `MASTER.md`) | This brief |
|---|---|
| `--radius-inner: 8px` on buttons/inputs | 12px controls; 8px only for <24px chips |
| `--radius-outer: 18px` dock | 20 window / 24 panel in workspace |
| Button padding `0.4rem 0.75rem` (~6×12) | 12×18, height 44 |
| Ghost padding `0.28rem 0.5rem`, 0.82rem type | Kill micro-buttons in the workspace |
| `font-size: 13.5px` on `:root` | 15 chrome / 17 study / 13 timeline meta |
| Primary = `--accent-deep` fill, hover to `--accent` | Primary = `--accent`, hover lighter; deep is pressed |
| Hover = border stronger + 7% white | Hover = fill shift; hairline stays |
| Dock shadow `0 10px 28px @ 0.32` | `0 12px 40px @ 0.18` or less |
| Blur `18px` on `.dock` only, content opaque | Blur 24 on **workspace chrome + overlays**; still opaque prose |
| Night surfaces `rgb(12,16,24)` navy-black | `#1C1C1E` iOS dark gray |
| Paper `#FAF8F3` / `#1C1F26` | Solare `#ECE4D5` / `#563E3B` |
| Forest accent `#7FD1A0` (mint HUD — already in MASTER’s forbid list, still shipping) | Recolor Forest; mint is an anti-example |
| Contrast `#000000` | `#0E0E10` + 2px borders |
| Left 168px text tabs, active = bordered `--surface-2` | Glass sidebar or tab bar; active = material, not a rectangle |
| Brand “PN” serif | Wordmark or squircle mark; no two-letter intern logo |
| `.workspace-main { max-width: 920px }` website column | Home timeline is full width minus sidebar; study prose may max 70ch |
| `body { background: transparent }` | Always paint `--bg` in workspace |
| Segmented already pill — good — but 0.3×0.8rem and accent-filled | Height 36 track; thumb material; accent optional |
| Command palette “Jump to” + 13px action list | Gleb: large query, object rows, thinking capsule at the bottom; Raycast keys unchanged |
| MASTER: “never full Liquid Glass” | Glass is **allowed on chrome**; still forbidden on 17px study prose |
| MASTER: irregular 14/22 spacing | Workspace uses 4-grid; dock may keep 14/22 |
| ui-craft: “never a normal app window” | Student-beta **is** a workspace window; dock stays parked. Do not force Home into a sticky note |

---

## 12. Anti-examples — fail the screen (harsh, locked)

This section is an **audit**, not taste. Walk every surface (tile, FirstRun, Home/Plan, Study offer/attempt/feedback, Calendar, Settings, palette). Tick what you see. **Four or more ticks in 12.A on one screen = it reads as AI-generated even if a human built it. Ship is forbidden until those ticks are gone.** The inconsistency cluster in 12.C is how vibecoded SaaS looks: unique palette, still amateur. ProductName already has opinions in §1–§7; if a screen does not match them, it is a fail even with zero purple.

Do not “fix” a fail by adding more glass, more motion, or a second accent. Remove the tell.

Sources distilled here: [Booplex Pixelslop](https://booplex.com/projects/pixelslop); [DEV — purple gradient problem](https://dev.to/james_anderson_h/the-purple-gradient-problem-why-ai-ui-all-looks-alike-and-how-to-fix-it-3j65); [Setproduct — why every AI startup looks the same](https://www.setproduct.com/blog/why-every-ai-startup-looks-the-same); [Sailop — 7 dimensions of generic design](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design); [21st.dev — not look AI generated](https://21st.dev/blog/website-not-look-ai-generated); [DesignPixil — vibecoded SaaS](https://designpixil.com/blog/why-your-saas-looks-vibecoded); [NN/g application mistakes](https://www.nngroup.com/articles/top-10-application-design-mistakes/), [placeholders](https://www.nngroup.com/articles/form-design-placeholders/), [flat clickability](https://www.nngroup.com/videos/flat-ui-elements-lack-clickability-clues-and-cause-confusion/); plus the owner list below. Extra tells from those sources are folded in and marked.

**Instant-death combo (any 3 of these together = fail without counting to four):** purple/indigo/cyan glow + Inter/Geist/Roboto-only + `rounded-2xl` on everything + 3 equal feature cards + sparkle/emoji icons + glass cards on a near-black radial + “Get started” / “Learn more” pair + gradient text on a number.

### 12.A Looks AI-generated / template — each tick is a fail item

- Purple-to-blue, indigo, fuchsia, or cyan **hero glow** with no brand reason. “Vibecode purple.” Near-black + radial aurora behind glass. Setproduct’s Linear/Vercel uniform: do not clone it.
- **Inter, Geist, or Roboto** as the only face from H1 to footer. Also banned as “tasteful defaults”: Instrument Serif, Fraunces, Playfair as the *only* display move (Unslop). We already chose Source Serif 4 + IBM Plex; shipping anything else is a fail.
- **Glass cards + backdrop-blur sitting on a near-black radial glow.** Glass is allowed on chrome (sidebar, sheet, bubble, palette). It is forbidden as a card-on-glow wallpaper, on list rows, and on 17px study prose.
- **Identical 16–24px radius** on buttons, cards, inputs, badges, and images. Use the §6.1 scale or you have no scale.
- **Hero → one-line subhead → three equal feature cards → centered CTA.** Also: six equal cards. Also: bento where every cell is the same size (hierarchy theater).
- **Emoji as icons** (✨ 🚀 🔒 ⚡ 🎯) instead of the SVG set. The four-point **sparkle as “AI lives here”** (Setproduct / Gemini glyph) is banned on Study, Settings, and the relay row.
- **Gradient text** on a big vanity metric, headline, or GPA-shaped number. `bg-clip-text` headlines are a tell.
- **Hairline gradient borders** that fade purple-to-transparent (Aceternity kit leftovers).
- **Nested cards inside cards** (“card all the way down”). A grouped list is not a card per row. A tick is not a card. A Settings row is not a card.
- **Default Tailwind / shadcn tokens left untouched:** `bg-blue-500`, `text-gray-400`, `rounded-2xl`, `shadow-sm`, `font-sans` Inter. If the computed style is still a Tailwind default, you did not implement this brief.
- **`transition-all duration-300`** on every hover (Sailop’s fingerprint). Animates layout properties that should not move. Ban `transition-all`. Ban 300ms as the only duration. Ban `ease-in-out` as the only easing.
- **Bounce, elastic, `hover:scale-105`, or spring on every hover** — cards, buttons, rows. Chrome hover is fill/opacity, 160–180ms `ease-out`, no scale.
- **Vague headlines** that could sell any product: “Build the future of work,” “Supercharge your studying,” “Unlock your potential,” “Seamless AI-powered workflow,” “Chat with your syllabus.”
- **Vague CTAs:** Get started, Learn more, Click here, Continue with no object. Name the action: Sign in to Canvas, Start 5 minutes, Open in Canvas, Add to calendar.
- **Three-tier pricing** with the middle plan highlighted because that is the template. We are not a pricing page. Do not invent one.
- **Stock or AI people**, fake “trusted by” logos, “Join 10,000 students,” John Doe / Acme University.
- **No real product surface** — numbers, due dates, course names, or the actual study prompt — anywhere on a screen that claims to be the app. 21st.dev: show the product or it is generic.
- Decorative **“Live” / “AI-powered” / “New” / “Beta”** badges that do not change a control. If the relay is on, say the quota or the provider in Settings, not a pill on every heading.
- **Perfect symmetry:** every section centered, every cell the same size, every card the same height. Break hierarchy on purpose (Home axis, one primary button, today taller than other days).
- Copy that **hedges and uplifts** instead of saying what the product does. No “your AI study companion.” The product prepares a student for a specific exam with a 5–10 minute session. Say that.
- **Canonical marketing skeleton** (Sailop structure): nav → hero → features → testimonials → pricing → FAQ → CTA → footer. This is an app. If you build that in `site/` later, it still cannot use 12.A tells.
- **Centered dual-CTA hero** (primary + ghost “Learn more”) floating in space.
- **`hover:scale` + glow shadow + gradient border** on the same card.
- **All-caps tracked HUD labels** (`TODAY`, `SETTINGS`, `OVERVIEW`) as section chrome.
- **Lorem / “Coming soon” / “100+ features”** as UI copy.
- **Chat-box as the home screen** (OpenAI costume). Palette is jump-to, not a therapist.
- **Aurora blobs, mesh gradients, particle fields, noise-on-black heroes.**

### 12.B Looks old / leftover from another era

- Heavy **skeuomorphism** with no job: leather, wood grain, glossy 3D bezels, stitched leather calendar. Solare paper grain at 4–8% on Paper is the one exception; it is not a texture pack on Night.
- **2013 long-shadow** icons.
- **Beveled Windows-era** buttons mixed with flat controls on the same screen.
- **System default fonts on some screens, custom on others.** Settings currently drifting off the workspace scale is this fail. One pairing everywhere.
- **Blue underlined links** next to unlabeled flat text that is also a link. Links look like links; buttons look like buttons (NN/g clickability).
- **Floppy-disk save**, printer, “home” house for Home if the label is already there — dead metaphors. Thin SVG, labeled.
- **Carousel as main navigation** (“click the dots to maybe find the page”).
- **Comic Sans, Papyrus, Impact, unlicensed display fonts, pirate Solare** as UI type.
- **Drop shadows under every box** until the page is stacked paper. Cards = hairline. One faint shadow on floating glass only.
- **Rainbow Web 2.0 gradients** and a 1px inset highlight on every widget. Specular is **one** 1px top edge on glass panels, not a bevel kit.
- **Pixel-art custom icons** that match nothing else.
- A “redesign” that **only swaps sidebar icons** and calls it modern while the workflow is still a 168px text rail and 8px micro-buttons. That is this repo today. Fail it.

### 12.C Looks sloppy / unprofessional — inconsistency cluster

If you can tick **this cluster** (even with a unique palette), it reads as vibecoded (DesignPixil): assembled, not designed.

- Spacing that **jumps 8 / 12 / 16 / 24 / 32 with a fifth invented gap** per screen. Workspace uses the §6.5 scale. Do not invent 9px, 11px, 13px, 18px, 26px. (Sailop’s “break the 8-grid to look human” is **not** permission to randomize. Dock may keep 14/22. Workspace does not get a third scale.)
- **Six button styles** that are all “kind of primary.” There is one primary per view. Map every control to §7.1.
- **Random shadow, radius, and border recipes per screen.**
- **Mixed icon families** in one toolbar: outlined + filled + emoji + custom pixel.
- **Alignment that almost lines up** (optical leftover from copy-paste).
- **Uneven type scale:** 13px here, 15px there, every heading `font-weight: 700`. Bold is 600 in chrome; 700 only if Large Title needs it.
- **Line-height stuck at 1.5 everywhere** — headlines loose, body cramped. Use §6.2.
- **Gray on gray** that fails 4.5:1. CTAs you have to squint for (Pixelslop’s 2.3:1 button). Muted text still has to work. Disabled is opacity, not `#999` on `#ccc`.
- **Color as wallpaper:** every chip a different hue. Course color is categorical at 18% fill. Chrome accent is one cobalt. Green is toggle-on only.
- **Read-only text boxed like an input** (looks editable).
- **Text that looks like a label but is a button**, or the reverse. Flat UI with no signifier (NN/g).
- Layout driven by **what the API returned**, not what the student needs (DesignPixil). Home is the axis, not a dump of JSON keys.
- **Twelve equal-weight dashboard metrics**; none of them is the answer. We are not a KPI wall. Do not add one.
- Empty state: **white box + generic SVG + “No data yet.”** Empty is: one still object, one true sentence, one button that starts the job.
- **Loading, error, and success treated as afterthoughts** or missing. Skeleton is pulse, not shimmer. Error names the next step. Success is quiet (grouped result), not confetti.
- **Feature-by-feature screens** that never joined a type/spacing/color system. If Settings and Study do not share tokens, fail both.

### 12.D Boring / no point of view

- **Sidebar + top bar + card grid on every surface**, including ones that are not dashboards. Study is a session. Home is a timeline. Palette is Gleb empty-field + objects. Settings is grouped lists. If they all look like a SaaS admin, you ignored §9.
- **Bento of equal cells.**
- Motion that is **only fade/slide-in on scroll**, never tied to state (selected segment, thinking capsule, letter-flip on a new term).
- **Zero personality in microcopy**; everything sounds like a spec or a landing page. Sentence-case. Named actions. No “Let’s get you set up on your journey.”
- **Stock illustrations** that could be any SaaS in any industry (undraw, blob people, floating 3D checkmarks).
- **No density control:** either a sparse marketing page or an Excel dump. Dual density in §5 is mandatory.
- **Everything equally important**, so nothing is worth doing first. One primary. Today is louder than last month. The live study card beats the nav.
- **Chrome and decoration louder than the work surface.** If the sidebar sparkles harder than the exam tick, fail.
- **Same dashboard layout reused for every task.**

### 12.E Not user-friendly — NN/g and the rest (each tick is a fail)

- Nav organized by **org chart or database tables** instead of student jobs (study, see the semester, calendar, settings).
- Nav that **never deletes items**; sidebar is a museum of every ship. Sources-as-a-tab after round-1 said kill it is this fail if you re-add it for nostalgia.
- **Inconsistent nav:** you relearn wayfinding on every screen. One pattern: glass sidebar ≥900 or tab bar <900, not both, not a third rail on Study.
- **Deep hamburger / junk-drawer** (“More…”, “Tools…”, overflow that hides Sign in). NN/g junk-drawer menus.
- **Mystery-meat icons** with no labels. Sidebar rows are icon + 15px label. Icon-only is allowed only where the brief already specified (transport, circular 44).
- **Tiny hit targets** packed too close. 44×44. Ticks get 12×44 slop. Miss-clicks mean the UI is broken, not the user.
- **Hover-only actions** that vanish on touch and keyboard. Every action has a focusable control.
- **Placeholder-as-label** in forms (NN/g: disappears, low contrast, extra memory). Labels stay outside the field. Placeholder is an example, never the only name.
- **No defaults;** every form starts blank when the answer is obvious (5 vs 10 minutes, school already chosen, today as range start).
- Errors as **“Something went wrong”** with no next step. Name the failure (login window closed, no session, network) and offer Retry / Sign in again.
- Field errors **only in a toast that auto-dismisses**. Error stays on the field.
- **Modal / confirm fatigue**; destructive sitting next to Save / OK with equal weight (NN/g). Destructive is red and separated.
- **Weak or missing feedback after click** (did it work?). Buttons that do not change, no now-playing, no thinking capsule, no disabled-while-in-flight.
- Animation that **ignores `prefers-reduced-motion`** and **blocks the next action**. Reduced-motion is a ship gate. No wait-for-animation to click Continue.
- **“Intuitive” as a slogan** instead of: find the next step, recover from errors, finish the task.
- **Reset / Clear** on forms that can destroy work (NN/g).
- **Dropdown for 2–3 options** that should be segmented or radios (session length already wants segmented).
- **Icon that repeats the row type** in a list of only that type (clutter, not search).
- **Stale data with no “updated”** on anything that looks live.
- **Confirm dialog for a non-destructive action**; no confirm for a destructive one.

### 12.F ProductName-specific bans (in addition to CLAUDE.md)

- No Duolingo: streaks, XP, guilt mascot, celebration on a right answer, losable state, leaderboards, “exam-ready %.”
- No ChatGPT costume: transcript as the main IA; voice overlay that hides results.
- No Siri-orb / EQ-bar / full-screen waveform. Gleb mark is 28–32px, docked.
- No microphone / ASR this round.
- No Canvas submit/comment/discussion execute path.
- No auto-adding calendar events.
- No Forest mint `#7fd1a0` / `#5fd6ae` as accent.
- No acid lime `#C6FF00` as accent.
- No “PN” lettermark.
- No pirate Solare files.
- No Brik/GSAP-club/Three.js in chrome.

### 12.G How to write the audit

In the build record, one table per surface:

| Screen | 12.A ticks | 12.C cluster? | 12.E ticks | Verdict |
|---|---|---|---|---|
| … | list or none | yes/no | list or none | **ship / fail** |

Fail if: ≥4 of 12.A, **or** instant-death combo, **or** 12.C cluster (3+ inconsistency ticks), **or** any 12.E that blocks finishing the student job (mystery icon, <44 hit, placeholder-as-label, hover-only, “Something went wrong”, reduced-motion ignored).

Do not argue that glass is “on-brand” if it is glass-on-glow. Do not argue that Inter is “close to Plex.” Do not ship a marketing skeleton inside the Tauri window.

---

## 13. Agent operating rules

1. If you cannot point at a crop sentence or a token in §6, you are guessing — stop and use the scale.
2. Build the **style tile** (§14) before restyling `StudyView` / `App.tsx`. Jacob reacts. Then MASTER + `ui-craft.mdc` update. Then product CSS.
3. Do not “average” visionOS and the current dock into 11px radius and 10.5px type.
4. Do not import Brik, GSAP club plugins, or Three.js for chrome.
5. Do not restyle the parked Peek dock in the same pass as the workspace unless Jacob asks.
6. Reduced-motion is a ship gate, not a polish item.
7. Course color is categorical data, not a theme.
8. When round-1 / student-beta functional requirements conflict with this file on **layout structure** (e.g. Home number-line, mandatory Canvas, tab names), **function wins**. When they conflict on **radius/shadow/type**, **this file wins**.
9. **§12 is a ship gate.** After restyle, fill the §12.G table. Four 12.A ticks, the instant-death combo, a 12.C cluster, or a blocking 12.E item = fail the surface and fix it. Do not ship and narrate. Adjectives are not a defense.

---

## 14. Style tile (next artifact — show, don’t tell)

One HTML page, four theme roots, no app logic. Jacob reacts with “warmer / rounder / less shadow / that font is wrong.”

Must include, in every theme:

- Primary / secondary / destructive / ghost / icon / disabled / loading buttons  
- Segmented (4 items, one selected)  
- Search pill  
- Input default / focus / error  
- Toggle on/off  
- Tag row  
- Grouped list (3 rows)  
- Message bubble  
- Now-playing card  
- Timeline tick row (3 ticks, one hovered bubble)  
- Large Title + body + mono caption  
- One Solare letter-flip sample and its reduced-motion static frame  
- Listening/thinking capsule (Gleb): mark 32 + “Thinking …” + circular dismiss, results card peeking above it  

Path (when built): `docs/design/style-tile.html`. Do not wire it into the Tauri app.

---

## 15. Implementation order (after the tile is signed)

1. Tokens in `styles.css` (`:root` + four themes). Paint `--bg` on the workspace.
2. Buttons, inputs, segmented, tags — global, because everything is currently 8px/13.5px.
3. Navigation chrome (sidebar or tab bar).
4. Command palette (`CommandPalette.tsx`) to §7.3a — Raycast keys, Gleb picture. Thinking capsule for slow paths; no microphone.
5. Home timeline + inspector bubble.
6. Study now-playing + type scale; then one concept-motion primitive.
7. Onboarding Solare timing.
8. Rewrite `MASTER.md` + `ui-craft.mdc` so they no longer contradict this file.
9. Parked dock: only if it looks broken next to the new tokens.

---

## 16. Reference index

Local crops:

- `docs/design/references/01-spatial-ui-kit.png`
- `docs/design/references/02-ios-ipados-wireframe.png`
- `docs/design/references/03-ios-dark-kit.png`
- `docs/design/references/04-control-center-dark.png`
- `docs/design/references/05-visionos-spatial.png`
- `docs/design/references/06a-natural-search-idle.png`
- `docs/design/references/06b-natural-search-listening.png`

Live:

- [Casa di Solare](https://casadisolare.com/)
- [Nexusmag](https://www.nexusmag.eu/)
- [Brik showcase](https://brik.space/showcase-video)
- [Fractiona](https://dribbble.com/shots/27655966-Fractiona-Fractional-Investing-Mobile-App)
- [Raktor](https://dribbble.com/shots/26864675-Raktor-Drone-Mission-Web-Dashboard)
- [Gleb Kuznetsov — Voice interaction for Natural search UI](https://dribbble.com/shots/26722789-Voice-interaction-for-Natural-search-UI-by-Gleb-Kuznetsov)

Related product docs: `docs/handoff/spatial-instrument-build-prompt.md`, `docs/handoff/ui-rebuild-round1-build-prompt.md`, `design-system/productname/MASTER.md`, `docs/design/ambient-dock-ui.md`.

Slop / audit sources (for §12, not to copy visually): [Booplex Pixelslop](https://booplex.com/projects/pixelslop), [DEV purple gradient](https://dev.to/james_anderson_h/the-purple-gradient-problem-why-ai-ui-all-looks-alike-and-how-to-fix-it-3j65), [Setproduct](https://www.setproduct.com/blog/why-every-ai-startup-looks-the-same), [Sailop 7 dimensions](https://sailop.com/blog/what-is-ai-slop-7-dimensions-of-generic-design), [21st.dev](https://21st.dev/blog/website-not-look-ai-generated), [DesignPixil vibecoded](https://designpixil.com/blog/why-your-saas-looks-vibecoded), [NN/g top 10 app mistakes](https://www.nngroup.com/articles/top-10-application-design-mistakes/).
