"""Tests for post-hoc weak-topic keyword matching."""

from __future__ import annotations

import pytest

from canvas_mcp.core.topics import (
    find_weak_topics,
    format_weak_topics_section,
    match_concept_key,
)


def test_match_concept_key_case_insensitive() -> None:
    assert match_concept_key("Tangent Lines Quiz") == "tangent_line"
    assert match_concept_key("INTRO TO DERIVATIVES") == "derivative_slope"
    assert match_concept_key("Secant vs limit lab") == "secant_vs_tangent"
    assert match_concept_key("Chain Rule worksheet") == "chain_rule_composition"


def test_match_concept_key_none_for_opaque() -> None:
    assert match_concept_key("Homework 3") is None
    assert match_concept_key("") is None


def test_find_weak_topics_filters_and_matches() -> None:
    rows = [
        {
            "name": "Tangent Lines Quiz",
            "score": 55,
            "points_possible": 100,
            "course_code": "MATH2300",
        },
        {
            "name": "Easy Derivatives",
            "score": 90,
            "points_possible": 100,
            "course_code": "MATH2300",
        },
        {
            "name": "Opaque HW",
            "score": 40,
            "points_possible": 100,
            "course_code": "MATH2300",
        },
        {
            "name": "Ungraded tangent",
            "score": None,
            "points_possible": 100,
            "course_code": "MATH2300",
        },
        {
            "name": "Zero points derivative",
            "score": 0,
            "points_possible": 0,
            "course_code": "MATH2300",
        },
        {
            "title": "Secant practice",
            "score": 6,
            "points_possible": 10,
            "course_code": "MATH2300",
            "scored_at": "2026-09-01",
        },
    ]
    weak = find_weak_topics(rows, threshold=0.7)
    keys = [w.concept_key for w in weak]
    assert keys == ["tangent_line", "secant_vs_tangent"]
    assert weak[0].score_fraction == 0.55
    assert weak[1].scored_at == "2026-09-01"


def test_find_weak_topics_uses_description() -> None:
    rows = [
        {
            "name": "Quiz 4",
            "description": "Covering the chain rule and composition",
            "score": 50,
            "points_possible": 100,
            "course_code": "CALC1",
        }
    ]
    weak = find_weak_topics(rows)
    assert len(weak) == 1
    assert weak[0].concept_key == "chain_rule_composition"


def test_find_weak_topics_rejects_bad_threshold() -> None:
    with pytest.raises(ValueError, match="threshold"):
        find_weak_topics([], threshold=0)
    with pytest.raises(ValueError, match="threshold"):
        find_weak_topics([], threshold=1.5)


def test_format_weak_topics_section() -> None:
    weak = find_weak_topics(
        [
            {
                "name": "Tangent Lines Quiz",
                "score": 55,
                "points_possible": 100,
                "course_code": "MATH2300",
                "scored_at": "2026-09-06",
            }
        ]
    )
    body = format_weak_topics_section(weak)
    assert "`tangent_line`" in body
    assert "0.55" in body
    assert format_weak_topics_section([]) == "-\n"
