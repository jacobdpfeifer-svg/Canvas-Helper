"""Dry-run OAuth helper smoke — live Google packages optional."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "mcp-servers"))

from common import google_oauth  # noqa: E402


def test_live_oauth_false_without_secrets(monkeypatch, tmp_path):
    monkeypatch.delenv("GOOGLE_OAUTH_CLIENT_SECRETS", raising=False)
    assert google_oauth.client_secrets_path() is None
    assert google_oauth.live_oauth_available() is False
    assert google_oauth.calendar_service(tmp_path) is None
    assert google_oauth.gmail_service(tmp_path) is None
    assert google_oauth.describe_mode(tmp_path) == "dry-run"


def test_secrets_path_requires_existing_file(monkeypatch, tmp_path):
    missing = tmp_path / "missing.json"
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_SECRETS", str(missing))
    assert google_oauth.client_secrets_path() is None
    present = tmp_path / "client.json"
    present.write_text("{}", encoding="utf-8")
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_SECRETS", str(present))
    assert google_oauth.client_secrets_path() == present


def test_gcal_gmail_describe_mode_tools_dry_run(monkeypatch, tmp_path):
    """MCP actuators must expose describe_mode (oauth-smoke checklist)."""
    monkeypatch.delenv("GOOGLE_OAUTH_CLIENT_SECRETS", raising=False)
    monkeypatch.setenv("DEV_USER_ROOT", str(tmp_path))
    monkeypatch.setenv("PRODUCT_USER_ID", "dev")

    from gcal import server as gcal_server  # type: ignore
    from gmail import server as gmail_server  # type: ignore

    gcal = json.loads(gcal_server.describe_mode())
    gmail = json.loads(gmail_server.describe_mode())
    assert gcal["mode"] == "dry-run"
    assert gmail["mode"] == "dry-run"
    assert gcal["actuator"] == "gcal"
    assert gmail["actuator"] == "gmail"

    blocked = json.loads(gmail_server.send_email())
    assert blocked["blocked"] is True


def test_gcal_write_helpers_raise_not_call_api():
    """Pivot residue: helpers must not be callable write paths."""
    import pytest

    with pytest.raises(RuntimeError, match="Calendar writes are disabled"):
        google_oauth.gcal_create_event(None, summary="x", start_iso="", end_iso="")
    with pytest.raises(RuntimeError, match="Calendar writes are disabled"):
        google_oauth.gcal_update_event(None, "id", summary="x", start_iso=None, end_iso=None)
    with pytest.raises(RuntimeError, match="Calendar writes are disabled"):
        google_oauth.gcal_delete_event(None, "id")
    with pytest.raises(RuntimeError, match="Calendar writes are disabled"):
        google_oauth.gcal_restore_event(None, {"id": "x"})


def test_gcal_scopes_are_readonly():
    assert all("readonly" in s or "calendar.events" not in s for s in google_oauth.GCAL_SCOPES)
    assert "https://www.googleapis.com/auth/calendar.events" not in google_oauth.GCAL_SCOPES


def test_gcal_mcp_never_imports_live_write_bodies():
    """Hard-blocked MCP tools must not reference events().insert in server.py."""
    server_src = (REPO / "mcp-servers" / "gcal" / "server.py").read_text(encoding="utf-8")
    assert "events().insert" not in server_src
    assert "gcal_create_event" not in server_src
    oauth_src = (REPO / "mcp-servers" / "common" / "google_oauth.py").read_text(encoding="utf-8")
    assert "events().insert" not in oauth_src
    assert "events().update" not in oauth_src
    assert "events().delete" not in oauth_src
