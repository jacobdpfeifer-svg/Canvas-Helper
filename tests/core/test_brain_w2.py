"""W2 brain / self-improve tests."""

from __future__ import annotations

import time
from pathlib import Path

import pytest

from canvas_mcp.core.self_improve.cluster import detect_repeat_clusters
from canvas_mcp.core.self_improve.drafter import draft_provisional_skill
from canvas_mcp.core.self_improve.logger import RequestLog, log_request
from canvas_mcp.core.self_improve.promoter import promote_skill
from canvas_mcp.core.self_improve.shadow import shadow_test
from canvas_mcp.core.skill_eval import eval_all_bundled
from canvas_mcp.core.user_root import ensure_user_root


def test_bundled_skills_have_schema_version():
    root = Path(__file__).resolve().parents[2] / "skills"
    for skill_md in root.glob("*/SKILL.md"):
        # Bundled skills live at repo skills/; may need copy for load_skill schema
        text = skill_md.read_text()
        assert "schema_version" in text, skill_md


def test_self_improve_e2e_read_skill(tmp_path):
    ensure_user_root(tmp_path)
    for i in range(5):
        log_request(
            tmp_path,
            RequestLog(
                timestamp=time.time(),
                intent_tag="notes-to-flashcards",
                tools_used=["read_inbox"],
                artifacts_produced=["cards"],
                success_signal="accept",
                latency_ms=10.0,
                transcript_excerpt=f"clean up notes run {i}",
            ),
        )
    clusters = detect_repeat_clusters(tmp_path, min_size=2)
    assert any(c.intent_tag == "notes-to-flashcards" for c in clusters)
    cluster = next(c for c in clusters if c.intent_tag == "notes-to-flashcards")
    skill_md = draft_provisional_skill(tmp_path, cluster, category="canvas_read")
    assert skill_md.is_file()
    result = shadow_test(skill_md)
    assert result.allowed
    assert result.provisional_better

    # k=3 promotions
    prov_dir = skill_md.parent
    assert promote_skill(tmp_path, prov_dir, k_required=3) is None
    # re-create provisional after first bump left it in place
    skill_md = draft_provisional_skill(tmp_path, cluster, category="canvas_read")
    prov_dir = skill_md.parent
    promote_skill(tmp_path, prov_dir, k_required=3)
    skill_md = draft_provisional_skill(tmp_path, cluster, category="canvas_read")
    active = promote_skill(tmp_path, skill_md.parent, k_required=3)
    assert active is not None
    assert (active / "SKILL.md").is_file()


def test_ban_write_skill_shadow_and_promote(tmp_path):
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
"""
    )
    result = shadow_test(bad / "SKILL.md")
    assert not result.allowed
    with pytest.raises(PermissionError):
        promote_skill(tmp_path, bad)


def test_ban_draft_write_category(tmp_path):
    ensure_user_root(tmp_path)
    from canvas_mcp.core.self_improve.cluster import RepeatCluster

    cluster = RepeatCluster("submit-hw", 3, [1, 2, 3], ["x"])
    with pytest.raises(PermissionError):
        draft_provisional_skill(tmp_path, cluster, category="canvas_submit")


def test_skill_eval_bundled():
    results = eval_all_bundled()
    assert results
    assert all(r.passed for r in results)
