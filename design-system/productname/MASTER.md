# ProductName — Living Instrument design system

**Source of truth for visual craft.** This is a deliberate break from the previous "Spatial Instrument" look: less generic glass UI, less dashboard sameness, more authored composition, material contrast, kinetic typography, and memorable states.

> Working thesis: **the workspace is a living instrument, not a stack of cards.**

Geometry and Peek states still live in [`docs/design/ambient-dock-ui.md`](../../docs/design/ambient-dock-ui.md). Product behavior still lives in [`docs/design/spatial-instrument-brief.md`](../../docs/design/spatial-instrument-brief.md). This file supersedes the visual direction and style tile ([`docs/design/style-tile.html`](../../docs/design/style-tile.html)) when they conflict.

Token names used by the running app: `app/src/styles.css` (workspace + dock), `app/src/spatial.css` (chrome primitives), `landing/styles.css` (marketing site, mirrors the app tokens). Theme ids: `night` (default), `paper`, `forest`, `signal`, `contrast` — see `app/src/theme.ts`.

## 01 — Creative direction

### Name: Living Instrument

The interface should feel like a cross between:

- **Apple:** calm hierarchy, material depth, responsive edge light, and controls that recede until needed.
- **Nike:** decisive scale, compression, speed, crop, and a willingness to let one gesture or phrase dominate the frame.
- **Abetka UA:** typographic identity with cultural specificity; letters are objects with history, not anonymous UI labels.
- **Ellipsus:** human authorship, collaboration, and an open-ended creative surface rather than an AI transcript.
- **Siri:** a responsive presence that appears as a field of light and motion, not a chatbot mascot.
- **Lusion / Depo Studio:** art-directed scenes, 3D or spatial cues, precise transitions, and a portfolio-like sense of reveal.

The result is **quiet at rest, expressive in transition**. It should be recognizable in a still screenshot and unforgettable in use.

### What changes from the old system

| Old tendency | New rule |
|---|---|
| Frosted-glass panels everywhere | Use material only for chrome; let content sit on paper, ink, or image fields |
| Card grid as the default composition | Use a stage: one dominant object, a supporting rail, and generous negative space |
| One accent color doing all the work | Use a restrained ink/paper base plus a named "signal" color per context |
| Generic sans-serif hierarchy | Pair a characterful editorial face with a neutral utility face and a technical mono |
| Static rows and buttons | Give important actions a trajectory, pressure, or reveal |
| AI-looking sparkle / gradient / glow | Use light as feedback tied to voice, focus, progress, or spatial position |
| Uniform rounded corners | Let geometry communicate role: instrument, sheet, note, rail, or viewport |

## 02 — Composition: the stage model

Every major screen is composed as a stage with four layers:

1. **Field** — the persistent atmosphere: paper grain, ink, image, or very quiet color wash.
2. **Subject** — the one thing the user is doing now: a prompt, lesson, due item, or decision.
3. **Orbit** — secondary navigation, metadata, context, or next actions arranged around the subject.
4. **Signal** — the transient response: focus, selection, voice, completion, error, or collaboration.

Do not start by drawing cards. Start by choosing the subject and its stage. A screen may contain only one bordered surface if the field and subject are already doing the work.

### Layout rules

- Use an asymmetric 12-column grid on desktop; the subject may occupy 7–10 columns.
- Align supporting UI to an optical axis, not automatically to the left edge.
- Allow controlled bleed: headings, images, and marks may cross the grid by 1–2 columns.
- Use one "hero measure" per view: the dominant text or object gets the largest scale and strongest contrast.
- Prefer a vertical rail, index, or timeline over a row of three equal feature cards.
- Maintain a clear quiet zone around the subject. Negative space is an active component, not unused area.
- On narrow screens, collapse the orbit into a bottom sheet or edge rail; do not shrink the stage into a miniature desktop.

### Density

