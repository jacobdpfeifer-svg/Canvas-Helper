# Inbox — durable Canvas memory

Filled by **SSO → Canvas `/api/v1` → markdown** (`cd browser && npm run sync`).  
The agent reads this every turn. It is memory, not a competing system of record.

Architecture: [`docs/HYBRID.md`](../docs/HYBRID.md)

## Layout

```
inbox/
  week.md                 # canonical due list
  courses/APPM1235.md
  courses/BCOR1030.md
  courses/CSCI1200.md
  courses/ECON2010.md
  courses/COEN1500.md
  audit-*.md              # optional deep syncs
  _templates/
```

## Refresh (preferred)

```bash
cd browser && npm run open-canvas   # if needed
cd browser && npm run sync
```

Manual paste is fine as a backup; set `Source: manual paste`.

## Freshness

`Updated:` ISO date at top. If older than **2 days**, agent should request `npm run sync` (or ask you).
