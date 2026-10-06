# Kairos for Canvas (Chrome extension, MV3)

Keeps an eye on Canvas for the student and shows it where they already are.
Decision record: [`docs/handoff/freshness-extension-spike-2026-09-29.md`](../../docs/handoff/freshness-extension-spike-2026-09-29.md) (signed 2026-09-29).

## What it does

- **Background check, every 5 minutes** (`sw.js`, `chrome.alarms`): one
  `GET /api/v1/users/self/activity_stream/summary` with the student's own
  Canvas session. When the counts move, it fetches the changed slice (recent
  activity stream + a planner window), classifies it locally, and hands it to
  the desktop brain through the native host. A 401 shows a `!` badge: "sign
  in to Canvas".
- **Canvas dashboard stage** (`ui/dashboard.js`, shadow DOM): next step,
  what changed, what professors said (action items pulled from
  announcements), and what the agent can do (calendar suggestions the
  student approves in the app).
- **Side panel on assignment pages** (`panel.html`): rubric as a checklist
  (state stays in this browser), announcements that mention it, what
  changed, cost of skipping, and a fastest honest path.
- **Without the desktop app** it still shows changes and the digest from its
  own classification. Next step and cost of skipping need the app.

## Hard rules (tested in `browser/tests/extension.test.mjs`)

- Canvas access goes only through `lib/canvas-read.js`: GET, four
  allow-listed read endpoints, https Canvas origins only, no method
  parameter, never reads the CSRF token. Nothing here can submit, post,
  comment, or edit in Canvas.
- Canvas-authored text is inserted with `textContent` only — no
  `innerHTML`, no `eval`.
- Permissions are exactly `alarms`, `storage`, `nativeMessaging`,
  `sidePanel`, plus host access to Canvas. No `tabs`, `cookies`, or
  `scripting`.
- The beta funnel (`bumpFunnel` in `sw.js`) stores timestamps and counts
  only; see [`docs/handoff/hosting-decision-criteria-2026-09-30.md`](../../docs/handoff/hosting-decision-criteria-2026-09-30.md).

## Files

| Path | Role |
|---|---|
| `sw.js` | background worker: poll, delta, native bridge, views, funnel |
| `lib/canvas-read.js` | the only Canvas access (GET allowlist) |
| `lib/native.js` | promise wrapper for `com.kairosstudy.daemon` |
| `lib/format.js`, `lib/assignment-plan.js` | display helpers, checklist + path builders |
| `shared/*.js` | **generated** from `browser/scripts/lib/freshness/*.mjs` — edit the source, then run `node app/extension-chrome/tools/vendor-shared.mjs` |
| `ui/dashboard.js`, `ui/dashboard.css` | Canvas dashboard stage (Living Instrument, ink) |
| `panel.html`, `panel.js`, `panel.css` | side panel (Living Instrument, paper) |
| `shared/blot/*.js` | **generated** Blot engine from `app/src/blot/core/` (same tool); `lib/blot-mount.js` puts Blot in the side-panel header (thinking while loading, hop when ready) |
| `icons/blot-*.png` | pixel Blot icons, written by `node app/extension-chrome/tools/blot-icons.mjs` |
| `fonts/` | self-hosted Source Serif 4, IBM Plex Sans/Mono (OFL, licenses alongside) |
| `tools/` | dev only — not part of a packaged build |

## Try it

1. `chrome://extensions` → Developer mode → **Load unpacked** → this folder.
   The fixed `key` keeps the ID at `jkjkbgcbpakeenemjgkfohbcfbghmall`.
2. Install the native host (copies it out of the checkout — Chrome-launched
   processes cannot read iCloud Drive):

   ```bash
   bash app/native-messaging/install-macos.sh
   ```

3. Open Canvas. The stage appears above the dashboard; click the toolbar
   icon for the side panel.

## Check it without a Canvas account

```bash
node app/extension-chrome/tools/e2e-mock-canvas.mjs
```

It serves a mock `https://canvas.colorado.edu`, loads this extension in
Playwright's Chromium, runs the real native host and the real freshness tick,
and writes screenshots plus `report.json`.
