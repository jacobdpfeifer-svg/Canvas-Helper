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
without a deliberate extra student signal. Each RSVP is two runs:

```bash
# 1. Preview — no browser, nothing registered. Prints the resolved event,
#    other upcoming matches, and the exact confirm command.
npm run rsvp-dinner -- --name "Student Name" --major cs [--date ...]
npm run rsvp-ai-lab -- --name "Student Name" --slot "Wed 2pm"   # or --event <id>
npm run rsvp-campusgroups -- --event <id> --name "Student Name"

# 2. Confirm — paste `confirmWith` from the preview after the student says yes.
npm run rsvp-dinner -- --name "Student Name" --major cs --expect <id> --confirm
```

- `--expect <id>` is required for `rsvp-dinner` and slot-matched `rsvp-ai-lab`:
  if the schedule re-synced or prefs changed since the preview, the confirm run
  resolves to a different event and is refused before a browser opens.
  `--event <id>` is already pinned, so it needs no `--expect`.
- Past-dated rows (ISO dates before today, school timezone) are never picked.
- Without `--major` / `--slot` / `--event`, the saved preference in
  `calibration/signup-preferences.md` is used only when its `Status: confirmed`.

Every run prints JSON with `outcome`, `message` (what happened), and `next`
(what the student does now):

| `outcome` | Registered? | Exit |
|-----------|-------------|------|
| `preview` | no — nothing sent | 0 |
| `confirmed` / `already_registered` | yes, verified | 0 |
| `registered_unverified` | probably (`--no-verify`) | 0 |
| `unconfirmed` | **maybe** — Register may have been clicked | 1 |
| `not_attempted` | no — stopped before CampusGroups (expired login, busy profile, no Register button, `--expect` mismatch) | 1 |

Failed runs save step screenshots under `{user_root}/diagnostics/campusgroups-rsvp-*/`
(`screenshot` in the JSON points at the last one); successful runs keep only
`run.json`. The COEN1500 registration log gets `confirmed` or `unverified` —
never `confirmed` for a skipped verification.

Any future MCP write tool for this connector that is **student-private** must use
`canvas_mcp.core.connector_guards.get_connector_guard("cu-boulder/campusgroups")`
(ConfirmationGuard preview → confirm). Do **not** add an MCP execute path for
RSVP or any other action visible to someone else (canvas-focus pivot).
