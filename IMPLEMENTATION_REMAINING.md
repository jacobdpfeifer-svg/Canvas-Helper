# Implementation status — Jacob IBE fork

## Done (no PAT required)

- [x] Architecture: SSO → Canvas `/api/v1` → `inbox/` → JACOB triage ([`docs/HYBRID.md`](docs/HYBRID.md))
- [x] `browser/npm run sync` (session cookies → planner+todo+assignments → `inbox/week.md`)
- [x] Inbox memory + course stubs (incl. COEN 1500)
- [x] Skills/rules/docs aligned (LTI escape hatch; never auto WebAssign/ZyBooks/PlayPosit/proctored)
- [x] Optional MCP student-only server kept for when a PAT arrives

## Open (external)

- [ ] CU student API token / OIT exception — optional upgrade, not a blocker

## Use now

```bash
cd browser && npm install && npx playwright install chromium
npm run open-canvas && npm run sync
```

Then ask for a week plan in chat.