| Zone | Density | Treatment |
|---|---:|---|
| Plan / due-list / ledger | Tight | 8px row, 4px gaps, compact labels, hairline dividers |
| Chrome / controls | Medium | 12–16px internal padding, strong hit areas, minimal decoration |
| Study / reading | Reading | 45–70ch, 17–19px body, generous leading, no glass behind prose |
| Showcase / onboarding | Cinematic | Fewer elements, large type, object-led composition, deliberate reveal |

Keep the original principle: **do not average densities into one bland middle.**

## 03 — Material language

Material is semantic. Every surface must answer "what is this made of?"

### Material roles

- **Ink:** primary work surface for focus, study, and immersive moments. Matte, deep, low reflection.
- **Paper:** reading, writing, review, and cultural/archival content. Warm, slightly fibrous, never sterile white.
- **Glass:** temporary chrome only—sidebar, sheets, command palette, now-playing, and floating controls.
- **Film:** image/video surfaces. Full bleed, edge-to-edge, with text placed in a controlled dark/light zone.
- **Signal:** a luminous, responsive layer used only for live feedback.

### Texture

Use texture as a barely perceptible physical cue:

- Paper grain: 2–4% opacity, monochrome, large scale, no visible tiling.
- Ink noise: 1–2% opacity, slow drift only in showcase/ambient moments.
- Glass: blur and translucency only when there is meaningful content behind it; never glass over a flat radial gradient.
- Images: prefer authored crops, scanned marks, diagrams, or macro detail over generic stock photography.

Texture must disappear when the user is reading. It may return at the edges, in transitions, or in empty states.

## 04 — Color system

Color is organized by material and context, not by a single "brand accent."

```css
:root {
  --ink-0: #0c0d0f;
  --ink-1: #15171a;
  --ink-2: #22262a;
  --paper-0: #f3efe7;
  --paper-1: #e7dfd1;
  --paper-ink: #272322;
  --line-light: rgba(255, 255, 255, 0.16);
  --line-dark: rgba(26, 22, 20, 0.16);

  /* named signals: choose one per moment, never all at once */
  --signal-cobalt: #3767ff;
  --signal-coral: #ff604d;
  --signal-gold: #e1ad49;
  --signal-violet: #8b72e8;
  --signal-cream: #f1d7a7;

  --success: #4cc38a;
  --danger: #f35b57;
}
```

