# Architecture — ProductName (Phase 1)

As-built map for the local-first student Canvas platform. Truth path for general users (per-user `{user_root}`).

## Truth path

```text
Skill router ← {user_root}/ memory ← Canvas /api/v1 ← SSO (Playwright) or PAT
```

## Layers (what exists today)

| Layer | Owns | Module / path |
|-------|------|----------------|
| Tenant | School registry (Canvas URL, SSO, timezone, LTI catalog) | `schools/{slug}.yaml` via `canvas_mcp.core.tenants` |
| User root | Per-student data directory | `canvas_mcp.core.user_root` (+ `DEV_USER_ROOT`) |
| Permissions | Posture + k-counters + global STOP | `{user_root}/calibration/permissions.yaml` via `permissions` |
| Ledger | Append-only automation history + undo_ptr | `{user_root}/ledger.jsonl` via `ledger` |
| Skills | Instruction bundles (`SKILL.md`) | `skills/` (+ `{user_root}/skills/{active,provisional}`) |
| Skill routing | Load + rank + CLI for Tauri | `canvas_mcp.core.skill_router` (`python -m …skill_router`) |
| Learning profile | Start bias + initiation priors (not whether retrieval happens) | `canvas_mcp.core.learning_profile`; onboarding UI in `app/src/components/learningProfile/` |
| Learn loop | Teachable claims, exam-relative reviews, delayed-hit stability. Dock session reads `--json due` and writes student-scored `outcome`. Peek shows why a check is due, a durable-retrieval health line, a non-blocking review budget, and a counterfactual pair. `evaluate` is the local outcome check (delayed reviews, delayed hits, overdue work, deadline surprises); brief continuity is exposure only | `canvas_mcp.core.learn_loop` → `{user_root}/inbox/learn/items.yaml` |
| Academic outcomes | Append-only delayed hit, corrected miss, and workflow path events. Trail and semester garden are read-only projections. Not the actuator ledger, not a streak, and not stability | `canvas_mcp.core.progress` → `{user_root}/inbox/learn/outcomes.jsonl` |
| Commitment | One opt-in appointment. Student marks started, kept, or released. No calendar write, no money, no shame. Does not change learn-loop stability | `canvas_mcp.core.commitment` → `{user_root}/inbox/commitments.yaml` |
| Brief continuity | Consecutive local days a brief was written (`write_focus`). Quiet line only — not a learning streak, no shame interrupt. Stored count is exposure, not evidence | `canvas_mcp.core.habit` → `{user_root}/inbox/habit.yaml` |
| Concept diagrams | Deterministic matplotlib PNGs | `canvas_mcp.core.diagram_gen` + skill `student-concept-visual` |
| Browser sync | SSO cookies → REST → inbox | `browser/` (`npm run sync`) |
| Desktop shell | Tray, dock geometry, IPC, cadence | `app/src-tauri` (`main` / `daemon` / `dock` / `commands` / `inbox`) + React `app/src/ipc.ts` |
| Sensors | Canvas-tab focus events only | `app/extension-chrome` → `app/native-messaging` → `{user_root}/sensors/` |
| Actuators | Calendar / Gmail — read + draft only. `create_event`/`update_event`/`send_email` are hard-blocked, no API call (canvas-focus pivot, [`docs/handoff/canvas-focus-pivot-2026-09-11.md`](handoff/canvas-focus-pivot-2026-09-11.md)) | `mcp-servers/{gcal,gmail,apple-cal}` + `common/actuator.py` |
| Plugins | School Bucket-A connectors (static registry) | `plugins/` + `browser/scripts/lib/connector-registry.mjs` |

## Explicitly out of truth path / archived

- **`src/canvas_mcp/`** — optional PAT MCP (truth-path step 4). **Vendored** upstream canvas-mcp (signed 2026-09-12). Root [`CHANGELOG.md`](../CHANGELOG.md) is upstream’s; see [`vendor/README.md`](../vendor/README.md).
- **`vendor/articles/`**, **`vendor/examples/`**, **`vendor/internal/`** — archived research / upstream notes; not the shipping product surface.
- **`app/telemetry/`** — opt-in Sentry helper only.
- **Billing / mobile** — **deleted** (signed 2026-09-12). Do not re-add Stripe/Twilio stubs.
- **Educator grading / quiz-taking / hosted Azure** — permanently out of scope (see `CLAUDE.md`).
- **`src/canvas_mcp/core/self_improve/{cluster,drafter,shadow,promoter,run}.py`** —
  deleted 2026-09-11 (canvas-focus pivot). `logger.py` and `distill.py` remain.

## Design docs (status)

| Doc | Status |
|-----|--------|
| [`docs/design/ambient-dock-ui.md`](design/ambient-dock-ui.md) | **Parked** (signed 2026-09-12) — peek/expanded/onboarding + tray as built; Hidden/auto-peek design-only. See [`handoff/ui-shell-alternatives.md`](handoff/ui-shell-alternatives.md) |
| [`docs/design/learning-profile.md`](design/learning-profile.md) | **v1 built**; start bias only. Learn loop is the teaching model (`learn_loop.py`) |
| [`docs/design/class-standings.md`](design/class-standings.md) | **Framed, not built** — optional hideable class leaderboard and class marks. Not peers, not XP |

## CU Boulder specifics

See [`docs/schools/cu-boulder.md`](schools/cu-boulder.md) and `plugins/cu-boulder-campusgroups/`. Connector contract: [`plugins/README.md`](../plugins/README.md). Multi-tenant YAML shape is generic; only one live school (`cu-boulder`) is configured today — second-school support is unproven.
