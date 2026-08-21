# Jacob Canvas SSO sync

**Role:** authenticate with IdentiKey (cookies), then call the **same Canvas REST API** a personal access token would use. Write results into `inbox/` for the agent.

This is **not** a second product and not primarily a DOM scraper.

```bash
npm install
npx playwright install chromium
npm run open-canvas   # log in once (IdentiKey + MFA)
npm run sync          # SSO → /api/v1 → ../inbox/week.md
# npm run pull-todo   # alias for sync
npm run audit         # deeper 45d audit + comparison
```

`browser/.auth/` is gitignored — never commit it.

See [`docs/HYBRID.md`](../docs/HYBRID.md).
