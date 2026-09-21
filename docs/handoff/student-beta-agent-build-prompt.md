# Student beta: architect-led build, research, and release audit

Prepared September 18, 2026 for Claude, Grok, Codex, or another coding-capable agent with repository access. This is a **build execution prompt**, not another research assignment. The study journey is the product; organization and integrations support it.

**How Jacob should run it:** Give the agent this repository and ask: “Execute `docs/handoff/student-beta-agent-build-prompt.md`. Read the context it names, adopt its architect role, and carry the build through its verification and audit cycle. Improve the design where evidence supports it. Start now.” If the agent cannot read local files, supply this prompt and the core reading in §5. A chat-only agent can produce research or reviews, but cannot truthfully claim it built or tested the application.

**Running several models:** Prefer separate branches/worktrees or copies for competing complete builds. Alternatively, choose one integration architect and give the others bounded research/audit tasks against named revisions. Do not have three independent architects edit the same checkout or user profile at once. This prompt does not depend on a particular vendor's subagent tools.

Team shape, journey-coverage method, and build-record templates are in the appendix. They are defaults. They are not the mission.

---

## 1. Mission

You are the coordinating architect and accountable integrator for ProductName, a local-first Canvas companion for university students. Turn the existing repository, beta plan, and study-session research into a coherent, usable, tested student beta. Your output is working software and reproducible evidence, not a plan, a collection of agent reports, a polished mockup, or a passing frontend compilation alone.

Jacob wants a product that helps a student prepare for midterms: choose specific worthwhile study work, understand why it was selected, practice against permitted source material, receive honest feedback, and resume later with their work intact. A new student should obtain that value without a coding agent, developer checkout, personal vendor API key, or command-line repair.

The author of this prompt supplies the initial architectural direction. You are its executing architect. You do not need to report to a separate unavailable ChatGPT instance or wait for the prompt author to approve engineering decisions. Adopt, challenge, and improve this architecture using evidence. Own the consequences across implementation, migration, user experience, privacy, cost, and verification.

Jacob prefers judgment over rigid process. The phases, roles, and templates below are defaults to reason from. Collapse them when a better approach survives comparison and testing. Preserve the purpose of the evidence and the safety boundaries rather than mechanically copying research pseudocode or staffing an org chart.

Work through coherent steps. At each step, investigate, decide, build, integrate, test, audit, and repair. Parallel work is useful when contracts and file ownership make it safe; it is not permission to build several incompatible products at once. Do not stop at the first successful demonstration or hand the user a to-do list of fixes you can make yourself.

Continue until the **must-ship bar** is implemented and verified, then as far through supporting work as access allows. When remaining work depends on unavailable access, hardware, an external service, or a consequential owner decision, complete every independent authorized task, preserve a precise continuation checkpoint, and report the exact blocker. Never manufacture “done” to satisfy persistence, and never spin indefinitely on a blocked action. Persistence means checkpointed slices with a resume pointer, not an unbounded claim that one session will ship installers, a live relay, Outlook, and a website.

## 2. Must-ship bar

This is the north star. Later phases support it; they do not replace it. Feature omission must be visible in the acceptance map, not hidden by declaring a narrower MVP complete after skipping this journey.

A new student who is not Jacob, with no checkout knowledge, can:

1. Launch a supported Mac build, or a clearly labeled development fallback if packaging is blocked.
2. Use a separate synthetic profile or their own profile — not the author's.
3. Import or sync permitted source material, or get an honest empty-source recovery path. Never invented exam coverage.
4. Choose a course, exam, or objective and see why that work was selected, with source-backed versus inferred labels.
5. Complete one real answer, receive supported feedback or an explicit abstention, and keep the draft and history across restart.
6. Leave with no vendor key in the app, no Canvas post/submit executed on their behalf, and no mastery or “exam-ready” percentage from weak signals.

Closure-matrix items marked “closed as specification” are a proposed contract, not proof the app does them. Implement the minimal next slice: one synthetic source-backed item, a real saved answer, exposure events before reveals, a deterministic check or explicit abstention, and a later review transition that preserves the existing due-clock invariant. Do not transplant the research reference as production code.

### Scope cut line

| Layer | Include | Do not treat as the finish line |
|---|---|---|
| **Must-ship** | Honest launch, identity and profile isolation, one local deterministic study cycle, restart-safe state, empty-source honesty | A website, character animation, or funded-AI copy claiming a hard cap |
| **Supporting, if unblocked** | Canvas SSO read/sync, funded relay with tested caps, Google Calendar, Outlook email once audience is answered, Mac installer | Advertising an unverified platform, or presenting mocks as connected accounts |
| **Owner-gated** | Apple signing, live OAuth app registration, raising the $50 envelope, contacting classmates, production deploy, product name | The agent inventing answers, spending, invitations, or a brand to keep going |

If packaging, signing, or hardware is absent, keep that distinction visible and still build the local study cycle. Packaging research may proceed in parallel; it cannot block Phase 2.

## 3. Hard boundaries

