# Student beta — decisions, structural gaps, and release path

Date: 2026-09-17. This records Jacob's current conversation instructions,
separately from engineering recommendations and unanswered questions. It is not
a release certification or a claim that proposed work is implemented.

## Confirmed direction

- Primary promise: prepare for midterms/tests, recommend specific study work,
  and explain why a methoda was selected. Workload organization is secondary.
- Mac is the priority. Support other computers at launch if feasible, without
  calling an untested platform supported.
- Target internal testing September 18–20 and initial classmates September
  21–22. These are targets, contingent on the release checks below.
- Jacob funds AI use in the beta with a stated first-week budget of $50–$100.
  Use $50 as the proposed initial hard cap and let Jacob explicitly raise it
  up to $100; controls are not implemented yet. Expected tester count is 5–10.
  Subscription/payment work comes later.
- Google Calendar and Outlook email (not Outlook calendar) are desired at launch,
  but are supporting features. Outlook account types still need clarification.
- Apple Developer enrollment is not active. Signing/enrollment is a release
  dependency, not a completed setup step.
- Latest September 17 clarification supersedes the earlier local-only inference
  requirement: selected email/calendar content may be processed by cloud AI,
  but must not be stored in our databases. Keep records and OAuth tokens local;
  exclude content from our persistent logs, caches, queues, traces and analytics.
  Tokens never enter model context. Provider-side retention must be disclosed
  separately; no claim of “never leaves the device” or zero provider retention.
- Beta analytics: opt-in usage counts only, disabled until the student opts in.
  No collected learning content, answers, scores, progress records, email/calendar
  content, or credentials. Define a minimal event allowlist with no free-text
  properties. Cloud study inference is allowed; this is not permission to retain
  student content as analytics or hosted backups. A later ambiguous reference to
  “both” does not establish a clear expansion of the explicit usage-count choice.
- Stable navigation with highly customizable visual themes. Generative visual
  customization is a later possibility, not authorization to execute generated
  application code or rebuild navigation per student.
- Expressive animation, moderate character presence, almost no rewards.
  Provide reduced-motion behavior. Jacob will provide deeper session research;
  do not invent approval of a new learning protocol in its absence.
- A small CU tester group is acceptable; invitation mechanics are not finalized.
  The purpose is feedback and controlled rollout, not artificial scarcity.
- Current conversation authorizes release preparation and UX work; historical
  shell/packaging deferrals must not be treated as a permanent ban on this work.
  It does not establish that the app is already ready to distribute.

## Recommended delivery shape — engineering recommendation

Keep Tauri as the desktop framework and React as the owned interface. Build a
study workspace, rather than requiring a small always-on-top dock to carry the
whole product. Keep the optional dock separate from the core study journey.

A small website explains the product, offers the verified installer(s), and
provides support/privacy information. It is not a second hosted copy of the app.
Do not require the existing sensor extension to obtain the primary study value.
Windows uses the shared desktop code only after its installer and login path
are tested. Chromebook/mobile are not covered by a desktop installer; do not
promise universal device support from Tauri's platform list.

Funded AI recommendation after comparing alternatives: a small authenticated,
capped request relay with vendor secrets held server-side, no intentional
content logging, and per-tester/global spending controls. Jacob authorized this
fallback subject to researching alternatives; the [comparison is now recorded](../research/funded-ai-access-2026-09-17.md).
Selected email/calendar context may transit the relay without persistence.
Never embed owner vendor API keys in installers or browser code. Provider
retention is a separate consideration from our own logging policy. Nothing is
deployed or provisioned yet.

## Structural inspection — observed, not a full runtime audit

| Surface | Evidence | Consequence / next work |
|---|---|---|
| Desktop runtime depends on checkout and developer tools | `app/src-tauri/src/daemon.rs`: `CARGO_MANIFEST_DIR`, `python3`, `npm`, repo-relative `browser/` | Package runtime/resources and resolve installed paths; test without the checkout or development tools |
| Brief command routes but does not deliver the brief | `app/src/App.tsx`: `routeIntent` displays `Routed → …` | Wire a bounded task execution path and render useful output, including failure/cancellation |
| Review UI consumes existing claims and self-scored outcomes | `app/src/components/ReviewSession.tsx` | Verify material → grounded practice → feedback → persisted follow-up, starting with an empty student profile |
| Provider and prompt infrastructure exists | `src/canvas_mcp/core/{llm_provider,prompt_assembly}.py` | Reuse existing assembly/provider seams; existence of helpers is not evidence of an integrated desktop tutor |
| Extension is a focus/URL sensor | `app/extension-chrome/README.md`, native messaging host | Publishing it does not distribute the study product |
| Profile paths differ across runtimes | Rust `inbox.rs` uses `dev`; Python/JS support user identity | Reconcile contracts and test profile isolation before additional students |
| Google connector plumbing exists, Outlook does not appear in connector tree | `mcp-servers/` contains Gmail, GCal, Apple Calendar stub, common helpers | Outlook needs an app registration, delegated auth, implementation, and live account verification |
| Google setup is developer-oriented | `mcp-servers/common/google_oauth.py`: client-secrets env/path and local token JSON | Product-owned connect/disconnect flow, secure local token storage, expiry/revocation handling |
| Onboarding is six steps with extensive profile collection | `app/src/components/Onboarding.tsx` | Defer nonessential preferences until after initial study value |
| Template conflicts with current submission policy | `templates/USER.md` automation posture | Correct seed text; do not silently rewrite existing students' files |

