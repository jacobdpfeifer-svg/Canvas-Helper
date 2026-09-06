"""Google OAuth helpers for GCal / Gmail actuators.

Tokens live under ``{user_root}/auth/google/token.json``.
Client secrets path: env ``GOOGLE_OAUTH_CLIENT_SECRETS`` (installed-app JSON).

Without secrets (or without optional google-auth packages) callers get
``None`` and should stay on the in-memory dry-run path.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

GCAL_SCOPES = (
    "https://www.googleapis.com/auth/calendar.events",
)
GMAIL_SCOPES = (
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.modify",
)


def client_secrets_path() -> Path | None:
    raw = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRETS", "").strip()
    if not raw:
        return None
    path = Path(raw).expanduser()
    return path if path.is_file() else None


def live_oauth_available() -> bool:
    if client_secrets_path() is None:
        return False
    try:
        import google.auth.transport.requests  # noqa: F401
        import google.oauth2.credentials  # noqa: F401
        import google_auth_oauthlib.flow  # noqa: F401
    except ImportError:
        return False
    return True


def _token_path(user_root: Path) -> Path:
    return Path(user_root) / "auth" / "google" / "token.json"


def _load_creds(user_root: Path, scopes: tuple[str, ...]):
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    secrets = client_secrets_path()
    if secrets is None:
        return None

    token_file = _token_path(user_root)
    token_file.parent.mkdir(parents=True, exist_ok=True)
    creds = None
    if token_file.is_file():
        creds = Credentials.from_authorized_user_file(str(token_file), list(scopes))
    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_file.write_text(creds.to_json(), encoding="utf-8")
        return creds
    flow = InstalledAppFlow.from_client_secrets_file(str(secrets), list(scopes))
    creds = flow.run_local_server(port=0)
    token_file.write_text(creds.to_json(), encoding="utf-8")
    return creds


def get_credentials(user_root: Path, scopes: tuple[str, ...]):
    """Return google Credentials or None (dry-run)."""
    if not live_oauth_available():
        return None
    return _load_creds(user_root, scopes)


def calendar_service(user_root: Path):
    creds = get_credentials(user_root, GCAL_SCOPES)
    if creds is None:
        return None
    from googleapiclient.discovery import build

    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def gmail_service(user_root: Path):
    creds = get_credentials(user_root, GMAIL_SCOPES)
    if creds is None:
        return None
    from googleapiclient.discovery import build

    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def gcal_create_event(
    service: Any, *, summary: str, start_iso: str, end_iso: str
) -> dict[str, Any]:
    body = {
        "summary": summary,
        "start": {"dateTime": start_iso},
        "end": {"dateTime": end_iso},
    }
    return service.events().insert(calendarId="primary", body=body).execute()


def gcal_update_event(
    service: Any,
    event_id: str,
    *,
    summary: str | None,
    start_iso: str | None,
    end_iso: str | None,
) -> dict[str, Any]:
    existing = service.events().get(calendarId="primary", eventId=event_id).execute()
    if summary is not None:
        existing["summary"] = summary
    if start_iso is not None:
        existing["start"] = {"dateTime": start_iso}
    if end_iso is not None:
        existing["end"] = {"dateTime": end_iso}
    return (
        service.events()
        .update(calendarId="primary", eventId=event_id, body=existing)
        .execute()
    )


def gcal_delete_event(service: Any, event_id: str) -> None:
    service.events().delete(calendarId="primary", eventId=event_id).execute()


def gcal_restore_event(service: Any, prior: dict[str, Any]) -> dict[str, Any]:
    """Restore a prior event snapshot (best-effort update or insert)."""
    event_id = prior.get("id")
    body = {
        "summary": prior.get("summary"),
        "start": prior.get("start")
        if isinstance(prior.get("start"), dict)
        else {"dateTime": prior.get("start")},
        "end": prior.get("end")
        if isinstance(prior.get("end"), dict)
        else {"dateTime": prior.get("end")},
    }
    if event_id:
        try:
            return (
                service.events()
                .update(calendarId="primary", eventId=event_id, body={**body, "id": event_id})
                .execute()
            )
        except Exception:
            pass
    return service.events().insert(calendarId="primary", body=body).execute()


def gmail_create_draft(
    service: Any, *, to: str, subject: str, body: str
) -> dict[str, Any]:
    import base64
    from email.mime.text import MIMEText

    message = MIMEText(body)
    message["to"] = to
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    return service.users().drafts().create(userId="me", body={"message": {"raw": raw}}).execute()


def gmail_delete_draft(service: Any, draft_id: str) -> None:
    service.users().drafts().delete(userId="me", id=draft_id).execute()


def gmail_modify_labels(
    service: Any,
    message_id: str,
    *,
    add_labels: list[str] | None,
    remove_labels: list[str] | None,
) -> dict[str, Any]:
    body: dict[str, Any] = {}
    if add_labels:
        body["addLabelIds"] = add_labels
    if remove_labels:
        body["removeLabelIds"] = remove_labels
    return (
        service.users()
        .messages()
        .modify(userId="me", id=message_id, body=body)
        .execute()
    )


def describe_mode(user_root: Path) -> str:
    if live_oauth_available() and _token_path(user_root).is_file():
        return "live"
    if live_oauth_available():
        return "oauth-ready"
    return "dry-run"
