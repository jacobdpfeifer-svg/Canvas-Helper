from pathlib import Path

import pytest

from canvas_mcp.core.user_root import resolve_user_root, user_path


def test_profile_ids_are_isolated(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEV_USER_ROOT", raising=False)
    monkeypatch.setattr("canvas_mcp.core.user_root.default_app_support_root", lambda product: tmp_path / product)
    assert resolve_user_root("alice") != resolve_user_root("bob")
    assert resolve_user_root("alice").name == "alice"


def test_user_path_rejects_traversal(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEV_USER_ROOT", str(tmp_path))
    with pytest.raises(ValueError):
        user_path("ignored", "..", "outside.txt")
