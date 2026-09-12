"""Brief-day streak: written focus only, no shame copy, no ledger writes."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import yaml

from canvas_mcp.core.habit import (
    habit_path,
    record_brief_day,
    render_streak_line,
    streak_payload,
)
from canvas_mcp.core.habit import (
    main as habit_main,
)
from canvas_mcp.core.teach_hint import write_focus
from canvas_mcp.core.user_root import ensure_user_root

DENVER = ZoneInfo("America/Denver")
DAY = date(2026, 9, 8)


def _root(tmp_path: Path) -> Path:
    return ensure_user_root(tmp_path / "student")


def _brief(root: Path, *, on: date | None = None, now: datetime | None = None) -> None:
    write_focus(
        root,
        open_with="state the chain rule",
        format="retrieval",
        items=["MATH — Chain rule set — due Thu — Check: state the rule"],
        updated=on,
        now=now,
    )


def test_same_day_write_is_idempotent(tmp_path: Path) -> None:
    root = _root(tmp_path)
    first = record_brief_day(root, on=DAY)
    second = record_brief_day(root, on=DAY)
    assert first["streak"] == 1
    assert second["streak"] == 1
    assert second["briefed_today"] is True
    assert second["line"] == "Brief continuity: written today"


def test_yesterday_increments(tmp_path: Path) -> None:
    root = _root(tmp_path)
    record_brief_day(root, on=DAY)
    nxt = record_brief_day(root, on=DAY + timedelta(days=1))
    assert nxt["streak"] == 2
    assert nxt["line"] == "Brief continuity: written today"


def test_gap_resets_to_one(tmp_path: Path) -> None:
    root = _root(tmp_path)
    record_brief_day(root, on=DAY)
    record_brief_day(root, on=DAY + timedelta(days=1))
    reset = record_brief_day(root, on=DAY + timedelta(days=4))
    assert reset["streak"] == 1
    assert reset["line"] == "Brief continuity: written today"


def test_timezone_date_uses_school_wall_clock(tmp_path: Path) -> None:
    root = _root(tmp_path)
    # 05:00 UTC is still the previous evening in Denver.
    moment = datetime(2026, 9, 9, 5, 0, tzinfo=timezone.utc)
    recorded = record_brief_day(root, now=moment, tz=DENVER)
    assert recorded["last_brief_date"] == "2026-09-08"
    assert recorded["briefed_today"] is True

    later = streak_payload(
        root,
        now=datetime(2026, 9, 9, 6, 0, tzinfo=DENVER),
        tz=DENVER,
    )
    assert later["briefed_today"] is False
    assert later["line"] == "Brief continuity: yesterday written"


def test_render_omits_when_zero_or_already_missed(tmp_path: Path) -> None:
    root = _root(tmp_path)
    empty = streak_payload(root, now=datetime(2026, 9, 8, 12, tzinfo=timezone.utc))
    assert empty["streak"] == 0
    assert empty["line"] == ""
    assert render_streak_line(streak=0, last_brief_date=None, today=DAY) == ""

    record_brief_day(root, on=DAY)
    stale = streak_payload(
        root,
        now=datetime(2026, 9, 12, 12, tzinfo=timezone.utc),
        tz=timezone.utc,
    )
    assert stale["streak"] == 1
    assert stale["line"] == ""


def test_write_focus_records_day_without_ledger_or_profile(tmp_path: Path) -> None:
    root = _root(tmp_path)
    _brief(root, on=DAY)
    raw = yaml.safe_load(habit_path(root).read_text(encoding="utf-8"))
    assert str(raw["last_brief_date"])[:10] == "2026-09-08"
    assert not (root / "ledger.jsonl").read_text(encoding="utf-8")
    assert not (root / "calibration" / "learning-profile.yaml").exists()


def test_malformed_habit_yaml_show_is_quiet(tmp_path: Path) -> None:
    root = _root(tmp_path)
    path = habit_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("streak: [\n", encoding="utf-8")
    payload = streak_payload(root, now=datetime(2026, 9, 8, 12, tzinfo=timezone.utc))
    assert payload["streak"] == 0
    assert payload["line"] == ""


def test_write_focus_counts_school_local_day(tmp_path: Path, monkeypatch) -> None:
    root = _root(tmp_path)
    (root / "school_slug").write_text("cu-boulder", encoding="utf-8")
    monkeypatch.delenv("TIMEZONE", raising=False)
    monkeypatch.delenv("SCHOOL_SLUG", raising=False)
    # 05:00 UTC is still the previous evening in Denver.
    moment = datetime(2026, 9, 9, 5, 0, tzinfo=timezone.utc)
    write_focus(
        root,
        open_with="state the chain rule",
        format="retrieval",
        items=["MATH — Chain rule set — due Thu — Check: state the rule"],
        now=moment,
    )
    raw = yaml.safe_load(habit_path(root).read_text(encoding="utf-8"))
    assert str(raw["last_brief_date"])[:10] == "2026-09-08"
    assert (root / "inbox" / "focus.md").read_text(encoding="utf-8").startswith(
        "Updated: 2026-09-08"
    )


def test_cli_show_does_not_increment(tmp_path: Path, capsys) -> None:
    import json

    root = _root(tmp_path)
    record_brief_day(root, on=DAY)
    rc = habit_main(["--user-root", str(root), "--json", "show"])
    assert rc == 0
    printed = json.loads(capsys.readouterr().out)
    assert printed["streak"] == 1
    again = streak_payload(root, now=datetime(2026, 9, 8, 20, tzinfo=timezone.utc))
    assert again["streak"] == 1
