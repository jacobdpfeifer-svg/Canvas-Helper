# Decision: device-automation harnesses — 2026-09-29

Signed by Jacob in conversation on 2026-09-29. Extends the canvas-focus pivot
([`canvas-focus-pivot-2026-09-11.md`](canvas-focus-pivot-2026-09-11.md)); does not
re-open it.

## Trigger

A LinkedIn post (Raynan Wuyep, 2026-09-29) announced **cell-use**
(<https://github.com/Raynan00/cell-use>), an Apache-2.0 Swift SDK that lets an
agent screenshot, tap, swipe and type across iPhone apps from the phone itself.
The question: can this repo use it so students can automate processes?

## What cell-use is (verified 2026-09-29 from the repo, README, THIRD_PARTY_NOTICES)

- Control goes through **Developer Mode + a local VPN tunnel (LocalDevVPN)** back
  into the phone's own developer services. The transport is a patched
  **DeviceHub iOS** (JaviSoto, MIT) built on **idevice** (Jackson Coxson, MIT).
- Setup needs a Mac with Xcode 27, Rust, pairing, and a signed build (7-day
  development signing). Phone-control runtime is **iOS 27 only**.
- Observation is **screenshot PNG only**; actions are tap / swipe / typeText /
  wait / finish.
- Alpha: 9 commits, 5 stars, single author, 0 issues at time of review.
- Not App Store–distributable (inference: Developer Mode + pairing + loopback
  developer-service tunnel are sideload-only).

## The decision

1. **Do not integrate cell-use or any device-automation harness.** Same answer
   for Appium/XCUITest/WebDriverAgent, facebook/idb, mobile-mcp,
   callstack/agent-device, and successors.
2. **Device harnesses inherit every existing rule.** Bucket A/B, Canvas-visible
   preview-only, no Buff Portal/DegreeWorks scraping, no quiz/assessment
   automation. A mobile harness can never reach a write the web path blocks.
   The Canvas Student app's Submit/Post/Reply are the same Canvas-visible
   actions as the web — a different door, same lock.
3. Enforced in code: `CONNECTOR_REGISTRY` entries carry `surface: "web"`;
   `assertRegistryShape` (`browser/scripts/lib/connector-registry.mjs`) refuses
   any other surface at module load. Policy text: `plugins/README.md` rule 7,
   `docs/architecture.md` Plugins row.

Why: the pivot's research finding — trust collapses around irreversible or
other-visible actions — applies to taps exactly as to API calls. The product is
also desktop-only (2026-09-18), and Developer Mode + VPN profile + weekly
re-signing is not a realistic beta ask.

## What was taken from cell-use instead

- **Runner discipline** → `browser/scripts/lib/action-runner.mjs`
  (`runActionPlan`): ordered steps, fresh observation after every act, halt on
  a failed check, one required final `finish` step whose check is the verdict,
  per-step diagnostics under `{user_root}/diagnostics/` (outside `inbox/`;
  screenshots written only for failed runs; newest 10 per action). CampusGroups
  RSVP (`runRsvpFlow` / `runRsvpCli`) is the first user: preview without
  `--confirm`, `--expect <id>` pins the confirm run to the previewed event, and
  results say `confirmed` / `unconfirmed` / `not_attempted` in plain language.
  The runner does not replace `--confirm` / `ConfirmationGuard`.
- **The observe → decide → observe loop, minus the tap** →
  `skills/student-screen-coach`. The student sends a screenshot, the agent
  suggests the next step, the student taps. "Student operates, agent drafts."

## Coach scope on graded work (default chosen 2026-09-29)

Navigation help and concept explanation only. The coach never states, picks,
or checks a final answer on a graded item (Bucket-B tools, quizzes, graded
`external_tool`). Proctored/exam screens → refuse and stop. Revisit only by an
explicit signed addendum here.

Applied repo-wide 2026-09-29 (signed by Jacob): `student-canvas-browser` §C
step 2 previously said "Draft steps/answers in chat" for Bucket-B tools; it now
matches this scope, so the escape hatch and the coach can't disagree.

## What re-opens a read-only device connector

All three, not any one:

1. cell-use (or a successor) ships a non-alpha release that runs without
   Developer Mode or with a sanctioned Apple entitlement.
2. The product has an iOS surface (currently desktop-only).
3. A real **Bucket-A, read-only** tool with no web surface appears in a
   student's `inbox/tool-gaps.md`.

Even then: read-only, school-gated, `surface` value added by reviewed PR with
tests, `ConfirmationGuard` on any student-private write, never a Canvas-visible
or Bucket-B action.
