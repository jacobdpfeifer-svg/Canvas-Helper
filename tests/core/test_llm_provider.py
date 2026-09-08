"""Hosted provider factory — no live network in the default suite."""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from canvas_mcp.core.llm_provider import (
    ChatMessage,
    ToolSpec,
    get_provider,
    provider_for_skill,
)
from canvas_mcp.core.prompt_assembly import AssembledTurn, chat_skill
from canvas_mcp.core.skill_eval import eval_skill
from canvas_mcp.core.skill_router import bundled_skills_dir, load_skill


def test_missing_key_does_not_call_network(monkeypatch):
    monkeypatch.delenv("PRODUCTNAME_LLM_API_KEY", raising=False)
    monkeypatch.delenv("PRODUCTNAME_LLM_WRITE_API_KEY", raising=False)
    monkeypatch.setenv("PRODUCTNAME_LLM_PROVIDER", "gemini")

    def _boom(*_args, **_kwargs):
        raise AssertionError("network client must not be constructed")

    monkeypatch.setattr("canvas_mcp.core.llm_provider.httpx.Client", _boom)
    provider = get_provider("fast")
    assert provider.embed("plan my week") is None
    result = provider.chat([ChatMessage(role="user", content="hi")])
    assert result.error == "missing_api_key"
    assert result.content == ""
    assert result.provider == "gemini"


def test_factory_selects_vendor_by_tier(monkeypatch):
    monkeypatch.setenv("PRODUCTNAME_LLM_PROVIDER", "gemini")
    monkeypatch.setenv("PRODUCTNAME_LLM_MODEL", "gemini-3.5-flash-lite")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_PROVIDER", "anthropic")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_MODEL", "claude-haiku-4-5")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_API_KEY", "sk-test")
    assert get_provider("fast").name == "gemini"
    write = get_provider("reliable")
    assert write.name == "anthropic"
    assert write.model == "claude-haiku-4-5"
    monkeypatch.setenv("PRODUCTNAME_LLM_PROVIDER", "nope")
    with pytest.raises(ValueError, match="unknown LLM provider"):
        get_provider("fast")
    with pytest.raises(ValueError, match="unknown model tier"):
        get_provider("fancy")


def test_gemini_chat_and_embed_are_mocked(monkeypatch):
    monkeypatch.setenv("PRODUCTNAME_LLM_PROVIDER", "gemini")
    monkeypatch.setenv("PRODUCTNAME_LLM_API_KEY", "test-key")
    monkeypatch.setenv("PRODUCTNAME_LLM_MODEL", "gemini-3.5-flash-lite")
    calls: list[tuple[str, dict]] = []

    class _Response:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    class _Client:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, url, params=None, json=None):
            calls.append((url, json or {}))
            if url.endswith(":embedContent"):
                return _Response({"embedding": {"values": [0.1, 0.2]}})
            return _Response(
                {
                    "candidates": [
                        {
                            "content": {
                                "parts": [
                                    {"text": "ok"},
                                    {
                                        "functionCall": {
                                            "name": "list_courses",
                                            "args": {"x": 1},
                                        }
                                    },
                                ]
                            }
                        }
                    ]
                }
            )

    monkeypatch.setattr("canvas_mcp.core.llm_provider.httpx.Client", _Client)
    provider = get_provider("fast")
    result = provider.chat(
        [ChatMessage(role="user", content="brief me")],
        tools=[ToolSpec(name="list_courses", description="list")],
    )
    assert result.content == "ok"
    assert result.tool_calls == [{"name": "list_courses", "arguments": {"x": 1}}]
    assert provider.embed("plan") == [0.1, 0.2]
    assert calls[0][1]["tools"][0]["functionDeclarations"][0]["name"] == "list_courses"
    assert "gemini-3.5-flash-lite:generateContent" in calls[0][0]


def test_anthropic_chat_is_mocked(monkeypatch):
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_PROVIDER", "anthropic")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_API_KEY", "sk-test")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_MODEL", "claude-haiku-4-5")

    class _Block:
        type = "text"
        text = "TOOL_OK"

    class _Response:
        content = [_Block()]

    class _Messages:
        def create(self, **kwargs):
            assert kwargs["model"] == "claude-haiku-4-5"
            assert kwargs["tools"][0]["name"] == "submit_assignment"
            return _Response()

    class _Client:
        def __init__(self, api_key):
            assert api_key == "sk-test"
            self.messages = _Messages()

    import sys
    import types

    fake = types.ModuleType("anthropic")
    fake.Anthropic = _Client
    monkeypatch.setitem(sys.modules, "anthropic", fake)
    provider = get_provider("reliable")
    result = provider.chat(
        [ChatMessage(role="user", content="submit?")],
        tools=[ToolSpec(name="submit_assignment", description="preview")],
    )
    assert result.content == "TOOL_OK"
    assert result.provider == "anthropic"
    assert provider.embed("unused") is None


def _turn() -> AssembledTurn:
    return AssembledTurn(
        tools=[],
        tools_hash="abc",
        messages=[ChatMessage(role="user", content="hi")],
        system="",
        profile="",
        volatile="",
        prefix="",
        method="structured",
    )


