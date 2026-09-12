"""Teach-hint: format override, due nudge, concept key — teaching skills only."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from canvas_mcp.core.learning_profile import (
    apply_onboarding_answers,
    load_learning_profile,
)
from canvas_mcp.core.prompt_assembly import assemble_turn
from canvas_mcp.core.skill_router import bundled_skills_dir, load_skill
from canvas_mcp.core.teach_hint import (
    due_nudge,
    parse_focus_obstacle,
    render_teach_hint,
    resolve_format,
    write_focus,
    write_nudge,
)
from canvas_mcp.core.user_root import ensure_user_root

NOW = datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc)

WEEK = """# Week ahead

| Course | Assignment | Due | Points | Type | Notes |
|--------|------------|-----|--------|------|-------|
| MATH 1300 | Chain rule set | 2026-09-20 23:59 | 20 | assignment | |
| CSCI 1300 | Quiz 1 | 2026-09-18 23:59 | 10 | quiz | outcome:quiz |
| ENGL 1001 | Pre-reading | 2026-09-09 23:59 | 5 | assignment | outcome:reading |
"""

CHAIN_ONLY = """# Week ahead

| Course | Assignment | Due | Points | Type | Notes |
|--------|------------|-----|--------|------|-------|
| MATH 1300 | Chain rule set | 2026-09-12 23:59 | 20 | assignment | |
"""


def _root(tmp_path: Path) -> Path:
    return ensure_user_root(tmp_path / "student")


def _skill(name: str):
    return load_skill(bundled_skills_dir() / name / "SKILL.md")


def test_novice_overrides_global_retrieval(tmp_path: Path) -> None:
    root = _root(tmp_path)
    apply_onboarding_answers(
        root,
        practice_format="retrieval",
        autonomy="choices",
        chunk_size="short",
    )
    course = root / "inbox" / "courses" / "MATH1300.md"
    course.parent.mkdir(parents=True, exist_ok=True)
    course.write_text("prior_knowledge: novice\n", encoding="utf-8")

    hint = render_teach_hint(
        root,
        "brief me on MATH 1300",
        WEEK,
        now=NOW,
    )
    assert "format: worked_example" in hint
    assert "prior_knowledge=novice overrides global retrieval" in hint


def test_experienced_prefers_retrieval(tmp_path: Path) -> None:
    root = _root(tmp_path)
    apply_onboarding_answers(
        root,
        practice_format="worked_example",
        autonomy="choices",
        chunk_size="short",
    )
    course = root / "inbox" / "courses" / "MATH1300.md"
    course.parent.mkdir(parents=True, exist_ok=True)
    course.write_text("prior_knowledge: experienced\n", encoding="utf-8")

    hint = render_teach_hint(root, "what next in MATH 1300", WEEK, now=NOW)
    assert "format: retrieval" in hint
    assert "experienced prefers retrieval" in hint


def test_resolve_format_developing_uses_global() -> None:
    fmt, because = resolve_format("worked_example", "developing")
    assert fmt == "worked_example"
    assert "global practice_format" in because
    fmt, because = resolve_format("retrieval", None)
    assert fmt == "worked_example"
    assert "missing prior_knowledge treated as novice" in because


def test_due_nudge_prepends_open_with(tmp_path: Path) -> None:
    root = _root(tmp_path)
    write_nudge(
        root,
        assignment_id="12345",
        course_code="MATH",
        prompt="state the chain rule; do not open notes",
        exam_due="2026-09-15",
        now=datetime(2026, 9, 1, 12, 0, tzinfo=timezone.utc),
    )
    assert due_nudge(root, now=NOW) is not None

    hint = render_teach_hint(root, "what should I do first", CHAIN_ONLY, now=NOW)
    assert hint.startswith("Open with: state the chain rule")
    assert 'spacing: surface nudge "state the chain rule' in hint


def test_non_teaching_skill_gets_no_hint(tmp_path: Path) -> None:
    root = _root(tmp_path)
    skill = _skill("student-assignment-triage")
    turn = assemble_turn(
        skill,
        root,
        "what should I do first",
        week_md=WEEK,
    )
    assert "Teach-hint" not in turn.volatile


def test_teaching_skill_injects_hint_without_busting_prefix(tmp_path: Path) -> None:
    root = _root(tmp_path)
    skill = _skill("student-task-brief")
    turn = assemble_turn(skill, root, "what should I do first", week_md=WEEK)
    assert "do_first: MATH 1300 — Chain rule set" in turn.volatile
    assert "<!-- cache:profile -->" in turn.prefix
    assert "do_first:" not in turn.prefix
    rendered = turn.rendered()
    assert rendered.index("<!-- cache:profile -->") < rendered.index("<!-- cache:volatile -->")
    assert rendered.index("<!-- cache:volatile -->") < rendered.index("do_first:")


def test_diagram_only_for_spatial_title(tmp_path: Path) -> None:
    root = _root(tmp_path)
    hint = render_teach_hint(root, "what should I do first", WEEK, now=NOW)
    assert "chain_rule_composition" in hint
    reading = """| Course | Assignment | Due | Type | Notes |
