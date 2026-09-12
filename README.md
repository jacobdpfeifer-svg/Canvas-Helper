# ProductName — local-first student Canvas companion (private beta)

Organize Canvas work and study locally. **Works without a Canvas access token.**

Default truth path:

1. SSO login (Playwright) → Canvas `/api/v1` → `{user_root}/inbox/week.md`
2. Agent triages with [`templates/USER.md`](templates/USER.md) (copied to `{user_root}/USER.md` onboarding)
3. Browser UI only for WebAssign / ZyBooks / PlayPosit / proctored / LTI

Architecture: [`docs/architecture.md`](docs/architecture.md) · Agent guide: [`AGENTS.md`](AGENTS.md) · Upstream MCP: [`vendor/README.md`](vendor/README.md)

**Vendored MCP:** `src/canvas_mcp/` and root [`CHANGELOG.md`](CHANGELOG.md) come from [vishalsachdev/canvas-mcp](https://github.com/vishalsachdev/canvas-mcp). ProductName is not that project’s product history — the CHANGELOG is upstream’s on purpose.

## Quick start (no token)

```bash
cd browser
npm install && npx playwright install chromium
npm run open-canvas   # SSO + MFA once (you complete IdentiKey + MFA)
npm run sync          # writes {user_root}/inbox/week.md from /api/v1
```

Set `SCHOOL_SLUG` (default `cu-boulder`) and optionally `DEV_USER_ROOT` for a product user-root path (inbox + calibration). Without `DEV_USER_ROOT`, sync writes a local `inbox/` under the repo (gitignored).

In chat: ask for a **week plan**, or **brief me** / **what should I do first**.

## Optional API token

When your school grants a PAT: same REST truth; MCP (`canvas-mcp-server`) is a nicer client, not a second system. See school notes under [`docs/schools/`](docs/schools/).

## Skills

| Skill | Purpose |
|-------|---------|
| `student-canvas-browser` | SSO sync + LTI escape hatch |
| `student-inbox-week` | Maintain inbox |
| `canvas-week-plan` | Weekly triage plan |
| `student-task-brief` | Priority P0–P3, briefing, first step |
| `student-course-arc` | Course theme, checkpoints, learning arc |
| `student-assignment-triage` | Process help + preview-only submit |
| `student-degree-progress` | Transfers + semester from USER.md + enrollments |
| `student-instructor-profile` | How the professor grades |
| `student-photo-intake` | Class photo capture intake |
| `canvas-discussion-facilitator` | Draft discussions (never posts) |

Enrollment lists come from `list_courses` / inbox sync — not hard-coded in skills.

## License

MIT. Upstream canvas-mcp copyright retained in [`LICENSE`](LICENSE). Student-only surface — not educator grading or hosted multi-tenant LMS automation. No billing in this phase.
