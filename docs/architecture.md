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
| Learning profile | Teaching priors YAML + USER.md render + CLI | `canvas_mcp.core.learning_profile`; onboarding UI in `app/src/components/learningProfile/` |
| Concept diagrams | Deterministic matplotlib PNGs | `canvas_mcp.core.diagram_gen` + skill `student-concept-visual` |
| Browser sync | SSO cookies → REST → inbox | `browser/` (`npm run sync`) |
| Desktop shell | Tray, dock geometry, IPC, cadence | `app/src-tauri` (`main` / `daemon` / `dock` / `commands` / `inbox`) + React `app/src/ipc.ts` |
| Sensors | Canvas-tab focus events only | `app/extension-chrome` → `app/native-messaging` → `{user_root}/sensors/` |
| Actuators | Calendar / Gmail dry-run (+ optional live OAuth) | `mcp-servers/{gcal,gmail,apple-cal}` + `common/actuator.py` |
| Plugins | School Bucket-A connectors (static registry) | `plugins/` + `browser/scripts/lib/connector-registry.mjs` |

## Explicitly stub / out of truth path

- **`app/billing/`**, **`app/mobile/`** — Phase-2 placeholders; not wired into the truth path. Ship-or-delete is unsigned — see [`docs/handoff/pre-ship-decisions.md`](handoff/pre-ship-decisions.md).
- **`src/canvas_mcp/`** — optional PAT MCP (truth-path step 4). Identity (track upstream vs ProductName-owned fork) is unsigned; `CHANGELOG.md` is still the upstream canvas-mcp history.
- **`app/telemetry/`** — opt-in Sentry helper only.
- **Educator grading / quiz-taking / hosted Azure** — permanently out of scope (see `CLAUDE.md`).

## Design docs (status)

| Doc | Status |
|-----|--------|
| [`docs/design/ambient-dock-ui.md`](design/ambient-dock-ui.md) | **Partially built** — peek/expanded/onboarding + tray; Hidden-as-default and narrate-auto-peek not yet |
| [`docs/design/learning-profile.md`](design/learning-profile.md) | **v1 built** (YAML + onboarding games + CLI); v2 research / live signal hooks still aspirational |

## CU Boulder specifics

See [`docs/schools/cu-boulder.md`](schools/cu-boulder.md) and `plugins/cu-boulder-campusgroups/`. Connector contract: [`plugins/README.md`](../plugins/README.md). Multi-tenant YAML shape is generic; only one live school (`cu-boulder`) is configured today — second-school support is unproven.
