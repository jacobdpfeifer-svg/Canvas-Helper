# CU Boulder Canvas API access (optional PAT)

**You do not need a PAT for this fork to work.** Default: SSO → `/api/v1` → `inbox/` ([`HYBRID.md`](HYBRID.md), [`CU_BROWSER.md`](CU_BROWSER.md)).

A personal access token is a **better auth plug** for the same REST API (typed MCP tools, preview→confirm native submits). Keep the OIT exception thread alive; when a token arrives, plug it into `.env`.

## If/when you get a token

```bash
# .env
CANVAS_API_TOKEN=...
CANVAS_API_URL=https://canvas.colorado.edu/api/v1

uv run canvas-mcp-server --test
```

Smoke: `get_my_profile`, `list_courses`, `get_my_upcoming_assignments`.

Prefer MCP for those facts **and** still keep `npm run sync` / inbox so offline turns work.

Never commit `.env`.
