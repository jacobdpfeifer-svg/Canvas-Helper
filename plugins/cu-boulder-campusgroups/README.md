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

Write-capable actions today are Playwright RSVP CLIs. This is an **explicit
student-operated escape hatch** and a documented **pivot exception** for CU
private beta: running RSVP registers the student on CampusGroups (visible
externally). Keep for CU beta; product call before public ship is
keep-as-escape-hatch vs remove (see
[`docs/handoff/deferred.md`](../../docs/handoff/deferred.md)).

Every RSVP CLI requires an explicit `--confirm` flag (not implied by
`--event`/`--name` or prefs alone) so an agent cannot fire a registration
without a deliberate extra student signal:

```bash
npm run rsvp-campusgroups -- --event <id> --name "Student Name" --confirm
npm run rsvp-dinner -- --name "Student Name" --confirm [--major ...] [--date ...]
npm run rsvp-ai-lab -- --name "Student Name" --confirm [--slot ...]
```

Without `--confirm`, the CLI exits 1 and performs no registration.
`rsvp-dinner` / `rsvp-ai-lab` still also require `Status: confirmed` in
`calibration/signup-preferences.md` (unless `--event` is given for AI Lab).

Any future MCP write tool for this connector that is **student-private** must use
`canvas_mcp.core.connector_guards.get_connector_guard("cu-boulder/campusgroups")`
(ConfirmationGuard preview → confirm). Do **not** add an MCP execute path for
RSVP or any other action visible to someone else (canvas-focus pivot).
