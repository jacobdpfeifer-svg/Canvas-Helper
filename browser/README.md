# Jacob Canvas SSO sync

**Role:** authenticate with IdentiKey (cookies), then call the **same Canvas REST API** a personal access token would use. Write results into `inbox/` for the agent.

This is **not** a second product and not primarily a DOM scraper.

```bash
npm install
npx playwright install chromium
npm run open-canvas        # log in once (IdentiKey + MFA)
npm run open-campusgroups  # CampusGroups consent/onboarding once per term
npm run sync               # SSO → /api/v1 → ../inbox/week.md + ../inbox/courses/* catalogs
npm run validate-profiles  # check instructor profile quality after sync
npm run refresh-profiles   # stamp profile Sources with syllabus hash from sync
# npm run pull-todo        # alias for sync
npm run audit              # 45d universe + actionable-miss metrics (does not overwrite week.md)
npm run sync-dinners       # cache COEN major dinner schedule → ../inbox/coen-major-dinners.md
HEADLESS=1 npm run sync-dinners       # cache COEN major dinner schedule → ../inbox/coen-major-dinners.md
HEADLESS=1 npm run sync-ai-labs       # cache AI Lab workshop slots → ../inbox/coen-ai-labs.md
HEADLESS=1 npm run rsvp-campusgroups -- --event <id>
HEADLESS=1 npm run rsvp-dinner -- --major cs --date 2026-08-26
HEADLESS=1 npm run rsvp-ai-lab -- --slot "Wed 1:55 PM"   # ask Jacob; confirm preference first
npm run process-capture-queue -- --dry-run               # preview pending_mac photo uploads
CONFIRM=1 npm run process-capture-queue                  # after AirDrop + open-canvas
```

Photo intake from Cursor mobile: see [`../inbox/captures/README.md`](../inbox/captures/README.md) and skill `jacob-photo-intake`.

`browser/.auth/` is gitignored — never commit it.

- **sync** = source of truth for `inbox/week.md` (dated, open work in the window; America/Denver days) and refreshes **Assignment catalog** + **Checkpoints** in `inbox/courses/*.md` for course-arc briefings. Also fetches per-course **syllabus** (→ `inbox/courses/_raw/CODE-syllabus.txt`), **instructors**, and **policy page** links into course file headers and `### Policy pages (synced)`. When COEN 1500 is enrolled, also runs **sync-dinners**.
- **audit** = deeper 45-day pull + recall check vs prior week.md (actionable misses vs catalog extras).
- **CampusGroups RSVP** = Playwright only (not Cursor IDE browser). See [`docs/CU_BROWSER.md`](../docs/CU_BROWSER.md).

See [`docs/HYBRID.md`](../docs/HYBRID.md) and [`docs/CU_BROWSER.md`](../docs/CU_BROWSER.md).
