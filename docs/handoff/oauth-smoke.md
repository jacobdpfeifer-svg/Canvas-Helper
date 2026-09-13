# Google OAuth live smoke (read / draft / human-confirmed send+write)

Wiring lives in [`mcp-servers/common/google_oauth.py`](../../mcp-servers/common/google_oauth.py) with dry-run fallback when secrets are unset. GCal/Gmail MCP tools expose `describe_mode` → `dry-run` | `oauth-ready` | `live`.

**Status:** dry-run path is covered by unit tests. **Live consent has not been executed in this repo** — requires a real Google Cloud OAuth client (escalate). Do not claim "live OAuth proven" until this checklist is run end-to-end.

**Canvas-focus pivot, 2026-09-13 addendum:** `send_email` / `create_event` / `update_event` execute for real, but only behind `ConfirmationGuard` — every call previews first and requires a fresh, per-instance confirmation token before it touches the live API. Smoke both the preview path and the confirmed-execute path; there is no automatic/standing mode to smoke.

## Prerequisites

1. Google Cloud project → OAuth client (Desktop app) JSON.
2. Enable **Google Calendar API** and **Gmail API**.
3. Consent screen scopes (at minimum):
   - `https://www.googleapis.com/auth/calendar.events` (create/update/delete) and `https://www.googleapis.com/auth/calendar.readonly` (list/read)
   - `https://www.googleapis.com/auth/gmail.compose` (drafts)
   - `https://www.googleapis.com/auth/gmail.modify` (label/undo path) if testing labels
   - `https://www.googleapis.com/auth/gmail.send` (real send)
4. Install optional deps: `uv pip install -e '.[google]'`
5. Set `GOOGLE_OAUTH_CLIENT_SECRETS=/absolute/path/to/client_secret.json`
6. Set `DEV_USER_ROOT` to a scratch user root (token lands in `{user_root}/auth/google/token.json`).

## Smoke steps

1. **Mode before consent:** call GCal/Gmail `describe_mode` → expect `oauth-ready` (secrets present, no token yet) or `dry-run` if secrets unset.
2. **Consent:** trigger a **read** or **create_draft** live call; browser consent → token saved → `describe_mode` → `live`.
3. **Calendar preview:** call `create_event`/`update_event` with no `confirmation_token` → expect a preview response ("NOTHING has been written yet") and no API insert/patch call. Confirm nothing appears on the live calendar.
4. **Calendar confirmed execute:** re-call with the issued `confirmation_token` → expect a real `events().insert`/`patch` call and the event to appear on the live calendar. Confirm `gcal` `rewind` deletes a created event / restores an updated one's prior summary+time.
5. **Gmail draft:** `create_draft` (not send) → optional undo/delete draft, unaffected by this addendum.
6. **Gmail send preview:** call `send_email` with no `confirmation_token` → expect a preview, no API send call, nothing in Sent.
7. **Gmail send confirmed execute:** re-call with the issued token → expect a real `messages().send` call and the message to land in the recipient's inbox. There is no undo — `send_email`'s ledger row has `undo_ptr: null` by design.
8. **Dry-run still works:** unset `GOOGLE_OAUTH_CLIENT_SECRETS` → actuators use in-memory/dry-run responses for both preview and confirmed-execute calls; existing unit tests pass.

## Out of scope

- Canvas `submit`/`comment`/discussion-post stay preview-only, unaffected by this addendum — do not smoke a live-execute path for those.
- `send_email`/`create_event`/`update_event` must never escalate to an automatic/standing posture — if a smoke run somehow executes without a fresh preview+token, that's a regression, not a feature.
- Do not commit client secrets or `token.json`.
