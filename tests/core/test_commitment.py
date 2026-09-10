"""One opt-in commitment. Student-scored, one open slot, no habit or ledger writes."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from canvas_mcp.core.commitment import (
    active_commitment,
    commitment_path,
    due_check_in,
    resolve_commitment,
    set_commitment,
)
from canvas_mcp.core.habit import habit_path
from canvas_mcp.core.user_root import ensure_user_root

NOW = datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc)
DEADLINE = "2026-09-10T19:00:00+00:00"


def _root(tmp_path: Path) -> Path:
    return ensure_user_root(tmp_path / "student")


def test_second_set_while_open_is_refused(tmp_path: Path) -> None:
    root = _root(tmp_path)
    set_commitment(
        root,
        text="open the project brief",
        deadline=DEADLINE,
        course="CHEM",
        now=NOW,
    )
    with pytest.raises(ValueError, match="open commitment"):
        set_commitment(
            root,
            text="two retrieval blocks for CHEM",
            deadline="2026-09-11T19:00:00+00:00",
            now=NOW + timedelta(minutes=5),
        )
    stored = commitment_path(root).read_text(encoding="utf-8")
    assert stored.count("status:") == 1
    assert "open the project brief" in stored


def test_check_in_is_once_and_resolve_is_idempotent(tmp_path: Path) -> None:
    root = _root(tmp_path)
    ledger = root / "ledger.jsonl"
    ledger_before = ledger.stat().st_mtime if ledger.exists() else None
    set_commitment(
        root,
        text="finish the outline",
        deadline=DEADLINE,
        now=NOW,
    )
    assert due_check_in(root, now=NOW + timedelta(hours=1)) is None
    assert active_commitment(root, now=NOW + timedelta(hours=1)) is not None

    due = datetime(2026, 9, 10, 20, 0, tzinfo=timezone.utc)
    check = due_check_in(root, now=due)
    assert check is not None
    assert check.text == "finish the outline"
    assert active_commitment(root, now=due) is None

    resolved = resolve_commitment(root, "met", now=due)
    assert resolved.status == "met"
    assert due_check_in(root, now=due) is None
    assert active_commitment(root, now=due) is None

    again = resolve_commitment(root, "not_met", now=due + timedelta(hours=1))
    assert again.status == "met"
    assert again.resolved_at == resolved.resolved_at

    habit = habit_path(root)
    assert not habit.exists()
    ledger_after = ledger.stat().st_mtime if ledger.exists() else None
    assert ledger_after == ledger_before


def test_malformed_yaml_is_no_active_commitment(tmp_path: Path) -> None:
    root = _root(tmp_path)
    path = commitment_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("status: [", encoding="utf-8")
    assert active_commitment(root, now=NOW) is None
    assert due_check_in(root, now=NOW) is None
