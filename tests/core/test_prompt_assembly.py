"""Cache-order prompt assembly — stable prefix, volatile tail last."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from canvas_mcp.core.llm_provider import ChatResult
from canvas_mcp.core.prompt_assembly import (
    ToolListChanged,
    ToolSession,
    assemble_turn,
    tools_for_skill,
)
from canvas_mcp.core.skill_router import bundled_skills_dir, execute_intent, load_skill
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


def _naive_dump(skill_body: str, week_md: str) -> str:
    """Unstructured dump this assembly replaces: skill prose plus the full week table."""
    return f"{skill_body.strip()}\n\n{week_md.strip()}\n"


def test_assembled_prompt_before_after_drops_unrelated_rows(user_root: Path) -> None:
    skill = _brief()
    trigger = "brief me on CSCI1300 type:quiz due 2026-09-10"
    before = _naive_dump(skill.body, WEEK)
    session = ToolSession()
    first = assemble_turn(
        skill,
        user_root,
        trigger,
        week_md=WEEK,
        catalog_md=CATALOG,
        session=session,
    )
    second = assemble_turn(
        skill,
        user_root,
        f"{trigger} — other note",
        week_md=WEEK.replace("Quiz 1", "Quiz 1 redo"),
        catalog_md=CATALOG,
        session=session,
    )
    after = first.rendered()

    assert "PHYS 1110" in before
    assert "HW 3" in before
    assert "<!-- cache:tools -->" not in before

    tools_at = after.index("<!-- cache:tools -->")
    system_at = after.index("<!-- cache:system -->")
    profile_at = after.index("<!-- cache:profile -->")
    volatile_at = after.index("<!-- cache:volatile -->")
    assert tools_at < system_at < profile_at < volatile_at

    assert "submit_assignment" not in {tool.name for tool in first.tools}
    assert first.tools_hash == second.tools_hash
    assert first.prefix == second.prefix
    assert first.volatile != second.volatile
    assert "Quiz 1" in first.volatile
    assert "PHYS 1110" not in first.volatile
    assert "HW 3" not in first.volatile
    assert "Lab 2" not in first.volatile
    assert first.method == "metadata"


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
    assert "Do not read or paste the full" in first.system
    assert "Read `{user_root}/inbox/week.md`" not in first.system
    assert "## Instructions" in first.system
    assert "## Learning profile" in first.profile
    assert first.messages[1].cache_breakpoint is True
    assert first.messages[2].cache_breakpoint is False
    courses = next(tool for tool in first.tools if tool.name == "list_courses")
    assert courses.parameters.get("type") == "object"
    assert "include_concluded" in courses.parameters.get("properties", {})


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


class _RecordingProvider:
    def __init__(self) -> None:
        self.calls: list[tuple[list, list | None]] = []

    def chat(self, messages, tools=None):
        self.calls.append((messages, tools))
        return ChatResult(content="ok", model="fake", provider="fake")


def _payload_text(messages, tools) -> str:
    tools_blob = json.dumps(
        [{"name": tool.name, "description": tool.description} for tool in tools or []],
        sort_keys=True,
    )
    parts = [f"<!-- cache:tools -->\n{tools_blob}"]
    parts.extend(message.content for message in messages)
    return "\n".join(parts)


def test_execute_intent_sends_cache_ordered_payload(user_root: Path) -> None:
    """One real skill invocation: the provider sees tools, then skill+profile, then inbox."""
    (user_root / "inbox" / "week.md").write_text(WEEK, encoding="utf-8")
    (user_root / "inbox" / "courses" / "CSCI1300.md").write_text(CATALOG, encoding="utf-8")
    provider = _RecordingProvider()
    trigger = "what should I do first CSCI1300 type:quiz due 2026-09-10"

    result, chat = execute_intent(
        trigger,
        user_root=user_root,
        embedder=lambda _: None,
        log=False,
        provider=provider,
    )

    assert result.skill is not None
    assert result.skill.skill_id == "student-task-brief"
    assert chat is not None
    assert chat.content == "ok"
    assert len(provider.calls) == 1
    messages, tools = provider.calls[0]
    assert tools
    tool_names = {tool.name for tool in tools}
    assert "submit_assignment" not in tool_names
    assert tools_for_skill(result.skill) == tools

    assert messages[0].content.startswith("<!-- cache:system -->")
    assert "# Skill: student-task-brief" in messages[0].content
    assert "## Instructions" in messages[0].content
    assert messages[1].content.startswith("<!-- cache:profile -->")
    assert "## Learning profile" in messages[1].content
    assert "<!-- cache:volatile -->" in messages[-1].content
    assert messages[-1].content.index(trigger) < messages[-1].content.index(
        "<!-- cache:volatile -->"
    )

    payload = _payload_text(messages, tools)
    tools_at = payload.index("<!-- cache:tools -->")
    system_at = payload.index("<!-- cache:system -->")
    profile_at = payload.index("<!-- cache:profile -->")
    volatile_at = payload.index("<!-- cache:volatile -->")
    assert tools_at < system_at < profile_at < volatile_at
    assert "Quiz 1" in payload[volatile_at:]
    assert "PHYS 1110" not in payload[volatile_at:]
    assert "HW 3" not in payload[volatile_at:]
    assert "Lab 2" not in payload[volatile_at:]
    assert "Catalog slice" in payload[volatile_at:]


def test_no_hand_assembled_chat_outside_prompt_assembly() -> None:
    root = Path(__file__).resolve().parents[2] / "src" / "canvas_mcp"
    allowed = {
        root / "core" / "prompt_assembly.py",
        root / "core" / "llm_provider.py",
    }
    hits: list[str] = []
    for path in root.rglob("*.py"):
        if path in allowed:
            continue
        for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if "ChatMessage(" in line or ".chat([" in line:
                hits.append(f"{path}:{lineno}:{line.strip()}")
    assert hits == []
