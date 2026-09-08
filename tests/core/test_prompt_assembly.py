"""Cache-order prompt assembly — stable prefix, volatile tail last."""

from __future__ import annotations

from pathlib import Path

import pytest

from canvas_mcp.core.prompt_assembly import (
    ToolListChanged,
    ToolSession,
    assemble_turn,
    tools_for_skill,
)
from canvas_mcp.core.skill_router import bundled_skills_dir, load_skill
from canvas_mcp.core.user_root import ensure_user_root

WEEK = """# Week ahead

Updated: 2026-09-07

## Due window (14d, open only)

| Course | Assignment | Due | Points | Type | Notes |
|--------|------------|-----|--------|------|-------|
| CSCI 1300 | Quiz 1 | 2026-09-10 23:59 | 10 | quiz | outcome:quiz |
| PHYS 1110 | Lab 2 | 2026-09-12 23:59 | 20 | assignment | outcome:lab |
| CSCI 1300 | HW 3 | 2026-09-20 23:59 | 15 | assignment | outcome:written |
"""

CATALOG = """## Assignment catalog

| Name | Due | Points | Type | Outcome | Status |
|------|-----|--------|------|---------|--------|
| Quiz 1 | 2026-09-10 | 10 | quiz | quiz | open |
| Lab 2 | 2026-09-12 | 20 | assignment | lab | open |
"""


@pytest.fixture
def user_root(tmp_path: Path) -> Path:
    return ensure_user_root(tmp_path / "student")


def _brief():
    return load_skill(bundled_skills_dir() / "student-task-brief" / "SKILL.md")


def test_assembled_prompt_is_stable_first_volatile_last(user_root: Path) -> None:
    skill = _brief()
    session = ToolSession()
    first = assemble_turn(
        skill,
        user_root,
        "brief me on CSCI1300 type:quiz due 2026-09-10",
        week_md=WEEK,
        catalog_md=CATALOG,
        session=session,
    )
    second = assemble_turn(
        skill,
        user_root,
        "brief me on CSCI1300 type:quiz due 2026-09-10 — other note",
        week_md=WEEK.replace("Quiz 1", "Quiz 1 redo"),
        catalog_md=CATALOG,
        session=session,
    )

    rendered = first.rendered()
    tools_at = rendered.index("<!-- cache:tools -->")
    system_at = rendered.index("<!-- cache:system -->")
    profile_at = rendered.index("<!-- cache:profile -->")
    volatile_at = rendered.index("<!-- cache:volatile -->")
    assert tools_at < system_at < profile_at < volatile_at

    assert "submit_assignment" not in {tool.name for tool in first.tools}
    assert first.tools_hash == second.tools_hash
    assert first.prefix == second.prefix
    assert first.volatile != second.volatile
    assert "Quiz 1" in first.volatile
    assert "PHYS 1110" not in first.volatile
    assert "Lab 2" not in first.volatile
    assert first.method == "metadata"
    assert "Disregard the rest" in first.system
    assert "## Instructions" in first.system
    assert "## Learning profile" in first.profile


def test_tool_list_cannot_change_mid_session(user_root: Path, monkeypatch) -> None:
    skill = _brief()
    session = ToolSession()
    assemble_turn(skill, user_root, "what should I do first", week_md=WEEK, session=session)
    original = tools_for_skill

    def drifted(skill_arg):
        tools = original(skill_arg)
        return [*tools, tools[0]]

    monkeypatch.setattr(
        "canvas_mcp.core.prompt_assembly.tools_for_skill", drifted
    )
    with pytest.raises(ToolListChanged):
        assemble_turn(
            skill, user_root, "what should I do first", week_md=WEEK, session=session
        )


def test_embeddings_skipped_when_metadata_narrows(user_root: Path) -> None:
    skill = _brief()

    def fail_if_called(_: str) -> list[float]:
        raise AssertionError("embeddings must not run after metadata narrows the slice")

    turn = assemble_turn(
        skill,
        user_root,
        "CSCI1300 type:quiz",
        week_md=WEEK,
        session=ToolSession(),
        embedder=fail_if_called,
    )
    assert turn.method == "metadata"
    assert "Quiz 1" in turn.volatile
    assert "HW 3" not in turn.volatile