These are product commitments, not all design choices. A better implementation is welcome. A change to audience, privacy, spending authority, assessment boundaries, or launch scope needs a product decision rather than an architectural euphemism.

### Product

- Small CU Boulder beta, approximately 5–10 classmates; Mac first. Windows is desirable if its installer/login/runtime path is actually verified. Do not advertise Chromebook/mobile support from a desktop framework's platform list.
- Primary promise is study/test preparation; workload organization is secondary. Five/ten minutes are adjustable scope targets, not proven learning doses or forced timers.
- Original testing targets were September 18–20 and classmates September 21–22, 2026. Treat them as dated targets, not permission to bypass acceptance.
- Tauri + React is the starting architecture. A substantial study workspace should carry the journey; an optional dock and sensor extension are supplementary.
- No Canvas access token is assumed. The truth path is SSO cookies → Canvas `/api/v1` → per-user local source/planning memory → study/planning interface. PAT support is optional.
- Source-backed exam scope and inferred relevance are visibly different. Visible Canvas material is not blanket permission to solve a live assessment. School connectors use the static registry; missing connectors are reported, never auto-fetched or generated. External assessment tools remain student-operated escape hatches.
- Example-first acquisition, assisted practice, immediate retry, delayed independent retrieval, and uncertain/model/self grading are distinct. Model-proposed, student-self, abstained, and pending grades do not advance delayed stability. Deterministic credit covers only the supported key/checker scope. Model confidence cannot upgrade its own grading authority.
- Approved application providers are Claude/Gemini. The agent running this build may itself be Claude, Grok, or Codex; that does **not** authorize switching the application's inference provider to the agent's vendor.
- Owner-funded first week: $50–$100 stated, with $50 the initial proposed allowance. Until Jacob answers whether that envelope includes hosting/fees, plan conservatively for **all** fixed fees plus inference within $50. Budget controls were not implemented when this plan was written.
- Preferred funded architecture is an authenticated, capped relay with server-held vendor secrets and no intentional content persistence. A justified alternative can be evaluated, but must account for new intermediaries, data handling, cost controls, account access, and integration work.
- Local learning state. Cloud processing of selected study/email/calendar text is allowed. Our service does not persist that content or derived summaries in databases, logs, caches, queues, traces, crash reports, or analytics. Local connector records and OAuth tokens are allowed; secrets never enter prompts. Provider retention is separate and disclosed accurately.
- Optional analytics are opt-in usage counts only, off by default. No student answers, scores, learning progress, course content, or hosted learning backup.
- Google Calendar and Outlook **email** are desired launch features, not Outlook calendar. Outlook account type — CU-managed, personal, or both — remains unresolved. Do not silently drop those integrations or invent tenant consent.
- Stable navigation, customizable visual themes, purposeful motion, moderate character presence, minimal rewards, reduced-motion support. No losable streaks, shame, leaderboards, or “exam-ready” percentages from weak signals.
- Canvas submission/comment/discussion tools stay preview-only. Personal email/calendar writes require the existing per-action confirmation boundary. Reading, drafting, and inference do not authorize sending or posting.
- Apple Developer enrollment/signing was not active at the last confirmed handoff. Discover current availability without seeking or exposing secret values.
- Paid subscription, mobile expansion, educator grading, degree-audit scraping, arbitrary generated application code, and reinstating the deleted self-rewriting pipeline are out of scope.

### Operating

- Stay on `phase1-productname-pivot` for all commits, pushes, pulls, and rebases. Do not check out `main` to apply product work, and do not push, pull, merge, or rebase involving `main` or `origin/main`.
- Inventory the dirty checkout before starting. It may already contain in-progress docs and `templates/USER.md`. Do not revert, overwrite, or commit Jacob's uncommitted files unless he asks.
- `ProductName` is still a placeholder. Do not invent and ship a brand.
- `templates/USER.md` still conflicts with preview-only submission policy. Correct the seed for future profiles; do not silently rewrite existing students' files.
- Invitation and revocation mechanics may be prepared. Do not email, message, or otherwise contact classmates. This prompt is not permission to charge accounts or publish.
- Use a synthetic user root and synthetic course material for the build. Do not read private student inboxes, tokens, browsing profiles, or course records for coding context. Student-session boot instructions about syncing a missing inbox are not a reason to trigger personal Canvas synchronization. Credentialed verification is a separately identified step using authorized test accounts.
- The product inference budget is not the agent's evaluation budget. Default to fixtures. Live model calls during the build need a named, bounded allowance; do not burn the $50 classmate envelope on agent tests.
- Do not create a second app outside `app/`, replace Tauri without a compared spike, or polish a design system before the local study cycle exists.

## 4. First 30 minutes

Do not spend the opening on persona cards, empty templates, or a literature review.

