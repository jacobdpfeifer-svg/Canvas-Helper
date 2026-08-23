# Canvas MCP — Jacob IBE (personal fork)

Personal **student** academic agent for **Jacob Pfeifer**, CU Boulder **IBE**, Fall 2026.

**Works without a Canvas access token.** Default path:

1. SSO login (Playwright) → Canvas `/api/v1` → [`inbox/week.md`](inbox/week.md)
2. Agent triages with [`JACOB.md`](JACOB.md)
3. Browser UI only for WebAssign / ZyBooks / PlayPosit / proctored / LTI

Architecture: [`docs/HYBRID.md`](docs/HYBRID.md)

## Quick start (no token)

```bash
cd browser
npm install && npx playwright install chromium
npm run open-canvas   # IdentiKey + MFA once
npm run sync          # writes ../inbox/week.md from /api/v1
```

In chat: ask for a **week plan**, or **brief me** / **what should I do first** (priority + first step).

## Optional API token later

When OIT grants a PAT: [docs/CU_ACCESS.md](docs/CU_ACCESS.md). Same REST truth; MCP becomes a nicer client, not a second system.

## Fall 2026

| Course | Focus |
|--------|--------|
| APPM 1235 | Pre-calc — exams = you; WebAssign = you in tool |
| BCOR 1030 | Drafts OK; PlayPosit/proctored/presentations = you |
| CSCI 1200 | Worth your time; ZyBooks = you in tool |
| ECON 2010 | Required despite ECON 2999TC |
| COEN 1500 | FYS signups / thought projects — include in week plans |

## Skills

| Skill | Purpose |
|-------|---------|
| `jacob-canvas-browser` | SSO sync + LTI escape hatch |
| `jacob-inbox-week` | Maintain inbox |
| `canvas-week-plan` | Weekly triage plan |
| `jacob-task-brief` | Priority P0–P3, briefing, first step |
| `jacob-course-arc` | Course theme, checkpoints, learning arc |
| `jacob-assignment-triage` | Process help + rare native submit |
| `jacob-ibe-semester` | Transfer + semester |
| `canvas-discussion-facilitator` | Draft discussions |

## License

MIT (inherited). Not for republishing as the multi-audience upstream product.
