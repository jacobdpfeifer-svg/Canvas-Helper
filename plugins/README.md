# School connectors (Bucket A only)

Human-reviewed, statically versioned integrations. **Never** auto-search, fetch, or install connector code at request time.

## Buckets (from Canvas sync inventory)

| Bucket | Meaning | Automation |
|--------|---------|------------|
| **A** — read-only / administrative | Gradebook viewers, calendar feeds, syllabus tools, CampusGroups-style RSVP surfaces | Eligible **only** after a maintainer merges a connector under this tree |
| **B** — assessment-shaped | WebAssign, ZyBooks, PlayPosit, proctoring, Norton/EOC/LearningCurve, graded `external_tool` | **Hard-locked** to the LTI escape hatch (`skills/student-canvas-browser`). No connector, no config override, no “trust this tool” flag |

Discovery is read/aggregate only (`## Tools this semester` in `inbox/courses/*.md`). Missing Bucket-A tools are **flagged** in `inbox/tool-gaps.md` — maintainers decide whether to build.

## Directory layout

Prefer nested school folders for new work:

```text
plugins/{school}/{tool-slug}/
  README.md                 # what it does, auth surface, hard stops
  {tool}-session.mjs        # session/auth helpers (SSO via browser/.auth)
  sync-*.mjs / action-*.mjs # sync or student-confirmed actions
```

Legacy flat layout (still valid): `plugins/cu-boulder-campusgroups/` — register the real path in `browser/scripts/lib/connector-registry.mjs`.

Thin re-exports from `browser/scripts/lib/{tool}-session.mjs` and `browser/scripts/*.mjs` keep `npm run` entrypoints stable (see CampusGroups).

## Connector contract

Each plugin directory **must**:

1. **School-gate** — only load when `SCHOOL_SLUG` matches (document in README; registry `school` field must match).
2. **Export a session module** — auth/helpers using the shared Playwright `browser/.auth` profile (IDE browser has no SSO).
3. **Stay Bucket A** — refuse to automate assessment/proctored flows; never soft-promote a Bucket-B tool.
4. **Register statically** — add one frozen entry to `CONNECTOR_REGISTRY` in `browser/scripts/lib/connector-registry.mjs` in the same PR.
5. **Gate writes** — any MCP (or equivalent) tool that writes to / acts on the student account in a way **visible only to the student** (e.g. local prefs, self-only Canvas toggles) must use `ConfirmationGuard` via `canvas_mcp.core.connector_guards.get_connector_guard(connector_id)` (preview → fingerprint → issue → confirm → reserve). No “safe because mostly read-only” exemption on the first write-capable action. Tools whose Canvas/email/calendar effect would be visible to someone else (submit, comment, discussion post, send email, create calendar event) must stay **preview-only / hard-blocked** — do not build a ConfirmationGuard execute path for them (canvas-focus pivot).
6. **Not fetch remote code** — no runtime `git clone`, raw GitHub installs, or eval of third-party scripts.

Optional: Playwright-only actions (e.g. CampusGroups RSVP) may keep CLI confirm flags as an explicit student-operated escape hatch, but new MCP write surfaces that are student-private must use `ConfirmationGuard`. Externally-visible actions stay draft/preview only.

## Reference implementation

[`cu-boulder-campusgroups/`](cu-boulder-campusgroups/) — SSO session helpers, sync scripts, RSVP actions, shim at `browser/scripts/lib/campusgroups-session.mjs`.

## Adding a connector (maintainer path)

1. Confirm the tool appears as **Bucket A** in a course’s `## Tools this semester` (or in `inbox/tool-gaps.md`).
2. Open a PR with `plugins/{school}/{tool}/` + registry entry + tests.
3. If the connector can write: wire `get_connector_guard("{school}/{tool}")` on every write tool.
4. Merge only after review — no cross-tenant sharing before that.
