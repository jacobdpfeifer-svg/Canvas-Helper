# Decision gate: should the brain be hosted? — 2026-09-30

Phase C of [`freshness-extension-spike-2026-09-29.md`](freshness-extension-spike-2026-09-29.md).
Hosting stays deferred (signed 2026-09-29). This doc fixes, before the beta
starts, what the beta must measure and what result changes the answer, so
the call is made on data rather than on how the demo felt. Changing this
answer is a signed addendum here, not an audit finding.

## The question

Can a student get the product with only the Chrome extension, because the
brain (triage, next step, cost of skipping, digest) runs on a server? Or
does it stay on the student's Mac, which means installing the desktop app?

## What the beta records

No telemetry server. Both sides keep **timestamps and counts only**; no
Canvas content, titles, grades, or URLs.

| Where | Key | Meaning |
|---|---|---|
| Extension (`chrome.storage`) | `installed_at` | extension installed |
| | `first_signed_in_at`, `polls`, `signed_out_polls` | background checks with and without a live Canvas session |
| | `native_ok_at`, `native_missing` | desktop app's host answered / was not installed |
| | `first_delta_at` | first Canvas change handed to the brain |
| | `first_dashboard_view_at`, `dashboard_views` | Canvas dashboard stage seen |
| | `first_panel_open_at`, `panel_opens` | assignment side panel used |
| | `suggestions_queued` | "agent can do" items the student queued |
| Desktop (`{user_root}/inbox/freshness/funnel.json`) | `native_host_first_ping`, `first_delta_received`, `first_delta_processed`, `first_calendar_suggestion`, `extension` (last extension snapshot) | same milestones seen from the app side |

Collection: the side panel's **Copy beta readout** button copies the
extension's JSON; beta students paste it into the feedback form at day 7.

## Thresholds (need at least 10 students with 7+ days each)

| Signal | Computed as | Result → action |
|---|---|---|
| **Desktop drop-off** | students with `installed_at` but no `native_ok_at` within 7 days ÷ students with `installed_at` | **≥ 30 %** → host the brain (option C). **15–30 %** → first try a lighter installer, re-measure. **< 15 %** → stay local (option A) |
| **Extension-only value** | among students without `native_ok_at`, share with `dashboard_views ≥ 3` in 7 days | **≥ 50 %** strengthens C: they come back without the plan features, so giving them the plan is worth the custody cost |
| **Session durability** | median per student of `signed_out_polls ÷ (polls + signed_out_polls)` | **> 50 %** (real Chrome drops the Canvas session on quit) → host only the feed watcher (option B) before anything else; it needs no session |
| **Agent usefulness** | share of active students with `suggestions_queued ≥ 1` | informative only; below 20 % → rework "agent can do" before scaling any hosting |

The thresholds are defaults set before any data. Tighten them in this doc
before the beta starts if needed, never after the results are in.

## Options

- **A — stay local.** Today's build. Nothing leaves the Mac except Canvas
  requests the student's own browser makes.
- **B — host only the feed watcher.** Feed URLs are read-only bearer links
  (announcements, course content, calendar), not session keys. A small
  service polls them 24/7 and pushes a "something changed" nudge. Grades
  and submissions never leave the Mac.
- **C — host the brain.** Extension-only product. The server holds
  announcements, due dates, grades, and the student's profile.

## What B or C would require before launch

- Per-student auth and an encrypted store; export and delete on request.
- Feed-URL custody: tokens encrypted at rest, never logged, revocable (a
  student can reset them in Canvas).
- A CU data-handling review. Student-held data is FERPA-adjacent even when
  the student sends it.
- A privacy policy, an incident plan, and a published list of what leaves
  the machine.
- Cost: measured triage volume is about 40–50 change events per student
  per week, about $1–2 per student per month on Claude Sonnet 5.5, plus
  interactive study use.
- **Never:** holding a student's Canvas SSO session or cookies server-side,
  under any option. It is a live key to submit as the student.

## Already portable

The freshness core is pure modules with injected fetch and storage
(`browser/scripts/lib/freshness/*`, `canvas-feeds.mjs`, `canvas-changes.mjs`,
`skip-cost.mjs`, `freshness-dashboard.mjs`). The extension already reads one
contract (`dashboard.json` through the native host). Moving to B or C swaps
the transport, not the logic.