| Minutes | Action | Stop rule |
|---|---|---|
| 0–10 | Confirm the branch, inventory dirty files, read the core docs in §5, run the verification table in §8 as a baseline | Do not open private inboxes. Classify existing failures; do not “fix CI” by weakening assertions |
| 10–20 | Write `docs/build/student-beta/STATUS.md` with the must-ship bar, known blockers, and the first vertical-slice task. Ask only unanswered owner questions, with a recommendation | One page. No REQUIREMENTS/CONTRACTS novels and no tester-swarm directory |
| 20–30 | Start implementation on the first bounded slice: a thin launch/identity proof **or** the local study cycle, whichever unblocks classmate value sooner given current blockers | Packaging research may continue in parallel. It cannot block the local cycle if signing or hardware is absent |

Then keep going through integration, audit, and repair of work you can actually complete.

## 5. Context packet

Read these files in the checked-out repository; do not rely on this prompt's summaries alone:

1. `AGENTS.md`, applicable nested agent instructions, and `skills/_SESSION.md`.
2. `docs/handoff/student-beta-2026-09-17.md` — current product decisions, beta scope, release evidence, open questions.
3. `docs/research/study-session-5-10min-evidence-spec-revised.md` — consolidated proposal, six sessions, state/privacy/provider contracts, limits.
4. `docs/research/study-session-revision-closure-matrix.md` — what is closed as a specification, what remains conditional.
5. `docs/research/funded-ai-access-2026-09-17.md` — funded relay recommendation and alternatives.
6. `docs/architecture.md`, `docs/handoff/pre-ship-decisions.md`, and `vendor/README.md` — implementation map, decision history, upstream boundary.
7. Current manifests, lockfiles, CI workflows, and the implementation seams in §6.

Load supporting history only when a decision touches it: the earlier study-session spec, review, research prompts, and validation report; `docs/research/fixtures/study_session_reference.py`; `docs/handoff/canvas-focus-pivot-2026-09-11.md`; `docs/design/study-optimizer-architecture-2026-09-13.md`; `docs/design/learning-profile.md`; `docs/research/engagement-mechanics-fit-audit.md`; `docs/handoff/audit-2026-09-15.md`; `docs/handoff/pre-ship-human-walk.md`; `docs/handoff/degree-planning-scope-2026-09-13.md`; relevant skill, connector, packaging, and school-registry files.

Interpretation order: current explicit user instructions; confirmed current product decisions; applicable repository instructions; accepted architectural decisions; research proposals; historical snapshots. Distinguish authority over **what is wanted** from evidence of **what exists**. Executed behavior establishes implementation status; no document's “implemented” heading replaces inspection and tests. If two authoritative constraints genuinely conflict, state the conflict and seek the narrow decision needed while continuing independent work.

Two reconciliations are already known:

- September 17 reopened UX and distribution preparation. Old “shell parked / packaging not yet” language is historical, not a permanent ban. This does not mean an installer is ready or authorize publishing an untested release.
- The research assignment's “research only, no code changes” governed that earlier task. This prompt asks for implementation. Preserve its product/data boundaries, not the obsolete task limitation.

The earlier validation report concerns an older draft. The latest revised spec replaced contradictory exposure and scheduling rules. Its research reference passed 38 synthetic assertions when authored; that does not establish production correctness or mean it should be copied into the product. Re-run and critique it as useful input, then test the actual implementation independently.

## 6. Starting architecture and known seams

Default direction: a local desktop application with React presentation, Tauri native boundary, reusable local study/planning core, per-student storage, and a small paid-inference relay. Resolve runtime packaging on evidence; do not rewrite the Python/JS core into Rust merely to remove a runtime without comparing migration cost, distribution size, security, and maintenance.

| Surface | Starting evidence / architectural question |
|---|---|
| `app/src/App.tsx`, `components/ReviewSession.tsx`, `Onboarding.tsx`, `Top3Sticky.tsx`, `ipc.ts` | Real student workflow versus route-only status and self-score controls; view/IPC separation; useful first-run behavior |
| `app/src-tauri/src/{daemon,inbox,commands,main,dock}.rs` | Installed resources versus CARGO_MANIFEST_DIR/system Python/npm; profile identity; command trust boundary; lifecycle and cancellation |
| `app/src-tauri/{tauri.conf.json,capabilities,permissions}` | Fixed small always-on-top window and null CSP were observed; redesign workspace and assess security from actual requirements |
| `src/canvas_mcp/core/{user_root,learn_loop,progress,learning_profile,prompt_assembly,llm_provider}.py` | Reusable product logic despite vendored package path; clock gate, projections, prompt minimization and provider contract |
| `browser/scripts/`, `browser/tests/`, school registry | SSO-backed REST sync, authentication expiry, per-profile browser state, source provenance and packaged browser/runtime requirements |
| `mcp-servers/common/{google_oauth,actuator}.py`, `gcal/`, `gmail/` | Existing OAuth/confirmation seams; product-owned auth, secure credential lifecycle; Outlook is not established by Gmail plumbing |
| `skills/`, `templates/`, `plugins/` | Useful behavior may still depend on an external agent. Translate the required journey into actual app/core execution rather than only editing skill prose |
| `.github/workflows/`, `tests/`, manifests/lockfiles | Actual test coverage, supported versions, nonblocking scans and gaps in UI/native/install validation |

