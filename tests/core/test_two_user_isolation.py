"""Two-user isolation smoke — separate roots, ledgers, and path escape."""

from __future__ import annotations

from pathlib import Path

import pytest

from canvas_mcp.core.ledger import Ledger, append_ledger
from canvas_mcp.core.user_root import (
    USER_SUBDIRS,
    default_app_support_root,
    resolve_user_root,
    user_path,
)


@pytest.fixture
def app_support(tmp_path, monkeypatch):
    """Isolate app-support under tmp so two real user_ids do not share DEV_USER_ROOT."""
    support = tmp_path / "ProductName"
    support.mkdir()
    monkeypatch.delenv("DEV_USER_ROOT", raising=False)
    monkeypatch.setattr(
        "canvas_mcp.core.user_root.default_app_support_root",
        lambda product="ProductName": support,
    )
    return support


def test_two_users_get_separate_roots(app_support):
    root_a = resolve_user_root("user_a", create=True)
    root_b = resolve_user_root("user_b", create=True)

    assert root_a == (app_support / "user_a").resolve()
    assert root_b == (app_support / "user_b").resolve()
    assert root_a != root_b

    for rel in ("auth", "inbox", "calibration"):
        assert (root_a / rel).is_dir()
        assert (root_b / rel).is_dir()
        assert (root_a / rel).resolve() != (root_b / rel).resolve()

    assert (root_a / "ledger.jsonl").is_file()
    assert (root_b / "ledger.jsonl").is_file()


def test_ledger_writes_do_not_cross_users(app_support):
    root_a = resolve_user_root("user_a", create=True)
    root_b = resolve_user_root("user_b", create=True)

    append_ledger(
        root_a,
        actor="test",
        tool="isolation_probe",
        target="a-only",
        why="user_a write",
        outcome="success",
        category="calendar",
    )

    assert len(Ledger(root_a).read_all()) == 1
    assert Ledger(root_b).read_all() == []
    assert "a-only" in (root_a / "ledger.jsonl").read_text(encoding="utf-8")
    assert (root_b / "ledger.jsonl").read_text(encoding="utf-8") == ""


def test_user_path_escape_rejected_per_user(app_support):
    resolve_user_root("user_a", create=True)
    with pytest.raises(ValueError, match="inside the user root"):
        user_path("user_a", "inbox", "..", "..", "escape.txt")


def test_default_app_support_unchanged_shape():
    # Sanity: helper still returns a ProductName leaf (platform-specific parent).
    root = default_app_support_root()
    assert root.name == "ProductName"
    assert isinstance(root, Path)


def test_user_subdirs_include_auth():
    assert "auth" in USER_SUBDIRS
