# Release readiness — 2026-09-18 (end of this build session)

**Status: locally verified build. Not a distribution candidate.**

Tested revision: working tree on `phase1-productname-pivot` @ `7c73fb8` + uncommitted changes (this session; see `git status`). Native artifact: `~/.cache/productname-build/app/src-tauri/target/release/bundle/macos/ProductName.app` (arm64, unsigned, ad-hoc identifier, **no runtime staged** → reports `broken` by design).

| Check | Result |
|---|---|
| Python unit/integration (core, study, relay, connectors) | 847 passed, 20 skipped |
| Lint / types | ruff clean; mypy clean (74 files) |
| Browser sync unit | 92 pass |
| Frontend build + Vitest | build OK; 11 tests pass (incl. real-core contract) |
| Rust unit + Rust↔Python round trip | 8 pass (mirror) |
| Unsigned .app bundle | builds; resources resolve; fails closed without runtime |
| Dev walkthrough in browser against the real core | import → offer → learn → answer → feedback → reload/resume → Canvas fixture import → authored item → answer; first-run keyboard path; four themes; phone width |

## Complete
- Study journey, six spec sessions, corrections, exam handling, versioned packets, audit repairs.
- Canvas material pipeline (script + import + authoring), fixture-tested.
- Relay service + client with fault matrix.
- Connector flows with fake transports; persisted confirmation.
- Workspace UI, first-run, themes, accessibility basics.

## Pending / blocked (owner inputs)
1. **Runtime staging:** download python-build-standalone (3.12, `install_only`, arm64) and Node LTS tarballs; run `scripts/stage-runtime.sh`; rebuild; then the fresh-machine install/launch/sync/study test.
2. **Signing/notarization:** Apple Developer enrollment not active → unsigned bundle only; Gatekeeper will block classmates' installs.
3. **Live Canvas:** run `cd browser && npm run sync-sources` with an authorized test account; verify pages/syllabus/assignments and exam inference on real data.
4. **Relay deployment:** host with TLS, `ANTHROPIC_API_KEY`, `RELAY_ADMIN_TOKEN`; run the canary scenarios against the deployed instance; only then say "our service does not retain".
5. **OAuth registrations:** Google installed-app client secrets; Microsoft Entra public-client app id (`MS_OAUTH_CLIENT_ID`); then live connect/consent tests for a CU-managed and a personal account.
6. **Windows:** not built; runtime.rs has Windows paths but nothing was executed.
7. **Screen reader / human usability:** not performed.

## Residual risks
- Learning efficacy is not established by any of this; labels are bounded on purpose.
- Legacy Plan surface (`learn_loop` self-scored checks) coexists with the study authority; it is separate and never earns delayed credit, but two due-lists can confuse a tester.
- Expression checker accepts only listed spellings; an unlisted equivalent form is graded incorrect (the key is shown; "disagree" records uncertainty).
- Dev bridge is dev-only but exists in the repo; it is never started by the app.