Preserve upstream attribution, licensing, and CHANGELOG identity. `src/canvas_mcp/core/` contains real product logic; treating the entire tree as untouchable upstream is as misleading as rewriting upstream history. Keep feature changes bounded and documented.

For study state, preserve the existing invariant that early/same-session outcomes cannot advance delayed evidence. The revised spec deliberately differs from some legacy scheduling semantics; resolve the new-versus-old authority explicitly. Choose one state transition authority, a recoverable event history/projection strategy, and a versioned migration. Evaluate a transactional local database versus file-based event logging if warranted; neither storage technology is prescribed by the research.

The research reference's exposure/clock predicates and fixtures expose failure modes. They do not implement transactions, log replay, all exam parsing, IPC security, or a shipping application.

## 7. Phased execution arc

Treat these as dependency-aware defaults. Split or reorder them with a reason. Preserve phase-by-phase acceptance and a final integrated audit of whatever was actually built. Identify signing, OAuth registration, provider access, and target hardware early so their lead times do not surprise supporting phases.

### Phase 0 — ground truth, then build

**Research:** reconcile document authority, inspect actual paths and current tooling, identify stale product claims and recent platform constraints.

**Build work:** inventory the dirty checkout, map the real student journey, record baseline commands/results, write STATUS.md and a short acceptance map for the must-ship bar. Identify external dependencies and ask only unanswered consequential questions; continue work that does not depend on them. Define the first end-to-end synthetic scenario.

**Acceptance:** a newcomer can identify what exists, what is proposed, the next task, and how success will be demonstrated. Existing test failures are reproducible and classified. Cap this phase; the first 30 minutes in §4 already include it. Proceed into implementation in the same turn.

### Phase 1 — installed runtime, identity, and data foundations

**Research:** current Tauri sidecar/resource packaging options, Python/Node/browser runtime bundling versus alternatives, OS application-data paths and credentials, SSO session isolation, update/data migration behavior.

**Build work:** choose an installed runtime contract; replace checkout-relative execution and developer-only profile assumptions; make identity consistent across Rust, Python, and JS. Establish versioned local storage and safe profile migration/backups where actually implemented. Bundle required resources/runtime without owner data or secrets. Give failures useful recovery paths. Make a thin packaged proof that launches and invokes local core logic before polishing the whole UI.

**Evidence:** relocated installation without the repo or system Python/Node/npm; multiple synthetic profiles with separate files/tokens/browser states; paths with spaces/Unicode; missing resources, permissions failures, and interrupted startup; platform-specific results. A PATH simulation is useful but is not a fresh-machine test. If hardware/signing is absent, keep the distinction visible and proceed with Phase 2.

### Phase 2 — first useful study cycle, fully local and deterministic

This is the product. Supporting phases may be incomplete; this one may not be hand-waved.

**Research:** re-evaluate the revised session contract, source/checker scope, event transaction/replay options, timing rules, and migration. Challenge known contradictions and usability costs rather than assuming “closed as specification” means proven.

**Build work:** source/import → course/exam/objective choice → learn or review → actual answer → supported feedback or abstention → saved follow-up. Start with synthetic deterministic material and enough realistic permitted source handling to serve a new profile. Build neutral provenance, solution-hidden review, help/reveal, recoverable drafts, explicit assessment/evidence distinctions, source versioning, disagreement and correction handling. A local self-check is labeled as such.

**Evidence:** all six research walkthroughs traced against actual behavior, then adversarial variants. Cover prior exposure, hint/reveal, first encounter versus delayed retrieval, starting early/finishing due, source changes, new session after reveal, crash/resume, later clean retrieval, duplicate submissions, corrections after later valid work, unknown assistance, and source ambiguity. Build tests that would fail under the old permanent-exposure-lock and early-advancement bugs.

**Acceptance:** a new student with a locally available permitted source/key packet can complete a useful cycle without a cloud model or external agent; empty or unsupported sources produce honest import/recovery paths. State survives restart and claims remain honest. This is the first complete vertical slice, not a set of disconnected components.

Do not create journey-coverage files or a tester roster until this slice runs.

### Phase 3 — Canvas sources and planning connected to study

**Research:** current SSO/REST/session-expiry behavior, minimal source acquisition, provenance and exam-date uncertainty; distinguish supported API work from student-operated LTI tools.

**Build work:** connect authentic read/sync pathways to the app, display stale/failed sync honestly, preserve source timestamps/IDs and account isolation. Wire useful task/brief execution rather than only routing messages. Connect exam/objective selection to relevant material; use source-backed versus inferred labels. Reconcile moved/cancelled/multiple exams without rewriting evidence. Handle missing sources and no-cache first-run paths.

**Evidence:** synthetic Canvas fixtures plus authorized credentialed read-only smoke when available; empty account, expired session, partial sync, duplicate sync, account switch, unknown dates, and unsupported external tools. Credentials unavailable means live verification pending, not “Canvas connected” based on a mock.

### Phase 4 — coherent desktop experience and accessibility

