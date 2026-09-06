# CU Boulder — CampusGroups plugin

Conditional school plugin. Loaded only when `SCHOOL_SLUG=cu-boulder`.

Scripts (also thinly re-exported from `browser/scripts/` for npm run):

- `open-campusgroups.mjs`
- `rsvp-campusgroups.mjs` / `rsvp-dinner.mjs` / `rsvp-ai-lab.mjs`
- `sync-coen-dinners.mjs` / `sync-coen-ai-labs.mjs`

Uses shared `browser/.auth` Playwright profile. IDE browser has no SSO.
