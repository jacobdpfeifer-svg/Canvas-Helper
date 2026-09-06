# Architecture — ProductName (Phase 1)

Distilled from the Phase 1 pivot plan. Product truth path for general users (per-user `{user_root}`).

## Truth path

```text
Skill router ← {user_root}/ memory ← Canvas /api/v1 ← SSO (Playwright) or PAT
```

## Layers

- **Tenant:** `schools/{slug}.yaml` via `canvas_mcp.core.tenants`
- **User root:** `canvas_mcp.core.user_root` (+ `DEV_USER_ROOT`)
- **Permissions:** `calibration/permissions.yaml` via `canvas_mcp.core.permissions`
- **Ledger:** append-only `ledger.jsonl` via `canvas_mcp.core.ledger`
- **Skills:** Anthropic/Hermes `SKILL.md` with `schema_version`; active vs provisional
- **Self-improve:** read/draft skills only — never shadow-test write skills
- **Reach:** Playwright persistent context; Chrome extension is sensors-only → daemon MCP

## CU Boulder specifics

See [`docs/schools/cu-boulder.md`](schools/cu-boulder.md) and `plugins/cu-boulder-campusgroups/`.
