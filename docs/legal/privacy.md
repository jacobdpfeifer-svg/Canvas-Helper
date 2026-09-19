# Privacy Policy — ProductName

**Beta draft · 2026-09-18.** Not lawyer-reviewed. "ProductName" is a placeholder name for a private beta. Read with the [Terms of Service](./terms.md).

## The short version

- Your data lives **on your computer**, in one profile folder. Delete the folder, delete the data.
- The App reads Canvas with **your own sign-in**; it never submits, posts or comments there.
- Nothing is sent to a ProductName server except, if you use AI help, the text you chose to send — and that service is built not to keep it.
- Email/calendar writes to your personal Google account happen only after you confirm each one.
- Analytics are **off** unless you opt in, and then they are counts only.

## What the App stores, and where

Everything is under your profile folder:

- macOS: `~/Library/Application Support/ProductName/<profile>/`
- Windows: `%APPDATA%\ProductName\<profile>\`
- Linux: `~/.local/share/ProductName/<profile>/`

Inside it:

| Folder / file | What it holds |
|---|---|
| `inbox/study-sources/` | Your courses' syllabus text, published pages, assignment descriptions, graded-item list (titles, due dates, points, weights), exam candidates, and your own submission state for each item, as read from Canvas |
| `inbox/week.md`, `inbox/courses/` | The week view and course catalogs from the Canvas sync |
| `inbox/calendar.jsonl` | Events you add in the Calendar tab |
| `inbox/calendar-suggestions.jsonl` | Calendar suggestions the email triage found (contract; only written if you connect email) |
| `study/` | Practice packets, your attempts, answers and self-grades |
| `calibration/`, `USER.md` | Preferences and the optional profile you fill in |
| `auth/browser/` | Your Canvas SSO **session cookies** (never your password) |
| `ledger.jsonl` | A local record of drafts and confirmations |

No ProductName service stores your study content, answers, email or calendar content.

## What the App reads from Canvas

Using your SSO session, the App calls Canvas's own API for: your active courses and term dates; assignments, quizzes and assignment groups (names, due dates, points, weights, links); your own submission state and score for those items; published pages and the syllabus. It reads nothing about other students, never reads quiz questions, and never writes to Canvas. Your school's login systems see the usual sign-in traffic.

## What leaves your computer

- **Canvas / school sign-in:** the SSO flow and the API reads above.
- **AI help (optional, funded by the beta owner):** when you ask for feedback, the selected source excerpt and your answer go through the beta owner's relay to a model provider (Claude by Anthropic or Gemini by Google). The relay is designed not to persist that content or derived summaries in databases, logs, caches, queues, traces, crash reports or analytics; it keeps only per-tester usage counts and billing totals. **The provider's own retention and processing terms apply separately** and are outside our control; we disclose them rather than promise otherwise.
- **Google (optional):** if you connect Gmail / Google Calendar, Google receives the OAuth consent traffic and the API calls for reading, and — only immediately after you confirm a specific preview — a send or event create/update.
- **Usage counts (optional, off by default):** if you opt in, anonymous session-started / session-finished counts. Never answers, scores, sources, progress or course content. In this beta build no collector exists yet; the switch records only your preference.

There is no ProductName cloud account, backup or sync.

## What the App never does

- Submit assignments, take quizzes, post or reply in discussions, or comment in Canvas for you.
- Send email or write calendar events without your confirming that exact action first — there is no automatic or standing mode.
- Read other students' data.
- Scrape RateMyProfessors or any site that forbids it.
- Sell or share your data.

## Your responsibilities

FERPA obligations, academic-integrity rules and your school's acceptable-use policy remain yours. The App is not a university service and does not replace your school's counsel or information-security office.

## Retention and deletion

Data stays until you delete it. To delete everything: quit the App and remove the profile folder above (this includes the Canvas session cookies and any Google tokens). If you used AI help, ask the beta owner to delete your tester record (usage counts and invite); no content is held to delete.

## Not affiliated

ProductName is an independent beta. It is not affiliated with, endorsed by, or connected to the University of Colorado Boulder or Instructure, Inc. Canvas is a trademark of Instructure, Inc.

## Changes

We may update this policy for later beta builds; the date at the top changes when we do, and the App shows the current text under "View terms".

## Contact

For this private beta, contact the person who invited you. A public address will be published when the App ships under its final name.
