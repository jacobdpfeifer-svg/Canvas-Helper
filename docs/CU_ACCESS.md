# CU Boulder Canvas API access

## Status

- `.env` should use `CANVAS_API_URL=https://canvas.colorado.edu/api/v1`
- **Phase 0 open:** replace `CANVAS_API_TOKEN` with a real student token from Canvas → Account → Settings → New Access Token
- Placeholder token only proves the host is reachable (HTTP 401) — not that student tools work
- Never commit `.env`

## After you add a real token

```bash
uv run canvas-mcp-server --test
```

Then smoke via MCP: `get_my_profile`, `list_courses`, `get_my_upcoming_assignments`.
