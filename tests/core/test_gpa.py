"""Tests for local GPA arithmetic."""

from __future__ import annotations

from pathlib import Path

import yaml

from canvas_mcp.core.gpa import (
    DEFAULT_GRADE_SCALE,
    CourseGrade,
    cumulative_gpa,
    estimate_from_user_root,
    letter_to_points,
    load_credit_hours,
    missing_credits,
    scale_for_school,
    term_gpa,
    what_if,
)


def test_letter_to_points_cu_edges():
    scale = scale_for_school("cu-boulder")
    assert letter_to_points("A-", scale) == 3.7
    assert letter_to_points("B+", scale) == 3.3
    assert letter_to_points("a-", scale) == 3.7
    assert letter_to_points("P", scale) is None
    assert letter_to_points("W", scale) is None
    assert letter_to_points("I", scale) is None
    assert letter_to_points("ZZ", scale) is None


def test_default_scale_when_unknown_school():
    assert letter_to_points("A", DEFAULT_GRADE_SCALE) == 4.0
    assert scale_for_school("no-such-school")["A"] == 4.0


def test_term_gpa_basic():
    courses = [
        CourseGrade("CSCI1300", "A-", credits=4),
        CourseGrade("MATH2300", "B+", credits=5),
    ]
    result = term_gpa(courses, scale=DEFAULT_GRADE_SCALE)
    # (3.7*4 + 3.3*5) / 9 = (14.8 + 16.5) / 9 = 3.478...
    assert result.ok
    assert result.gpa == round((3.7 * 4 + 3.3 * 5) / 9, 3)
    assert result.quality_hours == 9


def test_term_gpa_excludes_pass_and_missing_credits():
    courses = [
        CourseGrade("CSCI1300", "A", credits=4),
        CourseGrade("ELECT1000", "P", credits=1),
        CourseGrade("HIST1010", "B"),  # no credits
    ]
    result = term_gpa(courses, credit_hours={"CSCI1300": 4})
    assert result.gpa == 4.0
    assert len(result.included) == 1
    reasons = {c.code: r for c, r in result.skipped}
    assert "ELECT1000" in reasons
    assert "HIST1010" in reasons
    assert "missing" in reasons["HIST1010"]


def test_missing_credits():
    assert missing_credits(["CSCI1300", "MATH2300"], {"CSCI1300": 4}) == ["MATH2300"]


def test_what_if_override_and_extra():
    base = [
        CourseGrade("CSCI1300", "B", credits=4),
        CourseGrade("MATH2300", "B", credits=5),
    ]
    result = what_if(
        base,
        {"CSCI1300": "A"},
        extra=[CourseGrade("PHYS1110", "A-", credits=4)],
    )
    assert result.ok
    codes = {c.code: c.letter for c in result.included}
    assert codes["CSCI1300"] == "A"
    assert codes["PHYS1110"] == "A-"


def test_what_if_preserves_unrelated_duplicate_code():
    # A retake recorded once per term (e.g. failed then repeated CSCI1300)
    # must not be silently collapsed to one entry by an unrelated override.
    base = [
        CourseGrade("CSCI1300", "F", credits=4),
        CourseGrade("CSCI1300", "A", credits=4),
        CourseGrade("MATH2300", "B", credits=5),
    ]
    result = what_if(base, {"MATH2300": "A"})
    assert len(result.included) == 3
    letters = [c.letter for c in result.included if c.code == "CSCI1300"]
    assert sorted(letters) == ["A", "F"]


def test_resolve_credits_zero_is_not_missing():
    course = CourseGrade("SEM1000", "A", credits=0)
    result = term_gpa([course])
    assert len(result.included) == 1
    assert result.included[0].credits == 0
    assert result.skipped == []


def test_load_credit_hours_malformed_yaml_degrades(tmp_path: Path):
    path = tmp_path / "credit-hours.yaml"
    path.write_text("CSCI1300: 4\n  bad indent: [", encoding="utf-8")
    assert load_credit_hours(path) == {}


def test_cumulative_merges_history():
    history = [[CourseGrade("OLD1000", "A", credits=3)]]
    current = [CourseGrade("NEW2000", "B", credits=3)]
    result = cumulative_gpa(history, current=current)
    assert result.gpa == 3.5
    assert result.quality_hours == 6


def test_estimate_from_user_root(tmp_path: Path):
    cal = tmp_path / "calibration"
    inbox = tmp_path / "inbox"
    cal.mkdir()
    inbox.mkdir()
    (cal / "credit-hours.yaml").write_text(
        yaml.dump({"CSCI1300": 4, "MATH2300": 5}),
        encoding="utf-8",
    )
    (cal / "completed-terms.yaml").write_text(
        yaml.dump(
            {
                "terms": [
                    {
                        "term": "Fall 2025",
                        "courses": [
                            {"code": "OLD1000", "letter": "A", "credits": 3},
                        ],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    (inbox / "grades.yaml").write_text(
        yaml.dump(
            {
                "synced_at": "2026-09-13",
                "courses": [
                    {"code": "CSCI1300", "letter": "A-", "name": "CS 1"},
                    {"code": "MATH2300", "letter": "B+", "name": "Calc 2"},
                ],
            }
        ),
        encoding="utf-8",
    )
    out = estimate_from_user_root(
        tmp_path,
        school_slug="cu-boulder",
        overrides={"CSCI1300": "A"},
    )
    assert out["term"]["gpa"] is not None
    assert out["cumulative"]["gpa"] is not None
    assert out["what_if"]["gpa"] is not None
    assert out["missing_credit_hours"] == []
    assert "local estimate" in out["label"]


def test_load_credit_hours_empty(tmp_path: Path):
    assert load_credit_hours(tmp_path / "missing.yaml") == {}
