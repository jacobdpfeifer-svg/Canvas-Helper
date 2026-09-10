"""Tests for shadow LLM critic and manual self-improve CLI."""

from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import patch

from canvas_mcp.core.llm_provider import ChatResult
from canvas_mcp.core.self_improve.cluster import RepeatCluster
from canvas_mcp.core.self_improve.drafter import draft_provisional_skill
from canvas_mcp.core.self_improve.logger import RequestLog, log_request
from canvas_mcp.core.self_improve.run import main as run_main
from canvas_mcp.core.self_improve.run import run_self_improve
from canvas_mcp.core.self_improve.shadow import shadow_test
from canvas_mcp.core.user_root import ensure_user_root


def test_shadow_llm_critic_prefers_provisional(tmp_path: Path) -> None:
    ensure_user_root(tmp_path)
    cluster = RepeatCluster(
        "notes-to-flashcards",
        5,
        [1, 2, 3, 4, 5],
        ["clean up notes", "make flashcards from lecture"],
    )
    skill_md = draft_provisional_skill(tmp_path, cluster, category="canvas_read")

    def fake_chat(system: str, user: str) -> ChatResult:
        assert "provisional" in system.lower() or "compare" in system.lower()
        assert "flashcards" in user.lower() or "notes" in user.lower()
        return ChatResult(
            content=json.dumps(
                {
                    "provisional_better": True,
                    "score": 0.91,
                    "reason": "covers flashcard excerpts",
                }
            ),
            model="fake",
            provider="fake",
        )

    result = shadow_test(
        skill_md,
        excerpts=["clean up notes", "make flashcards"],
        chat_fn=fake_chat,
    )
    assert result.allowed
    assert result.provisional_better is True
    assert result.critic_score == 0.91
    assert "flashcard" in result.reason


def test_shadow_llm_critic_prefers_baseline(tmp_path: Path) -> None:
    ensure_user_root(tmp_path)
    cluster = RepeatCluster("vague", 5, [1, 2, 3, 4, 5], ["hmm"])
    skill_md = draft_provisional_skill(tmp_path, cluster, category="canvas_read")

    def fake_chat(system: str, user: str) -> ChatResult:
        return ChatResult(
            content='{"provisional_better": false, "score": 0.2, "reason": "too vague"}',
            model="fake",
            provider="fake",
        )

    result = shadow_test(skill_md, excerpts=["hmm"], chat_fn=fake_chat)
    assert result.allowed
    assert result.provisional_better is False
    assert result.critic_score == 0.2


def test_shadow_write_ban_before_critic(tmp_path: Path) -> None:
    ensure_user_root(tmp_path)
    bad = tmp_path / "skills" / "provisional" / "evil-submit"
    bad.mkdir(parents=True)
    (bad / "SKILL.md").write_text(
        """---
name: evil-submit
description: submit homework
schema_version: 1
category: canvas_submit
requires_cloud: false
---
# evil
""",
        encoding="utf-8",
    )
    called = {"n": 0}

    def fake_chat(system: str, user: str) -> ChatResult:
        called["n"] += 1
        return ChatResult(
            content='{"provisional_better": true, "score": 1.0, "reason": "x"}',
            model="fake",
            provider="fake",
        )

    result = shadow_test(
        bad / "SKILL.md",
        excerpts=["submit this"],
        chat_fn=fake_chat,
    )
    assert not result.allowed
    assert called["n"] == 0


def test_run_self_improve_no_promote(tmp_path: Path) -> None:
    ensure_user_root(tmp_path)
    base = time.time()
    for i in range(6):
        log_request(
            tmp_path,
            RequestLog(
                timestamp=base + i,
                intent_tag="notes-to-flashcards",
                tools_used=["read_inbox"],
                artifacts_produced=["cards"],
                success_signal="accept",
                latency_ms=10.0,
                transcript_excerpt=f"clean up notes run {i}",
            ),
        )

    def fake_chat(system: str, user: str) -> ChatResult:
        return ChatResult(
            content=json.dumps(
                {
                    "provisional_better": True,
                    "score": 0.8,
                    "reason": "ok",
                }
            ),
            model="fake",
            provider="fake",
        )

    with patch(
        "canvas_mcp.core.self_improve.run.promote_skill", create=True
    ) as promote:
        summary = run_self_improve(tmp_path, min_size=5, chat_fn=fake_chat)
        promote.assert_not_called()

    assert summary.clusters_seen == 1
    assert summary.drafted == 1
    assert summary.shadow_passed == 1
    assert summary.items[0].provisional_better is True
    skill_path = Path(summary.items[0].skill_path or "")
    assert skill_path.is_file()
    # Stays provisional — not moved to active.
    assert "provisional" in str(skill_path)
    assert not (tmp_path / "skills" / "active" / "notes-to-flashcards").exists()


def test_run_cli_json(tmp_path: Path, capsys, monkeypatch) -> None:
    ensure_user_root(tmp_path)
    for i in range(5):
        log_request(
            tmp_path,
            RequestLog(
                timestamp=time.time() + i,
                intent_tag="canvas-week-plan",
                tools_used=["select_skill"],
                artifacts_produced=[],
                success_signal="accept",
                latency_ms=5.0,
                transcript_excerpt=f"plan my week {i}",
            ),
        )

    def fake_chat(system: str, user: str) -> ChatResult:
        return ChatResult(
            content='{"provisional_better": true, "score": 0.7, "reason": "ok"}',
            model="fake",
            provider="fake",
        )

    monkeypatch.setattr(
        "canvas_mcp.core.prompt_assembly.chat_synthesis",
        fake_chat,
    )
    rc = run_main(["--user-root", str(tmp_path), "--json", "--min-size", "5"])
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["clusters_seen"] == 1
    assert payload["drafted"] == 1
