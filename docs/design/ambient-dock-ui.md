# Ambient dock UI — design spec

**Status (2026-09-12):** **Parked** (signed product decision). Peek/expanded/onboarding + tray are as-built in the Tauri shell. Visual language remains Selective Instrument Glass. **Not building in this phase:** true Hidden resting default, narrate-auto-peek, or a shell replacement. Alternatives: [`docs/handoff/ui-shell-alternatives.md`](../handoff/ui-shell-alternatives.md).

What the ProductName desktop shell is supposed to be, distilled from the
Phase 1 design discussion. This is the reference for anyone (human or agent)
touching `app/src/App.tsx`, `app/src/styles.css`, or `app/src-tauri/src/dock.rs`.

## Core concept

The app is **never a normal application window**. It does not open, sit in
the center of the screen, or behave like a document/editor. It is a small
object that lives on your screen — closer to a physical sticky note than
software — and the moment it has nothing to say, it is not there at all.

Reference point: Cluely's floating glass overlay — small, translucent,
always-on-top, expands/collapses rather than opening/closing a window. Where
this project's answer differs from Cluely: no screen-reading, no GPU-hook
invisibility trick, and it docks to a fixed screen corner rather than
following the cursor or a call window.

## The three states

| State | Size (logical px) | Position | When |
|---|---|---|---|
| **Hidden** | — | — | Default. Nothing on screen, no Dock icon, no taskbar entry. |
| **Peek** | 320 × 300 | Bottom-right corner of the screen's work area | The resting "sticky note" — shown after summon or a new event. Height fits Top3 + optional check CTA; keep in sync with `PEEK_H` in `dock.rs`. |
| **Expanded** | 400 × ~34% of screen height (clamped 420–680) | Same bottom-right corner, grows up-and-left | While the command palette, an approval sheet, or the ledger view is open. |
| **Onboarding** | 460 × 640 | Centered | First run only, before a school + legal acceptance exist. |

Peek and Expanded always share the same bottom-right anchor point, so
expanding reads as the note growing out of itself — a drawer opening from
the corner — never the window jumping somewhere new.

### How you get from Hidden to Peek

- Click the menu-bar tray icon (left-click, not the menu) — toggles
  Hidden ↔ Peek.
- (Planned, not yet built) auto-peek when a new narrate-after event lands,
  so you're not required to go looking for it.

### How you get from Peek to Expanded

- Click the sticky note itself (opens the ledger view), or trigger the
  command palette (⌥), or an approval sheet appears. Closing all of those
  shrinks the window back to Peek — it does not hide, since you were just
  looking at it.

### How you get back to Hidden

- Explicit × (dismiss) button in the note's control row.
- Tray icon left-click again while visible.

There is deliberately no "quit" surface inside the note itself — this is an
ambient background utility, not an app with a title bar. Quitting the
process is the tray menu's "Quit" item only.

## Visual craft — Selective Instrument Glass

Tokens, type, anti-patterns, and component craft rules live in
[`design-system/productname/MASTER.md`](../../design-system/productname/MASTER.md).
Agents touching the dock UI must follow MASTER; this section is the short map.

- **Direction:** physical sticky note + Raycast-grade chrome. Frosted shell,
  opaque-enough content. Not a SaaS dashboard, cream/terracotta editorial,
  full Apple Liquid Glass, or purple glass pack.
- **Type:** Source Serif 4 (display: “Today”, ProductName) + IBM Plex Sans
  (UI) + IBM Plex Mono (due times / ledger). Fonts must load for real.
- **Accent:** ink cobalt (`--accent` / `#6B8CFF`), surgical — not mint/teal AI-HUD.
- **Surfaces:** shell ladder (`--surface-0` peek → `--surface-1` expanded)
  stays translucent enough for ambient presence; content planes
  (`--surface-2` sheets / palette / dense lists) are opaque-enough so
  wallpaper cannot wash out text. Paper-edge hairline on the dock top only.
