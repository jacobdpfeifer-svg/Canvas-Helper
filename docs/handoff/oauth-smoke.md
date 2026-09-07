# Google OAuth live smoke (Phase E)

Wiring lives in [`mcp-servers/common/google_oauth.py`](../../mcp-servers/common/google_oauth.py) with dry-run fallback when secrets are unset. GCal/Gmail MCP tools expose `describe_mode` → `dry-run` | `oauth-ready` | `live`.

**Status (re-verified 2026-09-06):** dry-run path is covered by unit tests. **Live consent + Calendar/Gmail round-trip has not been executed in this repo** — requires a real Google Cloud OAuth client (escalate). Do not claim “live OAuth proven” until this checklist is run end-to-end.

## Prerequisites

1. Google Cloud project → OAuth client (Desktop app) JSON.
2. Enable **Google Calendar API** and **Gmail API**.
3. Consent screen scopes (at minimum):
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/gmail.compose`
   - `https://www.googleapis.com/auth/gmail.modify` (label/undo path)
4. Install optional deps: `uv pip install -e '.[google]'`
5. Set `GOOGLE_OAUTH_CLIENT_SECRETS=/absolute/path/to/client_secret.json`
6. Set `DEV_USER_ROOT` to a scratch user root (token lands in `{user_root}/auth/google/token.json`).

## Smoke steps

1. **Mode before consent:** call GCal/Gmail `describe_mode` → expect `oauth-ready` (secrets present, no token yet) or `dry-run` if secrets unset.
2. **Consent:** trigger any live Calendar create; browser consent → token saved → `describe_mode` → `live`.
3. **Calendar:** create event → confirm ledger row has `undo_ptr` → undo/delete → event gone.
4. **Gmail:** create draft (not send) → undo/delete draft → gone.
5. **Dry-run still works:** unset `GOOGLE_OAUTH_CLIENT_SECRETS` → actuators use in-memory stores; existing unit tests pass.

## Out of scope

- `send_email` remains Phase-1 blocked (returns `{blocked: true}` JSON; no Gmail API call).
- Do not commit client secrets or `token.json`.
