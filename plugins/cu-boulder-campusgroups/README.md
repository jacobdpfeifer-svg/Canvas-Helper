# CU Boulder — CampusGroups plugin

Conditional school plugin. Loaded only when `SCHOOL_SLUG=cu-boulder`.

**Bucket A** connector (administrative RSVP / engagement). Registered in
`browser/scripts/lib/connector-registry.mjs` as `cu-boulder/campusgroups`.
Contract: [`plugins/README.md`](../README.md).

Scripts (also thinly re-exported from `browser/scripts/` for npm run):

- `open-campusgroups.mjs`
- `rsvp-campusgroups.mjs` / `rsvp-dinner.mjs` / `rsvp-ai-lab.mjs`
- `sync-coen-dinners.mjs` / `sync-coen-ai-labs.mjs`

Uses shared `browser/.auth` Playwright profile. IDE browser has no SSO.

Write-capable actions today are Playwright RSVP CLIs (student confirms in the
terminal). This is an **explicit student-operated escape hatch** — running RSVP
registers the student on CampusGroups (visible externally). Keep for CU private
beta; product call before public ship is keep-as-escape-hatch vs remove (see
[`docs/handoff/deferred.md`](../../docs/handoff/deferred.md)).

Any future MCP write tool for this connector that is **student-private** must use
`canvas_mcp.core.connector_guards.get_connector_guard("cu-boulder/campusgroups")`
(ConfirmationGuard preview → confirm). Do not add an execute path for actions
visible to someone else (canvas-focus pivot).