- **Icons:** thin stroke SVG — never emoji or lone unicode as brand chrome.
- **Motion:** eased Peek↔Expanded resize (~180ms); short sheet/palette enter
  (opacity + 4–8px rise); honor `prefers-reduced-motion`. No shimmer or
  refractive motion.

## Material / visual language: frosted shell + opaque-enough content

Two layers stack on the **window shell** only:

1. **Native vibrancy** (`app/src-tauri/src/dock.rs::apply_glass`) — macOS
   `NSVisualEffectView` (`HudWindow` material) applied directly to the
   window. This is what actually blurs the real desktop sitting behind the
   window — a CSS trick alone cannot do this because the window has nothing
   of its own to blur.
2. **CSS tint + border** (`app/src/styles.css`) — light `backdrop-filter:
   blur()` on `.dock` (and onboarding shell) plus the shell surface tint
   (`--surface-0` / `--surface-1`, aliased historically as `--glass-tint*`)
   and a 1px near-white hairline border (`--border`). Enough tint that the
   sticky reads as glass, not a hole in the screen.

**Content planes** (`.sheet`, `.palette`, Top3 list, ledger, narrate) use
`--surface-2` (or stronger) **without** stacked `backdrop-filter`. Blur
once on the shell; keep lists and approval copy readable over busy
wallpapers. Optional faint glass on floating control chips only — never on
paragraph text.

Rules that follow from this:
- Frosted shell + opaque-enough content planes — not “glass everywhere,”
  and not a fully opaque app chrome that kills the sticky metaphor.
- The window itself is `transparent: true` + `decorations: false` +
  `shadow: false` in `tauri.conf.json` — the CSS border-radius and
  `box-shadow` on `.dock` are what give it visible edges and depth, not the
  OS window chrome.
- `alwaysOnTop: true` + `skipTaskbar: true` — it floats above your other
  windows and never appears in the Dock, Cmd+Tab, or the taskbar. It is not
  meant to be "an app you switch to."
- When the OS prefers reduced transparency, fall back to `--surface-solid`
  on the shell so text stays legible.

## Component map — what's inside each state

- **Peek**: control row (⌥ palette, STOP, × dismiss) + `Top3Sticky` (up to
  3 due items, condensed). Nothing else — this is the note.
- **Expanded**: everything in Peek, plus `NarrateAfter` (recent automations
  with an undo affordance) and whichever overlay triggered the expansion —
  `CommandPalette`, `ApprovalSheet`, or `LedgerViewer`. Overlays render as
  absolutely-positioned sheets inside the dock's own bounds (`inset: 0`
  relative to `.dock`, not the full screen), since the window itself is
  already the right size.
- **Onboarding**: school picker → legal acceptance → Canvas SSO step →
  priorities → local-model/cloud-key choice. This is the one state allowed
  to feel like a normal small app screen, since it's a one-time flow, not
  the ambient resting state.

## Explicit non-goals

- Never a full-screen or maximizable window. `resizable: false` — geometry
  is only ever driven programmatically by `dock.rs`, never dragged by hand.
- No screen-capture invisibility (unlike Cluely) — this app doesn't need to
  hide from Zoom/Meet; it just needs to stay out of your way visually.
- No cursor-following HUD — it is corner-anchored, not attached to the
  mouse.
- No cross-platform parity claim yet — `apply_glass` is macOS-only
  (`NSVisualEffectMaterial::HudWindow`); Windows acrylic/Mica would hang off
  the same call site later but isn't implemented.

## Open / not yet built

- Auto-peek on new narration/ledger events without a manual click.
- A global keyboard shortcut to summon Peek from anywhere (currently only
  the tray icon can do this; ⌥Space only works once the window is already
  visible and focused).
- Windows/Linux equivalents of the vibrancy call.
- (Polish) Further tune Peek↔Expanded easing if the stepped resize in
  `dock.rs` still feels jumpy on high-DPI displays.