**Research:** study-workspace versus optional-dock interaction, novice/near-exam entry, appropriate accessibility requirements and actual framework support. Review motion/character ideas for cognitive burden without claiming learning efficacy.

**Build work:** stable Study/Plan/Sources/Settings navigation or a better coherent arrangement; first-value onboarding; source/course/exam selection; why-this-work explanation; readable practice/editor/feedback; theme presets and reduced motion; complete loading/error/empty/quota/resume states. Keep implementation jargon out of student flows. Wire real behavior before evaluating polish.

**Evidence:** interaction tests plus running-app inspection at representative sizes, keyboard-only paths, focus after navigation/errors, screen-reader semantics, hidden-answer accessibility, zoom/reflow/contrast, reduced motion, and long content. Document screenshots or recordings where useful, using synthetic material. Compilation and attractive screenshots alone do not demonstrate task completion.

### Phase 5 — funded AI, grounding, and service privacy

**Research:** current approved model IDs, exact endpoints, structured output, billable thinking/output semantics, rate limits, retries, provider retention, relay hosting behavior, alternatives from the funded-access comparison. Resolve the conditional Gemini cost bound or keep that configuration ineligible for bounded dispatch.

**Build work:** authenticated invitation access; server-held vendor secrets; a narrow provider-neutral request/response contract; minimal local context selection; robust schema/refusal/truncation handling; usage reporting; no-content service logging; per-tester/global atomic reservations and reconciliation; bounded preparation/generation/hints/retries/fallback; revocation; local pending/recovery states. Disable hidden SDK retries or account for every dispatch. AI feedback remains provisional outside validated grading scope.

**Evidence:** deterministic provider fixtures plus only separately authorized bounded live checks. Race concurrent budget admissions; retry after uncertain billing; cancel before/after dispatch; missing usage; price change; abuse of client caps/model IDs; refusal/malformed output; out-of-order responses; lost response after successful billing; revoke during request. Scan builds for vendor secrets. Seed canaries through logs/DB/cache/queue/APM/crash paths including derived summaries. Provider retention is disclosed, not controlled by our service's policy.

**Acceptance:** the app has usable feedback with honest failure behavior; actual budget/privacy claims match tested controls. No website copy says “hard cap” or “no storage” merely because a counter and a configuration file exist.

### Phase 6 — Google Calendar and Outlook email

**Research:** official OAuth/system-browser/native-app flow, exact account types and tenant consent, least permissions, local credential storage, disconnect/revocation, and provider policy. Resolve Outlook audience only when needed; design account-type-aware seams without guessing the owner's answer.

**Build work:** connect/disconnect and authenticated read state; expiry/recovery; minimal local connector records and selected-context inference; per-action write confirmation for any supported authorized write. Keep Outlook email distinct from Outlook calendar. Reuse useful connector plumbing without presenting dry-run data as real results.

**Evidence:** auth denial/timeout/callback replay/account mix-up, revoked/expired credentials, multiple profiles, disconnect cleanup, canary nonleakage, and derived-content handling. Test that a changed or stale write preview cannot authorize a different action. Live provider registration/consent remains a named blocker if unavailable; deliver the rest and do not silently remove the integration from beta scope.

### Phase 7 — installers, delivery surface, and operational readiness

**Research:** current signing/notarization/update requirements for target OS/architecture, runtime distribution licensing, secure download/update practices, recovery options, and actual hosting constraints.

**Build work:** reproducible installer artifacts; application identity/versioning; explicit supported-platform matrix; a small product/download/support/privacy website or prepared static build; invitation/revocation operations; actionable first-run diagnostics; data-preserving update/rollback strategy. Verify optional extension independence. Prepare release assets and commands even when credentials block signing or publication.

**Evidence:** install/launch/login/sync/study/close/resume/update/uninstall on the actual supported targets using fresh synthetic profiles. Verify local data location and retention behavior, architecture-specific bundled binaries, tamper/failure recovery, missing runtime errors, and artifact contents. Publish only genuinely available verified downloads; do not place a placeholder installer behind a working download button.

Actual purchase, account enrollment, production deployment, invitations/messages, signing with private credentials, and public release remain owner-gated.

### Phase 8 — independent whole-product audit and remediation

**Research:** revisit newly introduced risk and current security/dependency findings, not a fresh broad redesign. Have the auditor derive scenarios from the acceptance map and student journey independently of the builders' test names.

**Audit:** run the journey-coverage set in Appendix B against the integrated candidate. Combine first-use and return journeys with independent technical investigation. Exercise clean-install first value, ordinary return use, no-cache/offline states, all six study scenarios, privacy/data ownership, budget concurrency, authentication/identity, confirmations, accessibility, source/model uncertainty, update/recovery, and every advertised platform/integration. Inspect architecture for duplicated truth, hidden external-agent dependencies, dead routes, mocks masquerading as integration, and permissive error paths.

