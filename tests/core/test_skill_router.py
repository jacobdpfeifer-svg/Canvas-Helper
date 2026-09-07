"""Skill router — keyword fallback, embedding rank, requires_cloud, ambiguity."""

from __future__ import annotations

import math
from pathlib import Path

import pytest

from canvas_mcp.core.skill_router import (
    SkillMeta,
    load_skill,
    main as skill_router_main,
    route_intent,
    route_skill,
    select_skill,
    skill_doc,
)
from canvas_mcp.core.user_root import ensure_user_root


def _meta(
    skill_id: str,
    *,
    name: str | None = None,
    description: str = "",
    requires_cloud: bool = False,
    body: str = "",
) -> SkillMeta:
    return SkillMeta(
        skill_id=skill_id,
        name=name or skill_id,
        description=description,
        schema_version=1,
        category="canvas_read",
        requires_cloud=requires_cloud,
        path=Path(f"/tmp/{skill_id}/SKILL.md"),
        body=body,
    )


def _unit_embed(text: str) -> list[float]:
    """Deterministic fake embedder: bag-of-words over a tiny vocabulary."""
    vocab = [
        "brief",
        "priority",
        "first",
        "week",
        "plan",
        "due",
        "sync",
        "canvas",
        "photo",
        "intake",
        "professor",
        "grade",
        "discussion",
        "cloud",
        "only",
    ]
    lower = text.lower()
    vec = [1.0 if tok in lower else 0.0 for tok in vocab]
    # Avoid zero vectors so cosine is defined.
    if not any(vec):
        vec[0] = 0.01
    norm = math.sqrt(sum(x * x for x in vec))
    return [x / norm for x in vec]


def test_keyword_select_picks_best_overlap():
    skills = [
        _meta("student-task-brief", description="priority brief what should I do first"),
        _meta("canvas-week-plan", description="plan my week what is due"),
        _meta("student-photo-intake", description="intake this photo class capture"),
    ]
    picked = select_skill(skills, "what should I do first", embedder=lambda _: None)
    assert picked is not None
    assert picked.skill_id == "student-task-brief"


def test_keyword_tie_breaks_by_skill_id():
    skills = [
        _meta("zebra-skill", description="alpha token"),
        _meta("alpha-skill", description="alpha token"),
    ]
    # Equal keyword score → sort by skill_id ascending; both score 1 on "alpha".
    # Ambiguous equal top → route returns None; select_skill mirrors that.
    result = route_skill(skills, "alpha", embedder=lambda _: None)
    assert result.ambiguous
    assert result.skill is None
    assert result.method == "keyword"


def test_requires_cloud_excluded_unless_allowed():
    skills = [
        _meta(
            "local-brief",
            description="brief me priority first",
            requires_cloud=False,
        ),
        _meta(
            "cloud-only",
            description="brief me priority first cloud only",
            requires_cloud=True,
        ),
    ]
    picked = select_skill(
        skills, "brief me priority first cloud only", embedder=lambda _: None
    )
    assert picked is not None
    assert picked.skill_id == "local-brief"

    picked_cloud = select_skill(
        skills,
        "brief me priority first cloud only",
        embedder=lambda _: None,
        allow_cloud=True,
    )
    assert picked_cloud is not None
    assert picked_cloud.skill_id == "cloud-only"


def test_embedding_rank_beats_keyword_distractor():
    skills = [
        _meta("canvas-week-plan", description="weekly due list plan my week"),
        _meta("student-task-brief", description="priority brief what first"),
        _meta("student-photo-intake", description="photo intake class capture"),
    ]
    result = route_skill(
        skills, "brief me on priority what first", embedder=_unit_embed
    )
    assert result.method == "embedding"
    assert result.skill is not None
    assert result.skill.skill_id == "student-task-brief"
    assert not result.ambiguous


def test_low_cosine_marks_ambiguous_and_returns_none():
    skills = [
        _meta("student-photo-intake", description="photo intake class capture"),
        _meta("canvas-week-plan", description="plan my week due list"),
    ]

    def orthogonal_embed(text: str) -> list[float]:
        # Query is orthogonal to both skill docs → cosine 0 < COSINE_MIN.
        if "unrelated" in text.lower():
            return [1.0, 0.0, 0.0]
        return [0.0, 1.0, 0.0]

    result = route_skill(
        skills, "totally unrelated query", embedder=orthogonal_embed
    )
    assert result.ambiguous
    assert result.skill is None
    assert result.method == "embedding"


def test_skill_doc_includes_triggers_section():
    skill = _meta(
        "student-instructor-profile",
        description="professor preferences",
        body="## Triggers\n\n- how does prof grade\n\n## Steps\n\n1. read syllabus\n",
    )
    doc = skill_doc(skill)
    assert "how does prof grade" in doc
    assert "## Steps" not in doc


def test_bundled_skills_load_and_route_keyword(tmp_path):
    ensure_user_root(tmp_path)
    # No active skills under user root → bundled fallback.
    result = route_intent(
        "plan my week what is due",
        user_root=tmp_path,
        embedder=lambda _: None,
        log=True,
    )
    assert result.skill is not None
    assert result.skill.skill_id == "canvas-week-plan"
    assert (tmp_path / "episodic.db").is_file()


def test_load_skill_requires_schema(tmp_path):
    skill_dir = tmp_path / "bad-skill"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text(
        "---\nname: bad\ndescription: x\n---\n\n# Bad\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="schema_version"):
        load_skill(skill_dir / "SKILL.md")


def test_cli_json_routes_bundled_skill(tmp_path, capsys):
    ensure_user_root(tmp_path)
    rc = skill_router_main(
        [
            "--user-root",
            str(tmp_path),
            "--json",
            "--no-log",
            "plan",
            "my",
            "week",
            "what",
            "is",
            "due",
        ]
    )
    assert rc == 0
    import json

    payload = json.loads(capsys.readouterr().out)
    assert payload["skill_id"] == "canvas-week-plan"
    assert payload["method"] in ("keyword", "embedding", "none")
