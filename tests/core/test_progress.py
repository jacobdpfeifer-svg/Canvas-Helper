"""Academic outcome log, week trail, and semester garden."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

from canvas_mcp.core.habit import habit_path
from canvas_mcp.core.learn_loop import (
    add_item,
    counterfactual_due,
    due_reviews,
    record_outcome,
    review_budget,
)
from canvas_mcp.core.progress import (
    TRAIL_LINE,
    garden_payload,
    outcomes_path,
    read_events,
    trail_payload,
)
from canvas_mcp.core.teach_hint import write_focus
from canvas_mcp.core.user_root import ensure_user_root

NOW = datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc)


def _root(tmp_path: Path) -> Path:
    return ensure_user_root(tmp_path / "student")


def _kinds(root: Path) -> list[str]:
    return [str(row.get("kind")) for row in read_events(root)]


def test_delayed_hit_appends_once_and_same_session_appends_nothing(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    same = record_outcome(root, item.id, "hit", same_session=True, now=NOW)
    assert same.stability == "fragile"
    assert _kinds(root) == []

    skipped = record_outcome(root, item.id, "skipped", now=NOW + timedelta(hours=1))
    assert skipped.stability == "fragile"
    assert _kinds(root) == []

    later = NOW + timedelta(days=1)
    hit = record_outcome(root, item.id, "hit", now=later)
    assert hit.stability == "holding"
    assert _kinds(root) == ["delayed_hit"]

    again = record_outcome(root, item.id, "hit", now=later + timedelta(minutes=1))
    assert again.stability == "holding"
    assert _kinds(root) == ["delayed_hit"]

    trail = trail_payload(root, now=later)
    assert trail["line"] == TRAIL_LINE
    assert len(trail["learning"]) == 1
    assert trail["workflow"] == []
    garden = garden_payload(root, now=later)
    assert garden["courses"][0]["delayed_retrieval"] == 1
    assert garden["courses"][0]["path"] == 0
    assert "exam ready" not in garden["note"]
    assert "you know this" not in garden["note"]


def test_hit_after_miss_is_one_corrected_miss(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="CHEM",
        claim="name the leaving group",
        kind="declarative",
        checkpoint_due="2026-09-25",
        now=NOW,
    )
    due = NOW + timedelta(days=1)
    missed = record_outcome(root, item.id, "miss", now=due)
    assert missed.stability == "fragile"
    assert _kinds(root) == []

    corrected = record_outcome(
        root,
        item.id,
        "hit",
        now=datetime.fromisoformat(missed.next_review_at) + timedelta(hours=1),
    )
    assert corrected.stability == "holding"
    assert _kinds(root) == ["corrected_miss"]
    garden = garden_payload(root, now=due + timedelta(days=1))
    row = garden["courses"][0]
    assert row["corrected_miss"] == 1
    assert row["delayed_retrieval"] == 0


def test_micro_step_is_a_path_and_does_not_make_the_chain_line(tmp_path: Path) -> None:
    root = _root(tmp_path)
    write_focus(
        root,
        open_with="open the project brief",
        format="retrieval",
        items=["CHEM — outline"],
        now=NOW,
    )
    write_focus(
        root,
        open_with="open the project brief again",
        format="retrieval",
        items=["CHEM — outline"],
        now=NOW + timedelta(hours=2),
    )
    assert _kinds(root) == ["micro_step_started"]
    trail = trail_payload(root, now=NOW)
    assert trail["line"] == ""
    assert trail["learning"] == []
    assert trail["workflow"][0]["label"] == "open the project brief"
    garden = garden_payload(root, now=NOW)
    assert garden["courses"][0]["path"] == 1
    assert garden["courses"][0]["delayed_retrieval"] == 0
    assert habit_path(root).is_file()


def test_budget_caps_now_and_does_not_change_due_reviews(tmp_path: Path) -> None:
    root = _root(tmp_path)
    past = NOW - timedelta(days=2)
    for index in range(3):
        add_item(
            root,
            course="MATH",
            claim=f"state fact number {index} about the unit",
            kind="declarative",
            checkpoint_due="2026-09-20",
            now=past,
        )
    later = NOW
    before = [item.id for item in due_reviews(root, now=later)]
    budget = review_budget(root, now=later)
    after = [item.id for item in due_reviews(root, now=later)]
    assert before == after
    assert budget["now"] <= 2
    assert budget["now"] == len(before)
    assert "exam ready" not in budget["line"]
    assert "you know this" not in budget["line"]
    sample = due_reviews(root, now=later)[0]
    future = counterfactual_due(sample)
    assert "exam ready" not in future
    assert "you know this" not in future
    assert "delayed-hit evidence" in future


def test_malformed_outcomes_are_skipped(tmp_path: Path) -> None:
    root = _root(tmp_path)
    path = outcomes_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('{"kind":"delayed_hit"}\nnot-json\n', encoding="utf-8")
    assert read_events(root) == []
    assert trail_payload(root, now=NOW)["line"] == ""
    assert garden_payload(root, now=NOW)["courses"] == []