**Repair cycle:** record reproducible findings, assign owners, fix causes, add discriminating regression coverage, re-integrate, and rerun affected and broader checks. Reaudit material boundary changes; one fix can invalidate earlier evidence. Close findings with proof rather than “addressed” labels. The architect signs the final integration claim only after reviewing the evidence.

End with a truthful result: locally verified build, credentialed integration verified, distribution candidate verified, or external release blocker remaining. Do not collapse those stages into “beta ready.” If a release-blocking issue remains fixable with available access, continue fixing it.

## 8. Verification strategy

Start by reading current manifests/workflows and use their supported toolchain. At prompt preparation, these commands/configurations exist:

| Surface | Baseline checks / caveat |
|---|---|
| Python | Project supports Python >=3.10; CI tests 3.10–3.13. Use the project's resolved environment, e.g. `uv run python -m pytest tests/ -q`; `ruff check src/ tests/`; `mypy src/`. Confirm dependencies/versions before running |
| Browser sync | In `browser/`: install from lockfile as appropriate, then `npm test` (`node --test tests/*.test.mjs`). Live sync is separate credentialed validation |
| Frontend | In `app/`: `npm run build`. There was no frontend test script/framework in the inspected manifest: add a suitable interaction/E2E harness when implementing the UI rather than pretending `npm test` exists |
| Native | In `app/src-tauri/`: `cargo check --locked` matches current macOS CI. Run `cargo test --locked` where applicable and add meaningful Rust integration/native lifecycle checks; cargo check is not an installed-app test |
| Packaging | In `app/`: `npm run tauri -- build`, after resolving packaging/signing prerequisites. Inspect the actual artifact and run installed-app checks; successful bundling alone is insufficient |
| Research model | `python3 docs/research/fixtures/study_session_reference.py`; useful regression ideas, not application integration evidence |
| Security | Existing `tests/security/`, dependency/secret scanning and workflow definitions. Some scans use `continue-on-error`; job success does not establish their findings were resolved |
| Hygiene | `git diff --check`, new-file checks, changed contract/docs consistency and final integrated diff review |

Record actual invocation and results, not just this table. A missing tool is an environment finding: install/use the declared environment when authorized or document the precise limitation. Do not switch to an arbitrary runtime, skip a failing check, or lower assertions just to obtain green. Diagnose unrelated baseline failures and separate them from regressions without using that distinction to excuse a release-critical issue.

Use risk-proportional tests:

- Pure logic: scheduling, exposure eligibility, bounded grading, state transitions, calendar arithmetic, idempotency, and corrected-event replay.
- Property/model-based tests where useful: no duplicate success, no early/exposed promotion, no accidental past new date, finite selection, stable replay, budget conservation under interleavings.
- Contract/integration: Rust↔Python↔JS identities and payloads; source version/locator resolution; profile migration; relay/provider usage semantics; connector confirmation state.
- Fault injection: partial write, uncertain commit, disk full, crash between submit/feedback, stale version, malformed IPC/provider data, stream interruption, clock jumps, inaccessible resource, timeout/cancel, and concurrent retries.
- UI journeys: first-value setup, actual attempt, help/reveal, grade uncertainty, source repair, recovery, navigation, and accessibility.
- Installed-system tests: fresh profile and machine, external runtime independence, real authorized login/read, supported OS/architecture, update/rollback.
- Privacy/security: synthetic canaries, secrets in distributables, input/IPC trust boundaries, path traversal, untrusted source instructions, logging/error paths, auth revocation, and profile isolation.

Prefer tests that can distinguish a wrong implementation from a right one. Do not copy the reducer into the test or reuse the same helper to compute expected results. Derive key expectations from independent fixtures; retain at least one regression demonstrating each important audit-discovered defect.

Keep software correctness, usability, and learning efficacy separate. Working code and satisfied testers do not prove exam improvement. Human studies and expanded outcome collection are not implicit in “thoroughly tested.”

## 9. Research loop, decisions, and blockers

Before a phase's main implementation, investigate only the uncertainties that could change its design: correctness, student usefulness, privacy, cost, platform feasibility, or operational risk. Inspect existing code and tests first. Search current official sources for unstable technical claims (APIs, packaging, OAuth, pricing, retention, limits). Use learning studies for learning claims, not vendor marketing. Compare alternatives only where a decision is real, including doing less. Return a short note: question, dated sources and access limits, findings, proposed choice, contrary evidence, engineering cost, effect on contracts/privacy/budget, and a discriminating test. Stop when additional search is unlikely to change the next decision. If evidence is weak, name the uncertainty and use a reversible conservative design. If internet access is unavailable, label current-source verification pending; do not turn remembered prices or policies into verified facts.

Change test for any proposed improvement:

- What concrete problem does the current design cause?
- What improves for the student or maintainers?
- What new assumptions, migration, risk, or recurring cost appear?
- What observable comparison would distinguish the options?
- Can the improvement be isolated and reversed?

For a local reversible choice within scope, the architect can decide and proceed. For a foundational change, build a bounded spike, compare evidence, and document the decision before broad migration. For a product commitment or externally consequential action, ask Jacob only for the actual unresolved decision. Do not use “research found a better way” to bypass the privacy promise or quietly cut a desired feature.

