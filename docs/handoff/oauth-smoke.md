# Google OAuth live smoke (read / draft only)

Wiring lives in [`mcp-servers/common/google_oauth.py`](../../mcp-servers/common/google_oauth.py) with dry-run fallback when secrets are unset. GCal/Gmail MCP tools expose `describe_mode` → `dry-run` | `oauth-ready` | `live`.

**Status:** dry-run path is covered by unit tests. **Live consent has not been executed in this repo** — requires a real Google Cloud OAuth client (escalate). Do not claim “live OAuth proven” until this checklist is run end-to-end.

**Canvas-focus pivot:** `create_event` / `update_event` / `send_email` are hard-blocked. Smoke only **read + draft** paths.

## Prerequisites

1. Google Cloud project → OAuth client (Desktop app) JSON.
2. Enable **Google Calendar API** and **Gmail API**.
3. Consent screen scopes (at minimum):
   - Calendar read / list scopes used by the read tools
   - `https://www.googleapis.com/auth/gmail.compose` (drafts)
   - `https://www.googleapis.com/auth/gmail.modify` (label/undo path) if testing labels
4. Install optional deps: `uv pip install -e '.[google]'`
5. Set `GOOGLE_OAUTH_CLIENT_SECRETS=/absolute/path/to/client_secret.json`
6. Set `DEV_USER_ROOT` to a scratch user root (token lands in `{user_root}/auth/google/token.json`).

## Smoke steps

1. **Mode before consent:** call GCal/Gmail `describe_mode` → expect `oauth-ready` (secrets present, no token yet) or `dry-run` if secrets unset.
2. **Consent:** trigger a **read** or **create_draft** live call; browser consent → token saved → `describe_mode` → `live`.
3. **Calendar:** list/read events only. Confirm `create_event` / `update_event` return blocked stubs (no API insert).
4. **Gmail:** `create_draft` (not send) → optional undo/delete draft. Confirm `send_email` returns `{blocked: true}`.
5. **Dry-run still works:** unset `GOOGLE_OAUTH_CLIENT_SECRETS` → actuators use in-memory stores; existing unit tests pass.

## Out of scope

- `send_email`, `create_event`, and `update_event` stay hard-blocked (canvas-focus pivot).
- Do not commit client secrets or `token.json`.
