"""Tests for episodic → semantic distillation and MEMORY.md provenance."""

from __future__ import annotations

import json
import time
from pathlib import Path

from canvas_mcp.core.llm_provider import ChatResult
from canvas_mcp.core.memory import add_memory, search_memory
from canvas_mcp.core.self_improve.distill import distill_episodic_to_semantic
from canvas_mcp.core.self_improve.distill import main as distill_main
from canvas_mcp.core.self_improve.logger import RequestLog, log_request
from canvas_mcp.core.user_root import ensure_user_root
from canvas_mcp.core.watermark import EPISODIC_DISTILL, read_watermark


def test_add_memory_md_fallback_persists_provenance(tmp_path: Path) -> None:
    ensure_user_root(tmp_path)
    result = add_memory(
        tmp_path,
        "Student prefers Sunday week planning",
        metadata={"source": "episodic", "episodic_ids": [1, 2, 3]},
    )
    assert result["backend"] == "memory_md"
    text = (tmp_path / "MEMORY.md").read_text(encoding="utf-8")
    assert "Student prefers Sunday week planning" in text
    assert "provenance:" in text
    assert '"episodic_ids":[1,2,3]' in text or '"episodic_ids": [1, 2, 3]' in text
    hits = search_memory(tmp_path, "Sunday week")
    assert any("Sunday week planning" in h for h in hits)
    # Provenance comment stripped from search hits.
    assert all("provenance:" not in h for h in hits)


def test_distill_writes_fact_with_provenance(tmp_path: Path) -> None:
    ensure_user_root(tmp_path)
    base = time.time()
    ids = []
    for i in range(5):
        rid = log_request(
            tmp_path,
            RequestLog(
                timestamp=base + i,
                intent_tag="canvas-week-plan",
                tools_used=["select_skill"],
                artifacts_produced=[],
                success_signal="accept",
                latency_ms=12.0,
                transcript_excerpt=f"plan my week sunday night run {i}",
            ),
        )
        ids.append(rid)

    def fake_chat(system: str, user: str) -> ChatResult:
        assert "durable" in system.lower() or "Extract" in system or "fact" in system.lower()
        assert "canvas-week-plan" in user
        payload = [
            {
                "fact": "Student re-routes to canvas-week-plan on Sunday nights",
                "episodic_ids": ids[:3],
            }
        ]
        return ChatResult(content=json.dumps(payload), model="fake", provider="fake")

    summary = distill_episodic_to_semantic(tmp_path, chat_fn=fake_chat)
    assert summary.facts_extracted == 1
    assert summary.rows_processed == 5
    assert summary.watermark is not None
    assert read_watermark(tmp_path, EPISODIC_DISTILL) == summary.watermark

    md = (tmp_path / "MEMORY.md").read_text(encoding="utf-8")
    assert "canvas-week-plan on Sunday nights" in md
    assert "episodic_ids" in md
    for eid in ids[:3]:
        assert str(eid) in md


def test_distill_watermark_idempotent(tmp_path: Path) -> None:
    ensure_user_root(tmp_path)
    base = time.time()
    for i in range(4):
        log_request(
            tmp_path,
            RequestLog(
                timestamp=base + i,
                intent_tag="student-task-brief",
                tools_used=["select_skill"],
                artifacts_produced=[],
                success_signal="accept",
                latency_ms=8.0,
                transcript_excerpt=f"brief me #{i}",
            ),
        )

    calls = {"n": 0}

    def fake_chat(system: str, user: str) -> ChatResult:
        calls["n"] += 1
        return ChatResult(
            content=json.dumps(
                [
                    {
                        "fact": "Student often asks for a task brief",
                        "episodic_ids": [1, 2],
                    }
                ]
            ),
            model="fake",
            provider="fake",
        )

    first = distill_episodic_to_semantic(tmp_path, chat_fn=fake_chat)
    assert first.facts_extracted == 1
    assert first.rows_processed == 4
    assert calls["n"] == 1

    second = distill_episodic_to_semantic(tmp_path, chat_fn=fake_chat)
    assert second.facts_extracted == 0
    assert second.rows_processed == 0
    assert calls["n"] == 1  # no second LLM call when batch empty

    md = (tmp_path / "MEMORY.md").read_text(encoding="utf-8")
    assert md.count("Student often asks for a task brief") == 1


def test_distill_cli_json(tmp_path: Path, capsys, monkeypatch) -> None:
    ensure_user_root(tmp_path)
    log_request(
        tmp_path,
        RequestLog(
            timestamp=time.time(),
            intent_tag="canvas-week-plan",
            tools_used=["select_skill"],
            artifacts_produced=[],
            success_signal="accept",
            latency_ms=5.0,
            transcript_excerpt="plan my week",
        ),
    )

    def fake_chat(system: str, user: str) -> ChatResult:
        return ChatResult(content="[]", model="fake", provider="fake")

    monkeypatch.setattr(
        "canvas_mcp.core.prompt_assembly.chat_synthesis",
        fake_chat,
    )
    rc = distill_main(["--user-root", str(tmp_path), "--json"])
    assert rc == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["rows_processed"] == 1
    assert payload["facts_extracted"] == 0