Ask Jacob early only when an answer changes consequential scope, authorization, or an otherwise unresolvable dependency. Bundle related questions and supply a practical recommendation. Known open questions: Outlook account audience; whether $50–$100 includes hosting/fees; currently available signing, provider, and OAuth accounts; available clean-machine test targets. Do not request secret values in chat.

An architect's technical approval is not a user's authorization for spending, external writes, or data-policy expansion. A normal reversible module design, test harness choice, bug fix, or local packaging experiment does not require repeated user permission.

A blocker report names: the exact remaining action, why current access cannot perform it, evidence of attempted safe alternatives, what is already complete, affected acceptance rows, and the smallest input that unblocks it. “Needs testing” or “credentials missing” without naming the test, account, or config is not enough. A mocked integration can support development while the live result stays pending.

If a runtime cannot persist indefinitely, checkpoint before context/tool limits and provide a specific resume action. This prompt does not authorize fabricated background work or claims that an unattended agent will keep running after execution ends.

## 10. Completion and final handoff

The finish line is an integrated build with the must-ship bar traced to verified behavior, supporting work completed or explicitly blocked, and an independent audit whose actionable release blockers are resolved or explicitly external.

At handoff, provide:

1. What the student can now do, with a short reproducible walkthrough against the must-ship bar.
2. Architecture and material improvements over the initial proposal, including rationale and migrations.
3. Exact tested revision and artifact identity/checksum where an installer exists; commands to reproduce builds and tests.
4. Verification summary: passed, failed, skipped, unavailable, and not applicable, with the reason for each material gap. Include real platform/integration status.
5. Audit findings, fixes, and regression evidence; journey coverage, observed runs, and retests; remaining risks and their effect on release. Distinguish simulated-user findings from actual human feedback. Label actual UI runs, semantic inspection, fixtures, and native-app tests distinctly.
6. Data/privacy/provider-retention and budget behavior actually established, distinguished from configured intentions.
7. Installer/local launch instructions, operational recovery/rollback, and concrete remaining owner actions if any.
8. Updated STATUS, decisions/contracts, acceptance map, and release-readiness record so another agent can continue without guessing.

Do not conclude with an offer to implement work already within this mission. Execute §4, then the next unfinished phase, and keep going through integration, audit, and repair.

---

## Appendix A. Working team

Use actual subagents when the runtime supports them. If it does not, perform the roles sequentially with separate written critiques. Do not fabricate independent agents, reviews, or parallel execution. Collapse roles unless a contract boundary actually needs a second owner. Avoid recursive delegation; the architect remains the single integration authority.

| Role | Own | Default staffing |
|---|---|---|
| Coordinating architect | Journey, contracts, integration branch, acceptance map, completion claims | Always; reviews artifacts and verification, not confidence statements |
| Phase/domain lead | One coherent subsystem and its contracts; may build directly | Staff only for the active phase. Combine domains for small work |
| Research scout | Highest-consequence uncertainties before committing a design | Re-enter if findings invalidate assumptions; not a standing literature reviewer |
| Builder | Bounded outcomes, owned files, meaningful checks | Raise contract changes before silently modifying another surface |
| Independent auditor | Requirements, code, running behavior, failure cases, test adequacy | Prefer someone who did not author the work. Label self-review honestly |

Candidate domains, not concurrent departments: runtime/identity; study state/grounding; desktop experience; funded AI/privacy; connectors/authentication; release/quality.

With four concurrent slots, a practical arrangement is architect + phase lead/builder + researcher + auditor. During journey-testing waves, reuse slots for testers and run coverage in batches. Multiple models can be valuable for independent critiques. Agreement is not correctness, model reputation is not evidence, and a majority vote is not an acceptance test.

Choose worktrees/branches for independent mutations when possible. In one checkout, keep a short ownership map and serialize overlapping edits. Each task reports its base revision, touched paths, changed contracts, tests, and integration instructions. Re-run affected checks on the integrated revision: passing tests in a child's branch do not certify the final build.

Worker packet and phase handback (keep short):

```text
Task / phase / student-visible outcome / requirement IDs:
Base revision / contracts / owned surfaces:
Allowed actions, synthetic data, unresolved external dependencies:
Evidence actually produced:

Handback: what changed and why; files/contracts; tests and revision;
student-journey demonstration including failure recovery;
audit findings; remaining risks; accept / revise / split / investigate.
```

After a context reset, read STATUS, active decisions/contracts, and relevant diffs, then continue the next unfinished action. Do not restart completed research, overwrite other work, or claim an old audit covers a new revision.

## Appendix B. Journey coverage, not a cast of characters

Adversarial first-use is valuable. Ten named personalities with hobbies are not. Coverage objects are journeys and conditions. Interests must not rewrite the student's course packet into climbing, robotics, or journalism material. Do not infer a learning style from a passion. Accessibility configurations are test conditions, not evidence that an agent reproduces a disabled person's lived experience. Use actual assistive tooling where available and label semantic inspection separately when it is not.

