"""Dry-run OAuth helper smoke — live Google packages optional."""

from __future__ import annotations

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
