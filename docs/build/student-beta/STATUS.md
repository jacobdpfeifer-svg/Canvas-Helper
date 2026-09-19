# Student beta build — STATUS

Re-entry point. Read this, then DECISIONS.md / CONTRACTS.md, then PHASES/.

- **Branch / base revision:** `phase1-productname-pivot` @ `7c73fb8` (dirty checkout preserved).
- **Architect:** the executing agent (Claude Opus 5, 2026-09-18). Roles performed sequentially; independent audits noted below.

## Parallel-agent situation (2026-09-18 ~12:00–13:30)

A second agent worked in this same checkout while this build was running. It
snapshotted this build as **candidate A** at 11:39, built an independent
**candidate B** (SQLite study engine, single-file React workspace, narrow
native bridge, offline relay prototype), ran an auditor over both, and began
copying B into the checkout (deleting A's frontend/tests) but did not finish.

Preserved, committed, diffable:
- `git worktree` `~/.cache/productname-cand-a` → branch `candidate-a` (this build at 11:39)
- `git worktree` `~/.cache/productname-cand-b` → branch `candidate-b` (B, plus `docs/build/student-beta/{audit-a,audit-b}.md`, logs)
- `_candidate-b-integration/` (gitignored) — the exact files B had placed in this checkout

The checkout was restored to candidate A (this build) at 16:15 so work could
continue coherently. **Owner instruction:** continue this build, then compare
both and wire in the better code per subsystem (see PHASES/comparison.md when
written). Audit A's confirmed defects are being fixed in this build first.

Owner clarifications recorded by the other agent (to confirm with Jacob):
Outlook = CU-managed **and** personal; budget $50 **inclusive** of fees; no
Apple enrollment / Google-Microsoft OAuth registrations / clean Mac available
now — live verification deferred.

## Baseline (observed, this machine)

| Check | Command | Result |
|---|---|---|
| Python | `.venv/bin/python -m pytest tests/ services/relay/tests -q` | 847 passed, 20 skipped |
| Lint / types | `.venv/bin/ruff check src/ tests/`; `.venv/bin/mypy src/` | clean |
| Browser sync | `cd browser && npm test` | 92 pass |
| Frontend | `cd app && npm run build`; `npm test` (Vitest + Testing Library) | build OK; 11 tests pass |
| Native | `scripts/native-mirror.sh cargo test --locked`; `… npm run tauri -- build --bundles app` | 8 pass; unsigned .app builds (non-iCloud mirror, DECISIONS D-09) |
| Research ref | `python3 docs/research/fixtures/study_session_reference.py` | runs |

Tooling: `node`/`npm`/`uv`/`cargo` in `/opt/homebrew/bin` (not on the default PATH); Rust 1.98.1 installed via Homebrew this session.

## Now

Build session complete through Phase 8. See RELEASE-READINESS.md (status:
locally verified build, not a distribution candidate) and COMPARISON.md (per
subsystem decision vs candidate B; adopted parts wired in).

## Next action

Owner inputs (RELEASE-READINESS.md §Pending): stage the runtime tarballs and run
the fresh-machine test; decide on signing; provide relay hosting/keys and OAuth
registrations; then live Canvas/relay/connector verification.

## Blockers / owner questions

- Signing/notarization, OAuth registrations, hosting, provider keys: not available → live checks pending.
- Runtime bundling needs python-build-standalone + Node downloads (not yet fetched).