Do not create a tester-swarm directory or persona cards until Phase 2 has a running slice. Then run targeted waves on that slice, repeat them after substantial interface/state changes, and run the full set against the final integrated candidate.

| Journey | Starting condition | Distinctive probes |
|---|---|---|
| Five-minute first use | Fresh profile, no cache, no API keys | Skim onboarding, first plausible control, exit and return. Can they find worthwhile work without learning the app? |
| Wrong key / equivalent expression | Deterministic item with a supported key | Challenge a wrong key, supply an equivalent form, dispute feedback. Can the product admit uncertainty and repair history? |
| Essay nuance | Open prose and a rubric | Alternative defensible claim, oversimplified explanation, model-grade abstention. Does feedback stay within task limits? |
| Permission decline | Optional analytics or account connect | Decline, disconnect, inspect disclosures, check account identity against records |
| Missed week / exam tomorrow | Sparse history, near-term exam | Manageable next step, skip or interrupt, resume without shame, lost work, or inflated learning claims |
| Keyboard / reduced motion / hidden answers | Keyboard-only, reduced motion, long content | Focus, commands, duplicate submit, zoom/reflow. Are hidden answers actually hidden? Label VoiceOver/screen-reader claims only if the tool ran |
| Interrupt / offline / expired login | Mid-feedback failure, sleep/wake, stale session | Draft preserved; pending distinguished from complete; expired login recoverable |

How a tester operates:

1. **Explore as a user first.** Launch the installed app when available, or clearly identify the development build. Use real visible controls. Do not secretly repair state via APIs, inspect source to find an invisible control, or bypass a broken screen and then claim the journey succeeded.
2. **Behave like the condition, not a cooperative copilot.** Include mistaken clicks, hesitation, changed intentions, partial answers, and leaving unfinished work where natural.
3. **Observe outcomes.** Record task completion, wrong turns, confusing copy, lost work, trust failures, and recovery attempts. Measure clicks/time only when tools actually capture them. No invented emotion, satisfaction score, or elapsed time. Separate observation from inference.
4. **Investigate after the journey.** Preserve reproduction steps, then trace UI → IPC → local state → provider/connector. A code-backed hypothesis does not replace interaction evidence.
5. **Retest fixes** on the repaired integrated build, plus an adjacent journey and a fresh first-use pass when prior knowledge would hide the issue. Convert consequential defects into regression tests where practical.

If real UI control, a supported OS, assistive technology, or an installed artifact is unavailable, report that limitation and use the strongest available substitute. Never invent a click-through run or claim a native app was tested because its web preview worked.

Run agents concurrently only where independent app instances, profiles, and state exist. A shared desktop may require serial UI runs. Give each tester a separate synthetic user root and an immutable build reference. Do not let testers race over one keyboard, mutate a shared profile, incur unapproved model spend, contact real people, or execute real external writes as role-play.

Compact report:

```text
Journey / starting condition / input-network:
Build revision; actual interaction tools used:
Starting synthetic state and student goal:
Observed actions and visible outcomes:
Where it completed, stalled, misled, or lost work:
Reproduction; expected versus actual; observation versus inference:
Suggested change and tradeoffs; technical trace; retest result:
```

Keep minority, accessibility, and privacy failures visible. Do not vote them away because most journeys did not hit them. Preserve good friction that protects student control.

This method discovers engineering problems. It is **not** a substitute for real student usability research or evidence of learning gains. Reports and release claims must identify agent simulations. Journey variety does not manufacture independent human participants.

## Appendix C. Build record

Suggested location: `docs/build/student-beta/`. Existing equivalent records may be reused. Keep it concise, current, and free of student data/secrets. Create files when they have content; do not scaffold empty novels in Phase 0.

- **STATUS.md** — required from the first 30 minutes. Active phase/task, current revision, completed evidence, immediate next action, blockers, links to detail. Re-entry point after interruption.
- **REQUIREMENTS.md** — journey and requirement IDs, source/authority, acceptance behavior, implementation status, tests, release relevance. Create once the must-ship acceptance map exists.
- **DECISIONS.md** — material choices with rationale, alternatives, consequences, and reversal/migration. Write when a decision is real.
- **CONTRACTS.md** — profile/root resolution, IPC, source/item/attempt schema, event/replay, model/relay boundary, auth/connector state, error taxonomy. Version only where it solves compatibility.
- **PHASES/** — short combined notes, not empty templates per phase.
- **JOURNEYS/** — coverage matrix, observed interaction evidence, findings, and retests; never real student data. Not before a running Phase 2 slice.
- **RELEASE-READINESS.md** — tested artifact/revision/platform, complete/pending/blocked checks, residual risks, truthful readiness status.

Keep facts labeled as observed, proposed, implemented, tested, or externally blocked. Historical success is dated. Test records include command, working directory, environment, exit/result, relevant skips, and revision/artifact. Link detailed logs rather than dumping them into every agent's context. Never commit test evidence containing credentials or real course/email content.
