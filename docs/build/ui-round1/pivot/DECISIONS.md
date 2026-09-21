# UI round 1 — DECISIONS

## D-01 Weight and term logic in JS sync, not React

Rejected computing `weight_share` in the frontend. `browser/scripts/lib/study-sources.mjs` writes it at ingest. `read_semester` (Rust) only filters stored fields.

## D-02 Sync progress: progress.json + Tauri event

Rejected UI-only polling of course files. Sync writes `inbox/study-sources/progress.json` and JSON lines; the daemon emits `study-sync-progress`. Survives a brief UI hitch.

## D-03 Stub Canvas for native/dev

`PRODUCTNAME_STUB_CANVAS=1` makes check-session true, skips the SSO window, and emits progress from existing schema-2 JSON. Never used Jacob’s real inbox.

## D-04 Course palette

Okabe–Ito inspired 8 hues, tuned for Paper cream and Night `#1C1C1E`:

`#2E86AB` `#E09F3E` `#2A9D8F` `#C44569` `#5B8DEF` `#E76F51` `#7B68EE` `#6A994E`

Assignment: djb2 of course id. No red/green-only pair. Deuteranopia check: blue/gold/teal/rose remain separable; lime/olive are not the sole distinction.

## D-05 Clustering

Small ticks (`height ≤ 18px`) within 8px on the current axis merge into one control. Exams/quizzes do not merge into that group.

## D-06 Calendar surface vs Plan six hops

The Calendar tab does **one** `read_calendar_surface` (commitment + events + suggestions). Learn-loop due-review hops stay off this tab (root of the ~1s Plan open). Google Calendar create remains PlanEvent/connectors, behind ConfirmationGuard, not this sheet.

## D-07 Legal module path

Vite/Vitest deny `?raw` imports outside `app/`. Canonical drafts live in `docs/legal/` **and** `app/src/legalDocs/` (same text). `legal.ts` imports the app copies plus school preambles.

## D-08 Open in Canvas

Rust `open_external_url` (`open` on macOS), http(s) only. No extra npm opener plugin.

## D-09 FirstRun leftover Onboarding.tsx

Six-step games stay under Settings → preferences. First-run is `FirstRun.tsx` only.