def test_chat_skill_resolves_provider_once(monkeypatch):
    calls: list[str] = []

    class _Provider:
        def __init__(self, name: str):
            self.name = name

        def chat(self, messages, tools=None):
            return SimpleNamespace(provider=self.name, content="ok", error=None)

    def _factory(tier: str = "fast"):
        calls.append(tier)
        return _Provider("anthropic" if tier == "reliable" else "gemini")

    monkeypatch.setattr("canvas_mcp.core.llm_provider.get_provider", _factory)
    brief = load_skill(bundled_skills_dir() / "student-task-brief" / "SKILL.md")
    write = SimpleNamespace(model_tier="fast", is_write_skill=True)

    fast_result = chat_skill(brief, _turn())
    assert fast_result.provider == "gemini"
    assert calls == ["fast"]

    reliable_result = chat_skill(write, _turn())
    assert reliable_result.provider == "anthropic"
    assert calls == ["fast", "reliable"]


def test_live_eval_stays_structural_and_skips_without_network(tmp_path, monkeypatch):
    skill_dir = tmp_path / "student-task-brief"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(
        "---\nname: student-task-brief\ndescription: brief me\n"
        "schema_version: 1\ncategory: canvas_read\n"
        "model_tier: fast\nrequires_cloud: false\n---\n# brief\n",
        encoding="utf-8",
    )
    write_dir = tmp_path / "submit-hw"
    write_dir.mkdir()
    (write_dir / "SKILL.md").write_text(
        "---\nname: submit-hw\ndescription: submit work\n"
        "schema_version: 1\ncategory: canvas_submit\n"
        "model_tier: fast\nrequires_cloud: false\n---\n# submit\n",
        encoding="utf-8",
    )
    skill_md = skill_dir / "SKILL.md"

    def _boom(*_args, **_kwargs):
        raise AssertionError("network client must not be constructed")

    monkeypatch.setattr("canvas_mcp.core.llm_provider.httpx.Client", _boom)
    import anthropic

    monkeypatch.setattr(anthropic, "Anthropic", _boom)
    monkeypatch.delenv("PRODUCTNAME_LIVE_SKILL_EVAL", raising=False)
    structural = eval_skill(skill_md)
    assert structural.passed
    assert not structural.skipped
    assert structural.reason.startswith("structural ok")

    monkeypatch.setenv("PRODUCTNAME_LIVE_SKILL_EVAL", "1")
    monkeypatch.setenv("DEV_USER_ROOT", str(tmp_path / "user"))
    monkeypatch.delenv("PRODUCTNAME_LLM_API_KEY", raising=False)
    monkeypatch.delenv("PRODUCTNAME_LLM_WRITE_API_KEY", raising=False)
    monkeypatch.setenv("PRODUCTNAME_LLM_PROVIDER", "gemini")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_PROVIDER", "anthropic")
    skipped = eval_skill(skill_md)
    assert skipped.skipped
    assert skipped.reason == "live eval skipped — provider unreachable"
    write_skipped = eval_skill(write_dir / "SKILL.md")
    assert write_skipped.skipped
    assert write_skipped.reason == "live eval skipped — provider unreachable"


def test_anthropic_cache_breakpoint_is_on_last_stable_block(monkeypatch):
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_PROVIDER", "anthropic")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_API_KEY", "sk-test")
    seen: dict = {}

    class _Block:
        type = "text"
        text = "ok"

    class _Response:
        content = [_Block()]

    class _Messages:
        def create(self, **kwargs):
            seen.update(kwargs)
            return _Response()

    class _Client:
        def __init__(self, api_key):
            self.messages = _Messages()

    import sys
    import types

    fake = types.ModuleType("anthropic")
    fake.Anthropic = _Client
    monkeypatch.setitem(sys.modules, "anthropic", fake)
    provider = get_provider("reliable")
    result = provider.chat(
        [
            ChatMessage(role="system", content="skill instructions"),
            ChatMessage(role="system", content="learning profile", cache_breakpoint=True),
            ChatMessage(role="user", content="this week's inbox"),
        ]
    )
    assert result.content == "ok"
    system = seen["system"]
    assert isinstance(system, list)
    assert "cache_control" not in system[0]
    assert system[-1]["cache_control"] == {"type": "ephemeral"}
    assert system[-1]["text"] == "learning profile"
    assert seen["messages"][0]["content"] == "this week's inbox"


def test_provider_for_skill_uses_tier_once(monkeypatch):
    monkeypatch.setenv("PRODUCTNAME_LLM_PROVIDER", "gemini")
    monkeypatch.setenv("PRODUCTNAME_LLM_WRITE_PROVIDER", "anthropic")
    monkeypatch.delenv("PRODUCTNAME_LLM_API_KEY", raising=False)
    monkeypatch.delenv("PRODUCTNAME_LLM_WRITE_API_KEY", raising=False)
    fast = SimpleNamespace(model_tier="fast", is_write_skill=False)
    reliable = SimpleNamespace(model_tier="reliable", is_write_skill=False)
    write = SimpleNamespace(model_tier="fast", is_write_skill=True)
    assert provider_for_skill(fast).name == "gemini"
    assert provider_for_skill(reliable).name == "anthropic"
    assert provider_for_skill(write).name == "anthropic"