September 15 audit results are historical evidence only. This inspection does
not rerun those tests or validate live credentials, packaged binaries, or study
effectiveness. Avoid a directory-wide rewrite: prioritize broken boundaries on
the student journey before moving files for tidiness.

Current baseline: `cd app && npm run build` passed on September 17 (TypeScript
and Vite). `git diff --check` passed for this documentation/template change.
`cargo` was not found on the current shell PATH; no Rust build or installed-app
test was run. Frontend compilation is not evidence of desktop distribution
readiness. The template correction affects future profiles only.

## Intended data boundaries — requirements, not yet verified

- Profile: student-editable preferences/goals; `USER.md` remains a compact
  personalization input, not a credential store or the authority for permissions.
- Course/planning state: local source records with timestamps and Canvas IDs.
- Learning state: local practice history and provenance. Only opt-in usage
  counts may be collected for beta analytics; no hosted learning backup or
  content/progress collection is authorized.
- Calendar/email: local tokens and stored records; cloud processing of selected
  relevant content is permitted. Select minimal context locally; no indiscriminate
  mailbox/calendar upload. Content-derived summaries/tasks carry the same
  no-server-persistence restriction. Verify shared prompt assembly, logging,
  exceptions, and hosting defaults preserve that boundary.
- Themes: bundled declarative presets and local preference storage. No theme
  database needed initially. Future natural-language customization should emit
  validated theme values, with preview/reset and accessibility constraints.
- Permissions: preserve Canvas preview-only submission/comment/discussion
  behavior and per-action confirmation for personal email/calendar writes.

## Build and verification order

1. **Distribution feasibility:** installed resource/runtime resolution, fresh
   Mac profile, Canvas login, one sync, readable errors. Check Apple signing
   access immediately. Attempt Windows through the same runtime contract.
2. **First useful study session:** course/exam selection, source-backed scope,
   practice with an explanation of selection, feedback, saved follow-up.
   Missing material must produce a clear recovery path rather than invented
   exam coverage. No developer agent should be required to run the experience.
3. **Product experience:** shared study/planning navigation, simplified setup,
   theme presets, motion/reduced-motion, keyboard access, loading/error/empty
   states. Evaluate against Jacob's forthcoming session research.
4. **Funded access:** following the researched relay recommendation, authenticated invitation
   access, enforceable budgets, revocation, usable quota/outage messages.
5. **Integrations:** Google Calendar and clarified Outlook scope; system-browser
   OAuth, least needed permissions, disconnect, expired login, and confirmations.
   Selected content may reach cloud inference; verify it is not persisted in
   service databases, logs, error reporting, caches, queues, or analytics.
   Verify school-account consent policies rather than assuming permission.
6. **Beta delivery:** verified installers, website download/support information,
   update/recovery strategy, clean-machine walkthrough and feedback channel.

Steps can overlap where independent. Calendar/email are desired beta scope,
not silently cut; if provider registration/consent blocks them, report the
specific blocker and agree the release scope with Jacob.

## Release evidence required

- Fresh nondeveloper machine installs and launches without Git, a checkout,
  Python/Node setup, API-key entry, or command-line fixes.
- New student signs into their own Canvas account; stale/expired sessions have
  recovery; one student's files/tokens cannot leak into another profile.
- A new course produces an actual useful study session without preseeded personal
  data; sources and inferred coverage are distinguishable.
- Student can explain the next study action and why it was chosen; self-reported
  success is not presented as verified mastery or guaranteed exam improvement.
- Vendor keys are absent from distributable assets; spending limits hold under
  concurrent/retried requests; revoke a beta user without shipping a new build.
- Connector names shown as connected reflect a real authenticated read; mock or
  dry-run results are never presented as actual email/calendar operations.
- Seed distinctive synthetic email/calendar content and verify only selected
  relevant fields reach AI requests; no content or derived summaries persist in
  service databases, logs, caches, queues, analytics, or crash reports, including
  on timeout/retry/error paths. OAuth credentials never enter AI requests.
  Usage collection is off by default and accepts only allowed count events
  without free-text/content fields.
- Per-action write confirmations remain binding; no automatic Canvas submission.
- Theme/motion changes preserve readable contrast and usable keyboard focus.
- Each advertised OS passes its own installed-app test. Updates preserve local
  study state, and an interrupted update has a documented recovery path.

## Open answers

1. Outlook email: CU-managed Microsoft accounts, personal accounts, or both?
2. Does the first-week $50–$100 budget include hosting/fees as well as inference?
3. If “both” in the latest freeform answer meant expanding analytics to learning
   progress/content, clarify that separately. Current scope stays opt-in counts.

Answered: 5–10 testers; Apple enrollment not active; Google Calendar + Outlook
email; cloud study AI; selected email/calendar cloud processing without our
server persistence; authenticated relay acceptable after alternatives research.
These are requirements, not yet verified implementation guarantees.

The [comprehensive study-session research prompt](../research/study-session-deep-research-prompt.md)
is ready for independent agents. It requests evidence synthesis, counterevidence,
worked 5/10-minute sessions, decision rules, UX, privacy-aware evaluation, and a
repo comparison without requiring a new code implementation.

## External references checked September 17

- [Tauri distribution](https://v2.tauri.app/distribute/): platform installers;
  this does not bundle this repo's external runtime dependencies automatically.
- [Microsoft Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference):
  delegated mail permissions and account support; actual CU tenant consent
  still needs verification.
- [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies):
  production identity and authorization requirements.
- [Jev announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev):
  early-access structured decision model. Later evaluation candidate for routing
  or classification; not a launch dependency or a replacement for explanation
  generation. Benchmark on representative, consented/redacted tasks first.
