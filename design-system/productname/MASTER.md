# ProductName — Paper Instrument design system

**Source of truth for visual craft.** Geometry and dock states live in
[`docs/design/ambient-dock-ui.md`](../../docs/design/ambient-dock-ui.md).
This file overrides the ui-ux-pro-max auto-generator defaults (which suggested
flat teal SaaS or cream/terracotta — wrong for an ambient instrument dock).

## Direction

**Selective Instrument Glass** (Paper Instrument) — physical sticky-note
metaphor + Raycast-grade chrome precision. Frosted **outer shell** only;
lists, approvals, and ledger text sit on **opaque-enough content planes**.
Never a SaaS dashboard, marketing page, cream/terracotta editorial, full
Apple Liquid Glass, or purple glassmorphism pack.

## Pattern

- Ambient overlay / sticky note (Peek → Expanded drawer from bottom-right)
- Peek: Top3 + one primary action
- Expanded: sheets inside the dock bounds (palette, approval, ledger)
- Onboarding: the only app-like centered surface

## Colors

| Role | Hex / value | CSS variable |
|------|-------------|--------------|
| Foreground | `#EEF3F8` | `--fg` |
| Muted | `#9AABC0` | `--muted` |
| Accent (ink cobalt) | `#6B8CFF` | `--accent` |
| Accent deep (fills) | `#4A6AE8` | `--accent-deep` |
| On accent | `#0A1020` | `--on-accent` |
| Danger | `#E08585` | `--danger` |
| Success (rare) | `#7BCFA6` | `--success` |
| Paper highlight | `rgba(255, 228, 196, 0.55)` | `--paper-edge` |
| Surface peek (shell) | `rgba(18, 24, 32, 0.72)` | `--surface-0` |
| Surface expanded (shell) | `rgba(14, 19, 26, 0.82)` | `--surface-1` |
| Surface content / overlay | `rgba(10, 14, 22, 0.94)` | `--surface-2` |
| Surface solid fallback | `rgb(12, 16, 24)` | `--surface-solid` |
| Border | `rgba(255, 255, 255, 0.14)` | `--border` |
| Border strong | `rgba(255, 255, 255, 0.22)` | `--border-strong` |
| Divider | `rgba(255, 255, 255, 0.08)` | `--divider` |
| Focus ring | `#6B8CFF` | `--ring` |

Depth comes from the **surface ladder** (luminance), not stacked glows.
Body text must hold ~WCAG 4.5:1 against the effective composite (tint +
typical wallpaper), not against pure black alone.

Accent is surgical: focus ring + primary Approve / check CTA fills only.
Danger/success only for STOP / undo outcomes — never decoration.

## Typography

| Role | Family | Use |
|------|--------|-----|
| Display | Source Serif 4 | “Today”, ProductName wordmark, sheet titles |
| UI | IBM Plex Sans | Body, buttons, labels (~13–14px) |
| Mono | IBM Plex Mono | Due times, ledger IDs, technical captions |

Rules:

- Sentence-case section titles (never all-caps HUD labels)
- Display serif for sticky identity only — not every heading
- Load fonts for real; never declare without `@import` / `@font-face`
- No Inter, Geist, Roboto, Arial as primary
- Density closer to Linear: tight row rhythm, Top3 scannable in &lt;1s

```css
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&display=swap");
```

## Radius & spacing

| Token | Value | Use |
|-------|-------|-----|
| `--radius-outer` | `18px` | Dock shell |
| `--radius-inner` | `8px` | Buttons, inputs |
| `--radius-sheet` | `14px` | Overlays |
| `--space-tight` | `6px` | Chip gaps |
| `--space-row` | `14px` | List row padding rhythm |
| `--space-section` | `22px` | Section breaks |

Intentional irregular spacing (14 / 22) breaks machine 8px-grid sameness.

## Effects & motion

- **Blur once:** native vibrancy (`NSVisualEffectView`) + light CSS
  `backdrop-filter` on `.dock` / onboarding shell only
- Content planes (`.sheet`, `.palette`, Top3 rows, ledger, narrate) use
  opaque-enough `--surface-2` + hairline borders — **no stacked blur**
- Optional faint glass on floating control chips only — never on paragraph text
- 1px paper-edge highlight on dock top only
- Soft single shadow on dock: `0 10px 28px rgba(0,0,0,0.32)`
- Transitions: `opacity` / `transform` / `background` at 160–220ms `ease-out`
- Sheet/palette enter: short opacity + 4–8px rise — no shimmer, refraction,
  or breathing glass
- Never `transition-all`
- Peek↔Expanded: eased window resize (~180ms) + CSS enter for list rows
- Honor `prefers-reduced-motion: reduce` (instant size, no stagger)
- Opaque shell fallback when Reduce Transparency / forced-colors prefer solid

## Icons

- Thin stroke SVG (inline Phosphor/Lucide-style), 16–18px
- Never emoji as icons; never unicode alone as brand chrome (`⌥`/`×` replaced)

## Component notes

### Peek / Top3

- Serif “Today”
- Primary status line (streak) vs secondary captions (health/budget/trail)
- Numbered instrument rows on content plane; mono due line
- One primary CTA (start check)
- No glass cards per row

### Approval sheet

- Supervisor gate: title = action, body = why, primary Approve (accent fill),
  secondary Skip
- Opaque dialog inside dock — never translucent over desktop wallpaper

### Command palette

- Raycast contract: instant focus, Esc, arrow/Enter, shortcut hints, empty state
- Dense rows on opaque panel; glass stays on the window shell, not result text

### Ledger / NarrateAfter

- Audit density first — mono lines, hairline dividers, no frosted row backgrounds
- NarrateAfter: calm post-action feed + Undo; no celebratory motion

### Onboarding

- Display ProductName lockup
- Step dots / progress
- Custom-styled select/inputs matching instrument chrome (opaque-enough fields)

## Anti-patterns (locked)

- Full Liquid Glass / refractive materials on content planes
- Low-opacity text or icons over live wallpaper
- Purple / pink / indigo gradients
- Mint/teal AI-HUD accent (old `#5fd6ae`)
- Inter / Geist / system-only type
- 3-up feature card grids
- `rounded-2xl` monoculture / multi-layer glow
- Emoji icons
- Uppercase + tracking HUD section labels
- `transition-all duration-300`
- Cream/terracotta editorial sticky
- Restless / morphing chrome animation
- Approval as soft translucent toast
- Opaque solid fills on the **dock shell** that kill the sticky metaphor
  (content planes may and should be opaque-enough)

## Pre-delivery checklist

- [ ] Fonts visibly load (Source Serif 4 + IBM Plex)
- [ ] SVG icons; cursor-pointer on clickables
- [ ] Focus ring visible (`--ring`)
- [ ] `prefers-reduced-motion` respected
- [ ] Peek hierarchy readable in &lt;1s
- [ ] Content planes opaque-enough; blur only on shell
- [ ] No purple gradients / Inter / emoji / 3-column cards / Liquid Glass content
