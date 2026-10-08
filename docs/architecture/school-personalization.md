# School personalization

**Status:** discovery + profile + Canvas enrichment built 2026-10-07. Curated overlays and plugins pre-date this. Items marked *proposed* need a decision.

## Principle

Kairos never assumes a school. The student's school is **found** at onboarding, then Canvas itself tells us most of what matters. A small, reviewed per-school file adds only what Canvas cannot know. Anything that claims a degree requirement still traces to the student's own pasted audit (CLAUDE.md, degree-planning scope).

## The five layers

| # | Layer | Source | Where it lives | Status |
|---|---|---|---|---|
| 1 | **Discovery** | Student types the school's name. Instructure's public account search (`canvas.instructure.com/api/v1/accounts/search`, the same lookup the Canvas Student app uses) returns its Canvas host. If the school isn't listed, they paste their Canvas address. | `{user_root}/school/profile.json` | built |
| 2 | **Canvas facts** | After SSO, read with the student's own session: dominant course `time_zone`, current `enrollment_term` (name, start, end), and the school's public `brand_variables` color. | `profile.json → discovered` | built (runs after the first bootstrap sync) |
| 3 | **Curated overlay** | `schools/{slug}.yaml`, matched by Canvas host (not by name). Holds what Canvas can't know: policy links, legal notice, grade scale, LTI catalog, campus engagement platform. | repo `schools/` | existing; now optional |
| 4 | **Student-provided** | `USER.md` (major, goals), `calibration/credit-hours.yaml`, dated `inbox/degree-audit.md` paste. | `{user_root}` | existing |
| 5 | **School plugins** | Reviewed connectors for one school's systems (e.g. `plugins/cu-boulder-campusgroups/`). Static registry only, never auto-fetched. | repo `plugins/` | existing |

## Data contract: `{user_root}/school/profile.json`

```json
{
  "version": 1,
  "slug": "osu-instructure-com",
  "display_name": "Ohio State – CarmenCanvas",
  "canvas_host": "osu.instructure.com",
  "canvas_base_url": "https://osu.instructure.com",
  "instructure_account_id": 132008,
  "source": "instructure-search",
  "chosen_at": "2026-10-07T23:30:00.000Z",
  "discovered": {
    "timezone": "America/New_York",
    "term": { "name": "Autumn 2026", "start_at": "2026-08-20T04:00:00Z", "end_at": "2026-12-12T05:00:00Z" },
    "brand_color": "#bb0000",
    "checked_at": "2026-10-07T23:35:00.000Z"
  }
}
```

`slug` is the curated slug when a `schools/*.yaml` matches the host, otherwise the host with dots turned into dashes. It is not a secret (no tokens, no cookies).

## Resolution order

Everywhere (Node `browser/scripts/lib/school-config.mjs`, Python `canvas_mcp.core.tenants`, Rust `SCHOOL_SLUG` env):

1. `SCHOOL_SLUG` naming a curated yaml: dev, tests (`browser/tests/setup-school.mjs` pins one), plugins.
2. The onboarding profile, with a curated yaml layered on when its `canvas_base_url` host matches. Canvas-discovered time zone and term fill gaps the yaml doesn't pin.
3. Otherwise a clear error ("No school chosen yet"). There is no default school anywhere.

## Code map

| Piece | File |
|---|---|
| Search, profile read/write, Canvas enrichment | `browser/scripts/lib/school-discovery.mjs` |
| CLI the app shells (`search`, `choose`, `enrich`, `show`) | `browser/scripts/school.mjs` (`npm run school -- …`) |
| Config resolution | `browser/scripts/lib/school-config.mjs` |
| Tauri commands `search_schools`, `choose_school`, `read_school_profile`; enrich after bootstrap sync | `app/src-tauri/src/commands.rs`, `daemon.rs` |
| Onboarding UI (search, pick, paste address) | `app/src/components/FirstRun.tsx` |
| Python fallback (`school_for_user`, `curated_slug_for_host`) | `src/canvas_mcp/core/tenants.py` |
| Tests | `browser/tests/school-discovery.test.mjs`, `tests/core/test_school_profile.py`, `app/src/components/FirstRun.test.tsx` |

## What personalization should actually do for a student

Ranked by how much it helps and how reliably we can get it. The first three are the foundation; the rest are the "school knows me" moments.

1. **Right time zone and term edges** (built). Every "due tomorrow" and every semester line depends on it. Source: Canvas.
2. **Right grade math** (partly built). Today: curated `grade_scale` or a US 4.0 default. *Proposed:* read each course's own grading standard (`/api/v1/courses/:id/grading_standards`); it's more accurate than any school-wide scale and needs no curation.
3. **Deadlines Canvas doesn't have** (*proposed*, high value): last day to drop or withdraw, finals week, breaks. Many registrars publish these as an ICS feed; add `academic_calendar_ics` to the curated yaml and show the ones that matter on the semester line ("Last day to drop: Oct 30"). Students can also paste dates.
4. **Help that exists on this campus, at the moment it's needed** (*proposed*): `policy_links` grows `tutoring`, `writing_center`, `accessibility`, `counseling`. When a grade-risk or exam-prep plan shows strain, link the real campus resource rather than generic advice.
5. **Tools this school uses** (built as discovery-only inventory): which LTI tools appear in the student's courses (WebAssign, Gradescope, zyBooks), so Kairos says "opens in WebAssign" instead of failing silently.
6. **Recognizable identity** (built): the school's name in onboarding and Settings; the Canvas brand color as a small swatch only (MASTER §12). It never recolors the app.
7. **Campus life plugins** (existing for CU): events/RSVP connectors only where a school's system has been reviewed. Pairs with the "keep the weekend" idea: surface campus events when Saturday is clear.
8. **School email hints** (*proposed*): the domain in the Canvas profile tells us whether the school runs Google Workspace or Microsoft 365, so calendar/email setup can offer the right one first.

## Decision needed: the Chrome extension on self-hosted Canvas

The extension can only run on hosts its manifest names. Today that is `*.instructure.com` plus `canvas.colorado.edu`. Schools with their own Canvas domain (for example `m.canvas.umich.edu`) need one of:

- **A. Curated list (current).** Add each reviewed self-hosted domain to `manifest.json` (`host_permissions`, content script `matches`, `web_accessible_resources`) and `lib/canvas-read.js` `ALLOWED_HOSTS`. Smallest permission surface; needs a release per new school.
- **B. Runtime grant (proposed).** Add `optional_host_permissions: ["https://*/*"]` and the `scripting` permission. When the desktop app knows the student's Canvas host, the side panel asks once ("Allow Kairos on canvas.yourschool.edu?"), then registers the content script for that host only, and `ALLOWED_HOSTS` reads the granted hosts. Works for every school; the install prompt stays narrow, but the permission model changes and the extension tests that pin the permission list must change with it.

The extension no longer falls back to CU's Canvas when it doesn't know the school; it says "Open Canvas once" and learns the host from the student's own Canvas tab.

## Adding a curated school overlay

1. Copy `schools/_template.yaml` to `schools/{slug}.yaml`.
2. Set `canvas_base_url` to the exact host students sign in on. That's the match key.
3. Fill only what Canvas can't tell us: `policy_links`, `legal_notice`, `grade_scale` if it differs from 4.0, `engagement_platform` if a plugin exists.
4. `npm run school -- show` with `DEV_USER_ROOT` pointing at a test profile confirms the merge.

## Privacy

School search sends only what the student typed to Instructure's public endpoint; no session or cookies. Brand colors are fetched from the school's public, unauthenticated file. Everything read with the session is GET-only and stays in `{user_root}`.
