# UI shell alternatives — Tauri parked (2026-09-12)

**Decision:** keep the current Tauri dock for now (**park**). Do not finish Hidden/auto-peek and do not start a shell rewrite in this pass. Signed in [`pre-ship-decisions.md`](./pre-ship-decisions.md) row 3.

Jacob’s call: skeptical of Tauri, UI is not where it needs to be, but OK to continue if no clearly better drop-in exists today.

## What we need from a shell

- macOS tray + always-available peek dock (small always-on surface)
- Local daemon cadence (Canvas sync) without a browser tab
- IPC to Python/`npm` sync and skill router
- Optional Chrome Native Messaging bridge
- Offline / local-first (no hosted backend)

## Comparison (this pass)

| Option | Pros | Cons for ProductName right now |
|--------|------|--------------------------------|
| **Tauri 2 (current)** | Already wired (tray, dock geometry, IPC, daemon spawn); small binary; Rust + webview UI we already have | Dock/glass UX still rough; webview styling fights native feel; path-with-`:` packaging friction on this machine |
| **Electron** | Huge ecosystem, easy React; familiar for web-first UI polish | Heavier RAM/disk; another rewrite of `app/src-tauri` IPC/daemon; no clear win over finishing Tauri peek |
| **SwiftUI / AppKit native** | Best Mac tray/dock feel; notarization path is well-trodden | Full rewrite; Python/npm bridge still needed; slower iteration for current team |
| **Menu-bar-only (SwiftBar / plain script + notification)** | Tiny surface | Cannot host Top-3 / review session / onboarding as designed |
| **Browser-only (extension + local page)** | No desktop shell | Loses tray daemon; fights “local companion” positioning; NM becomes mandatory |

## Verdict

No alternative is a better **near-term** bet than parking Tauri: the cost of a shell rewrite dwarfs the benefit before SSO smoke, history purge, and peek honesty are proven with real testers. Polish the React dock inside Tauri; revisit **Replace** only with a new signed decision after private beta feedback.
