"""Shared actuator bootstrap — user_root + write gate."""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "mcp-servers"))

from common.actuator import check_write, user_root  # noqa: E402
from canvas_mcp.core.permissions import load_permissions, save_permissions  # noqa: E402
from canvas_mcp.core.user_root import ensure_user_root  # noqa: E402


def test_actuator_user_root_honors_dev(tmp_path, monkeypatch):
    ensure_user_root(tmp_path)
    monkeypatch.setenv("DEV_USER_ROOT", str(tmp_path))
    monkeypatch.setenv("PRODUCT_USER_ID", "dev")
    assert user_root() == tmp_path.resolve()


def test_check_write_blocks_never_category(tmp_path, monkeypatch):
    ensure_user_root(tmp_path)
    monkeypatch.setenv("DEV_USER_ROOT", str(tmp_path))
    state = load_permissions(tmp_path)
    state.categories["lti_submit"].posture = "never"
    save_permissions(tmp_path, state)
    ok, reason = check_write(
        tmp_path,
        "lti_submit",
        confirmed=True,
        actor="test",
        tool="submit",
        target="x",
        why="test",
        log_block=False,
    )
    assert not ok
    assert reason