In the app these primitives feed the semantic tokens components actually consume: `--bg`, `--fg`, `--muted`, `--accent` (= the scene's signal), `--surface-0/1/2`, `--surface-grouped`, `--hairline`, `--ring`. Components never reference a `--signal-*` primitive directly; they use `--accent`, and the theme decides which signal that is.

### Theme recipes

| Theme | `data-theme` | Field | Ink | Signal | Use |
|---|---|---|---|---|---|
| Night / Instrument | `night` | `#0C0D0F` | `#F3F1EB` | Cobalt or cream | Default workspace, command, study focus |
| Paper / Archive | `paper` | `#F3EFE7` | `#272322` | Cobalt or coral | Reading, writing, historical or reference content |
| Forest / Fieldwork | `forest` | `#17201A` | `#EFE6D7` | Gold or cream | Long sessions, review, outdoor/field metaphors |
| Signal / Live | `signal` | `#111522` | `#F5F7FF` | Violet-to-coral edge light | Voice, collaboration, active processing |
| High contrast | `contrast` | `#08090A` | `#FFFFFF` | Yellow `#FFD60A` | Accessibility mode; no blur, 2px rules |

Constraints:

- No purple/indigo/cyan glow as a default atmosphere.
- No lime as brand decoration.
- `--success` and `--danger` are state colors, not decorative accents.
- Use one signal color per scene; two only when one is a semantic state.
- Paper is warm; do not use pure white as the default reading field.

## 05 — Typography

Typography is the strongest identity carrier. It should feel closer to an editorial specimen, a sports poster, and a writing tool than to a SaaS dashboard.

### Recommended roles

| Role | Face | Size / leading | Notes |
|---|---|---:|---|
| Display / scene title | `Source Serif 4` or a similarly expressive variable serif | 56–104px / .88–.96 | Tight tracking, occasional line break as composition |
| Editorial heading | `Source Serif 4` | 28–48px / 1.0 | Use for study, archive, and narrative moments |
| Utility UI | `IBM Plex Sans` | 14–16px / 1.2 | Medium weight; clear, not over-bold |
| Study prose | `IBM Plex Sans` or a readable humanist sans | 17–19px / 1.45–1.6 | 45–70ch; never glass-backed |
| Technical meta | `IBM Plex Mono` | 11–13px / 1.2 | Coordinates, dates, progress, system status |
| Accent label | Utility face, uppercase | 10–12px / 1.0 | Letter spacing 0.08–0.14em; use sparingly |

CSS roles: `--font-display` (Source Serif 4), `--font-ui` (IBM Plex Sans), `--font-mono` (IBM Plex Mono); scale tokens `--type-display`, `--type-editorial`, `--type-ui`, `--type-prose`, `--type-meta`, `--type-label`.

### Type behavior

- Display type can be oversized, clipped, or vertically indexed in showcase views.
- Study type is stable. It does not flip, stretch, shimmer, or sit on a moving background.
- Kinetic type is reserved for entry, progress, and section transitions—not comprehension-critical copy.
- Avoid "everything is bold." Use scale, placement, and contrast before weight.
- Never use Inter, Geist, Roboto, or SF Pro as the only identity-bearing face.

## 06 — Geometry

Geometry should distinguish a tool from a container.

```css
:root {
  --radius-window: 22px;
  --radius-stage: 18px;
  --radius-sheet: 14px;
  --radius-control: 10px;
  --radius-row: 6px;
  --radius-pill: 999px;
  --hairline: 1px;
}
```

- **Stage:** 18–22px, used for a full scene or immersive surface.
- **Sheet:** 14px, used for a temporary layer or focused cluster.
- **Control:** 10px, used for buttons, fields, and toggles.
- **Row:** 6px, used for dense list selection; no floating card treatment.
- **Pill:** only for status, tags, segmented control, or search affordance.
- **Peek dock:** preserve the existing 18/14 geometry and 6/14/22 spacing. It is a specialized object, not the global language.

Do not give every element the same radius. Repetition without role is what makes a UI look AI-generated.

## 07 — Navigation and spatial chrome

### Desktop

- Sidebar is a quiet glass instrument: 224–248px, low contrast, no giant logo block.
- The active item is a change in light, rule, and glyph—not a saturated filled pill.
- Add a thin vertical "position rail" for the current section or study sequence.
- Command palette opens as a centered sheet with a visible relationship to the underlying stage.

### Narrow screens

- Use either a bottom tab bar or a gesture/edge rail; never desktop sidebar plus mobile tab bar together.
- Let the current subject remain large. Secondary context becomes a sheet.
- The dock is a parked object with its own geometry and shadow logic.

### Wayfinding

Use index language where it helps: `01 / 05`, `TODAY`, `NEXT`, `RETURN`, `PAUSED`. These markers should feel like an instrument readout, not decorative labels.

## 08 — Components

### Buttons

- Primary action: one solid signal surface or high-contrast ink/paper inversion.
- Secondary action: text, hairline, or quiet glass; never a second competing filled button.
- Hover: surface displacement or light sweep of 1–2px, 160–220ms.
- Press: compress 1px and reduce shadow; no cartoon bounce.

### Lists

- Dense lists are editorial ledgers: index, title, metadata, one active rule.
- Use row hover to reveal the affordance, not to tint the entire row with a gradient.
- Selected rows may expose an accent bar, timestamp, or thumbnail crop.
- Avoid nested cards and "card inside card" composition.

### Study card / prompt

- Treat the prompt as a page or instrument face, not a rounded card floating in glass.
- Put the prompt in a 45–70ch reading column with one supporting index or progress mark.
- Feedback should enter as a change in field, margin note, or signal line; not as a confetti panel.

### Command palette

- Open with a quick radial light or focus ring that resolves into the sheet.
- Use keyboard-first spacing and a clear active row.
- Search results may carry small image/shape previews when spatial memory matters.

### Voice / Siri-like presence

- The live state is an edge field, halo, or contour around the stage—not a floating orb or mic icon as the main identity.
- Motion follows input amplitude: low-energy idle, responsive speaking, settling response.
- Keep the underlying workspace usable while the signal is live.
- Provide non-audio equivalents: live text, focus ring, visible status, and cancel action.

## 09 — Motion grammar

Motion communicates state, material, and attention.

### Four verbs

| Verb | Use | Motion | Token |
|---|---|---|---|
| **Settle** | Page load, completed transition | 180–260ms ease-out; opacity + 4px travel | `--motion-settle` |
| **Reveal** | New content, sheet, command | 220–420ms; clip, mask, or spatial slide | `--motion-reveal` |
| **Pulse** | Live voice, collaboration, focus | Low-amplitude light/scale tied to real state | `--motion-pulse` |
| **Commit** | Completion, selection, saved state | One crisp snap, rule, or color lock | `--motion-commit` |

Rules:

- Never `transition: all`.
- No shimmer, confetti, default bounce, or endless decorative loops.
- Only one dominant motion may occur at a time.
- Study prose remains still; motion belongs to margins, signals, and transitions.
- Use `prefers-reduced-motion` and `data-motion="reduced"` to remove travel, blur, and pulse while retaining state changes through contrast and labels.
- Suggested timings: chrome 140–180ms (`--motion-chrome`), sheet 220–360ms (`--motion-sheet`), reveal 320–560ms, showcase object 600–900ms (`--motion-showcase`).

### Kinetic type

Permitted in:

- onboarding title reveal;
- section index transitions;
- study mode entry/exit;
- a single completion moment.

Not permitted in:

- body reading;
- list scanning;
- error copy;
- persistent navigation.

## 10 — Imagery and generative surfaces

Images must add point of view. Prefer:

- macro crops of real materials;
- annotated diagrams and letterforms;
- expressive object studies;
- editorial portraits or movement frames;
- scanned marks, archival fragments, or handmade textures;
- restrained 3D objects with one clear lighting idea.

Avoid generic AI imagery, floating glass spheres, abstract blue gradients, stock "student at laptop" scenes, and ornamental 3D that has no relationship to the task.

If generative imagery is used, preserve a repeatable art direction: fixed lens language, fixed grain, a limited palette, and a small family of objects. The system should feel art-directed, not randomly illustrated per screen.

## 11 — Screen recipes

### Home / Plan

Field: warm paper or quiet ink. Subject: today's next meaningful action. Orbit: due rail and recent work. Signal: one cobalt or coral action. Use a vertical index and a single large statement; avoid a 3-up dashboard.

### Study

Field: paper or matte ink. Subject: prompt/prose. Orbit: progress, source, next/previous. Signal: margin feedback or a thin live edge. Keep the 17–19px reading measure and ban glass behind the text.

### Command

Field: existing workspace remains visible and dimmed. Subject: search/input. Orbit: indexed result groups. Signal: keyboard focus. Use a sheet that feels placed into the workspace, not a generic modal.

### Onboarding

Field: cinematic. Subject: one physical metaphor—instrument, page, thread, or signal. Orbit: short copy and one action. Signal: object responds to cursor, voice, or progress. One scene, one idea, one motion.

### Settings

Field: quiet paper/ink. Subject: one setting group at a time. Orbit: section index. Signal: control state. Keep it calm and utilitarian; the identity comes from typography, rules, and material, not decoration.

## 12 — Anti-patterns, revised

These are design failures, not aesthetic preferences:

- All-glass interface with no material distinction.
- Three equal cards used as the first answer to any information problem.
- Generic dark mode with a purple/blue radial glow.
- Gradient text, sparkle-as-AI, emoji-as-brand, or "magic" language without a product reason.
- One border radius repeated across every element.
- Nested cards, floating cards, and cards inside glass panels.
- Default Inter/Geist-only typography with no editorial voice.
- Decorative 3D object unrelated to task or state.
- Persistent motion, shimmer, bounce, or cursor-following noise.
- ChatGPT transcript as the Home surface.
- Celebration mechanics that feel like a game streak system.
- Glass, blur, or animated texture behind 17px study prose.
- Voice represented only by a microphone glyph or orb.

## 13 — Accessibility and engineering

- Preserve semantic HTML, visible focus, keyboard traversal, and 44px minimum hit targets.
- Keep contrast strong on paper and ink surfaces; do not rely on glow for legibility.
- Provide text and static state equivalents for live audio and motion.
- Use `content-visibility` carefully; do not hide the current study context from assistive technology.
- Keep texture and noise on separate layers so they can be removed in high-contrast or reduced-motion modes.
- Use CSS custom properties for material, signal, type scale, and timing. Avoid hardcoded one-off values in components.
- Test at 200% zoom, keyboard-only, reduced motion, high contrast, and narrow viewport widths.

## 14 — Migration order

1. Replace the global color/material tokens and remove blanket glass. — **done 2026-09-21** (`app/src/styles.css`, `landing/styles.css`; `.glass` now sheet-radius chrome only)
2. Replace the typography stack and introduce display/editorial roles. — **done 2026-09-21** (`--type-*` scale tokens)
3. Recompose Home and Study around the stage model; remove 3-up card grids.
4. Rebuild navigation active states and dense lists as rails/ledgers.
5. Add the four motion verbs to real state transitions only. — tokens landed; wire to components in step 3/4
6. Introduce paper grain, ink texture, and authored imagery as optional layers.
7. Re-audit Peek, command palette, onboarding, and settings for role-specific geometry.
8. Delete obsolete anti-pattern tokens, especially default glows, universal radii, and sparkle/gradient utilities.

## 15 — Acceptance test

A screen passes only if:

- it reads as a composed scene at a glance;
- the subject is obvious without scanning a grid of cards;
- material and geometry explain hierarchy;
- the type system feels authored and not interchangeable with a template;
- motion is tied to an actual state;
- the screen remains calm and legible when motion and texture are disabled;
- one screenshot would be recognizable as ProductName without the logo.

## Research notes

This direction synthesizes the following observed principles:

- Apple's Human Interface Guidelines organize visual hierarchy around materials, typography, layout, and system-level consistency: [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/).
- Apple's newer Siri interaction uses a responsive edge light that animates with voice while leaving the rest of the device usable: [Apple iOS 18 feature overview](https://www.apple.com/in/ios/ios-18/pdf/iOS_18_All_New_Features_Sept_2024.pdf).
- Nike's visual language is built around fluid motion, speed, strong crops, and dynamic composition rather than static product cataloging: [Nike visual identity reference](https://api.acleddata.com/_pdfs/form-library/rRCYdO/Nike_Visual_Identity_Guideline.pdf).
- Abetka UA turns the Ukrainian alphabet into a visual identity system, combining cultural meaning with modern type design: [Abetka UA](https://abetkaua.com/en/) and [Communication Arts case study](https://www.commarts.com/project/36279/typeface-alphabet-of-the-ukrainian-identity).
- Ellipsus positions itself around collaborative writing, publishing, and human-to-human creativity—useful counterweight to chatbot-shaped product surfaces: [Ellipsus profile](https://www.linkedin.com/company/ellipsus/).
- Lusion frames its work as immersive digital experiences spanning design, motion, 3D, and technology: [Lusion](https://lusion.co/about/) and [Lusion studio site](https://www.lusionstudio.com/).
- Depo Studio explicitly combines moodboards, wireframing, animation, design, and development, and treats websites as stories rather than containers: [Depo Studio](https://www.depo.studio/) and [website creation process](https://www.depo.studio/services/website-creation).

These are reference principles, not assets to copy. The product should borrow the underlying behaviors—material hierarchy, authored type, movement, cultural specificity, and spatial composition—while keeping its own voice.