|--------|------------|-----|------|-------|
| ENGL | Pre-reading chapter 2 | 2026-09-09 | assignment | reading |
"""
    reading_hint = render_teach_hint(root, "what should I do first", reading, now=NOW)
    assert "diagram: no" in reading_hint


def test_expired_exam_nudge_is_dropped(tmp_path: Path) -> None:
    root = _root(tmp_path)
    write_nudge(
        root,
        assignment_id="9",
        course_code="MATH",
        prompt="old check",
        exam_due="2026-09-20",
        now=datetime(2026, 9, 1, tzinfo=timezone.utc),
    )
    assert due_nudge(root, now=datetime(2026, 9, 21, tzinfo=timezone.utc)) is None


def test_write_focus_round_trip(tmp_path: Path) -> None:
    root = _root(tmp_path)
    path = write_focus(
        root,
        open_with="state the chain rule; do not open notes",
        format="worked_example",
        items=["MATH — Chain rule set — due Thu — Check: state the rule"],
    )
    text = path.read_text(encoding="utf-8")
    assert "Open with: state the chain rule" in text
    assert "Format: worked_example" in text
    assert text.startswith("Updated:")
    assert "Obstacle:" not in text


def test_obstacle_is_optional_and_kept_until_cleared(tmp_path: Path) -> None:
    root = _root(tmp_path)
    path = write_focus(
        root,
        open_with="state the chain rule",
        format="retrieval",
        items=["MATH — Chain rule — due Thu — Check: state the rule"],
        obstacle="If I open the other tab, then close it and do only the Check",
    )
    assert "Obstacle: If I open the other tab" in path.read_text(encoding="utf-8")
    write_focus(
        root,
        open_with="state the product rule",
        format="retrieval",
        items=["MATH — Product rule — due Fri — Check: state it"],
    )
    kept = path.read_text(encoding="utf-8")
    assert parse_focus_obstacle(kept) == (
        "If I open the other tab, then close it and do only the Check"
    )
    write_focus(
        root,
        open_with="state the product rule",
        format="retrieval",
        items=["MATH — Product rule — due Fri — Check: state it"],
        clear_obstacle=True,
    )
    assert parse_focus_obstacle(path.read_text(encoding="utf-8")) is None


def test_miss_start_bias_uses_why_due_clause(tmp_path: Path) -> None:
    from datetime import timedelta

    from canvas_mcp.core.learn_loop import add_item, load_items, record_outcome, why_due
    from canvas_mcp.core.teach_hint import build_teach_hint

    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    due_at = datetime.fromisoformat(item.next_review_at) + timedelta(hours=1)
    record_outcome(root, item.id, "miss", now=due_at)
    stored = load_items(root)[0]
    assert stored.start_with_example is True
    opened = due_at + timedelta(hours=5)
    clause = why_due(stored, opened)
    hint = build_teach_hint(root, "what should I do first", CHAIN_ONLY, now=opened)
    assert hint.format == "worked_example"
    assert hint.because == clause
    assert "last retrieval missed" not in hint.because
    rendered = render_teach_hint(
        root, "what should I do first", CHAIN_ONLY, now=opened
    )
    assert rendered.count(clause) == 1


def test_format_reply_records_signal(tmp_path: Path) -> None:
    from canvas_mcp.core.teach_hint import record_format_reply

    root = _root(tmp_path)
    apply_onboarding_answers(
        root,
        practice_format="worked_example",
        autonomy="choices",
        chunk_size="short",
    )
    assert record_format_reply(root, "just tell me the time") is None
    assert record_format_reply(root, "quiz me instead") == "retrieval"
    profile = load_learning_profile(root)
    assert profile.signal_counts["practice_format"]["retrieval"] == 1
