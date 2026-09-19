# ProductName — Spatial Instrument design system

**Source of truth for visual craft.** Geometry and Peek states live in
[`docs/design/ambient-dock-ui.md`](../../docs/design/ambient-dock-ui.md).
The signed look-alike spec is
[`docs/design/spatial-instrument-brief.md`](../../docs/design/spatial-instrument-brief.md).
Style tile: [`docs/design/style-tile.html`](../../docs/design/style-tile.html).

## Direction

**Spatial Instrument** for the student-beta **workspace** (a real Mac window):
visionOS glass chrome, iOS control weight, Linear/Raktor density on lists,
Solare warmth on Paper, Gleb sequencing on the command palette, Brik/Solare
type motion **only inside Study**. The parked Peek dock keeps sticky-note
geometry (18/14 radii, 6/14/22 spacing). Do not force Home into a sticky note.

Glass is allowed on chrome (sidebar, sheets, bubbles, palette, now-playing).
It is forbidden on 17px study prose, list rows, and timeline ticks.

## Dual density

| Zone | Density | Padding | Type |
|------|---------|---------|------|
| Plan due-list, ledger | Linear — tight | 8px row, 4px gaps | 13px UI, 12px mono |
| Buttons, bubbles, study card, onboarding, Settings | iOS roomy | 12–14 × 16–18 | 15–17px, 34px Large Title |
| Study prompt / feedback | Reading | column, 45–70ch | 17px / 1.45 |

Do not average these into 11px radius and 10.5px type.

## Colors (workspace tokens)

Night default. Required names in `app/src/styles.css`.

| Token | Night | Role |
|------|-------|------|
| `--bg` | `#1C1C1E` | Window, always painted on `html, body, #root, .workspace` |
| `--surface-0/1` | white-alpha glass | Sidebar / raised chrome |
| `--surface-2` / `--surface-grouped` | opaque-enough | Lists, study prose |
| `--accent` | `#6B8CFF` | One cobalt chrome accent |
| `--success` | `#34C759` | Toggle-on / connected **state only** |
| `--danger` | `#FF453A` | Destructive |

| Theme | `--bg` | Accent |
|-------|--------|--------|
| Paper | `#ECE4D5` / `--fg #563E3B` | `#2F5BD8` |
| Night | `#1C1C1E` | `#6B8CFF` |
| Forest | `#121A16` pine glass | cream `#E8D9C4` (not mint) |
| High contrast | `#0E0E10`, 2px borders, no blur | `#FFD60A` |

Accent is surgical: focus ring, selected 5/10 segment, the single primary CTA.
Forest mint `#7fd1a0` / `#5fd6ae` is an anti-example. Lime `#C6FF00` is banned.

## Typography

| Role | Face | Size |
|------|------|------|
| Large Title | Source Serif 4 | 34px / 600 / −0.6px |
| Chrome body | IBM Plex Sans | 15px |
| Study prose | IBM Plex Sans | 17px / 1.45 |
| Footnote / timeline | IBM Plex Sans | 13px |
| Mono meta | IBM Plex Mono | 12px |

No Inter, Geist, Roboto, SF Pro webfont, or pirate Solare. Bold in chrome is 600.

## Radius

`--radius-window` 20, `--radius-panel` 24, `--radius-card` 16, `--radius-control` 12,
`--radius-row` 10, `--radius-pill` 999 (search / segmented / tags only).
**Forbidden:** 8px as the default control radius (dock Peek may still use 8).
**Forbidden:** 24px on every button.

## Motion

Chrome hover/tab 160–180ms `ease-out`. Panel enter 220ms. Segmented thumb 200ms.
Onboarding object 600–900ms `cubic-bezier(0.22, 1, 0.36, 1)`. Study letter-flip
1600–2400ms loop max, one motion at a time. Honor `data-motion="reduced"` and
`prefers-reduced-motion`. Never `transition-all`. Never bounce on chrome. Never shimmer.

## Navigation

≥900px: 240px glass sidebar, squircle mark 32–36, rows 40px, active = lighter
glass + accent glyph. <900px: iOS tab bar 50px only. Not both.

## Parked dock

Peek keeps `--radius-outer: 18px`, `--radius-sheet: 14px`, spaces 6/14/22, heavier
shadow. Overrides live under `.dock`. Do not port 24px visionOS panels into Peek.

## Anti-patterns (locked)

See brief §12. Instant-death combo, four 12.A ticks, or a 12.C cluster fail a screen.

- Purple / indigo / cyan glow; Inter/Geist-only; glass-on-radial; 3-up feature cards
- Emoji / sparkle-as-AI; gradient text; nested cards; `transition-all duration-300`
- Forest mint as accent; “PN” lettermark; OLED true-black High Contrast
- Duolingo streaks/celebration; ChatGPT transcript as Home; microphone this round
- Liquid Glass on 17px study prose
