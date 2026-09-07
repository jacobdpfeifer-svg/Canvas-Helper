# Canvas SSO sync (browser)

**Role:** authenticate with school SSO (cookies), then call the **same Canvas REST API** a personal access token would use. Write results into `{user_root}/inbox/` for the agent (`DEV_USER_ROOT` or a gitignored local `inbox/`).

This is **not** a second product and not primarily a DOM scraper.

```bash
npm install
npx playwright install chromium
npm run open-canvas        # log in once (SSO + MFA)
npm run open-campusgroups  # CampusGroups consent/onboarding once per term (CU plugin)
npm run sync               # SSO → /api/v1 → inbox/week.md + inbox/courses/* catalogs
npm run validate-profiles  # check instructor profile quality after sync
npm run refresh-profiles   # stamp profile Sources with syllabus hash from sync
# npm run pull-todo        # alias for sync
npm run audit              # 45d universe + actionable-miss metrics (does not overwrite week.md)
npm run process-capture-queue -- --dry-run               # preview pending_mac photo uploads
CONFIRM=1 npm run process-capture-queue                  # after AirDrop + open-canvas
```

Photo intake: skill `student-photo-intake` (queue under `{user_root}/inbox/captures/`).

`browser/.auth/` is gitignored — never commit it.

- **sync** = source of truth for `inbox/week.md` (dated open work in the school-timezone window) and refreshes **Assignment catalog**, **Checkpoints**, and **Tools this semester** in `inbox/courses/*.md`. Also fetches syllabus, instructors, and policy page links; writes Bucket-A connector gaps to `inbox/tool-gaps.md` (flag only — never auto-build).
- **audit** = deeper 45-day pull + recall check vs prior week.md.
- **CampusGroups RSVP** = Playwright only (not Cursor IDE browser). See `plugins/cu-boulder-campusgroups/` (requires `--name`). Connector contract: [`../plugins/README.md`](../plugins/README.md).

Architecture: [`../docs/architecture.md`](../docs/architecture.md).
