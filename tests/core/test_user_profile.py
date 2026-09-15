"""Onboarding identity/program answers -> USER.md sections (2026-09-13 audit fix)."""

from __future__ import annotations

from pathlib import Path

from canvas_mcp.core.user_profile import (
    OnboardingIdentity,
    apply_onboarding_identity,
)
from canvas_mcp.core.user_profile import main as user_profile_cli_main
from canvas_mcp.core.user_root import ensure_user_root


def test_seeds_user_md_from_template_when_missing(tmp_path: Path) -> None:
    root = ensure_user_root(tmp_path / "student")
    assert not (root / "USER.md").is_file()
    apply_onboarding_identity(root, OnboardingIdentity(name="Avery Student"))
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert "- **Student:** Avery Student" in text
    # Template's other sections (untouched by this writer) survive the seed.
    assert "## Learning profile" in text
    assert "## Advising notes" in text


def test_fills_program_interests_and_floors(tmp_path: Path) -> None:
    root = ensure_user_root(tmp_path / "student")
    identity = OnboardingIdentity(
        name="Avery Student",
        institution="University of Colorado Boulder",
        school_slug="cu-boulder",
        major="Computer Science",
        catalog_year="2025",
        target_grad_term="Spring 2028",
        interests=["backend infra", "ML systems"],
        good_standing_gpa="3.0",
        career_priorities=["startup", "software", "ops"],
        values=["hands-on", "flexible schedule"],
        transfer_notes="AP Calc BC credit for MATH 1300",
    )
    apply_onboarding_identity(root, identity)
    text = (root / "USER.md").read_text(encoding="utf-8")

    assert "- **Student:** Avery Student" in text
    assert "- **Institution:** University of Colorado Boulder" in text
    assert "- **Declared major(s):** Computer Science" in text
    assert "- **Catalog year:** 2025" in text
    assert "- **Target grad term:** Spring 2028" in text
    assert "- **Years at school (goal):** (e.g. 4)" in text
    assert "1. backend infra" in text
    assert "2. ML systems" in text
    assert "3. " in text  # still pads to the template's 3 ranked slots
    assert "- **Good-standing target GPA:** 3.0" in text
    assert "1. startup" in text
    assert "2. software" in text
    assert "3. ops" in text
    assert "- hands-on" in text
    assert "- flexible schedule" in text
    assert "- AP Calc BC credit for MATH 1300" in text
    assert "- **Goals:** startup, software, ops" in text


def test_institution_from_school_registry_when_blank(tmp_path: Path) -> None:
    root = ensure_user_root(tmp_path / "student")
    apply_onboarding_identity(
        root,
        OnboardingIdentity(name="Avery Student", school_slug="cu-boulder"),
    )
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert "- **Institution:** University of Colorado Boulder" in text
    assert "- **School slug:** cu-boulder" in text


def test_preserves_years_at_school_and_leaves_empty_values(tmp_path: Path) -> None:
    root = ensure_user_root(tmp_path / "student")
    apply_onboarding_identity(root, OnboardingIdentity(name="Seed"))
    seeded = (root / "USER.md").read_text(encoding="utf-8")
    seeded = seeded.replace(
        "- **Years at school (goal):** (e.g. 4)",
        "- **Years at school (goal):** 4",
    )
    seeded = seeded.replace(
        "## Values about college\n\n- (multi-select from onboarding)\n",
        "## Values about college\n\n- keep prior value\n",
    )
    (root / "USER.md").write_text(seeded, encoding="utf-8")

    apply_onboarding_identity(
        root,
        OnboardingIdentity(
            name="Avery Student",
            school_slug="cu-boulder",
            major="Computer Science",
            values=[],
        ),
    )
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert "- **Years at school (goal):** 4" in text
    assert "- keep prior value" in text
    assert "## Throwaway / low-attention courses" in text


def test_leaves_other_sections_untouched(tmp_path: Path) -> None:
    root = ensure_user_root(tmp_path / "student")
    (root / "USER.md").write_text(
        "# USER.md\n\n## Identity\n\n- **Student:** (name)\n\n"
        "## Learning profile\n\n- **Autonomy:** offer options _(source: default)_\n\n"
        "## Communication preferences\n\n- Prefer narrate-after\n",
        encoding="utf-8",
    )
    apply_onboarding_identity(root, OnboardingIdentity(name="Avery Student"))
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert "- **Student:** Avery Student" in text
    assert "- **Autonomy:** offer options _(source: default)_" in text
    assert "- Prefer narrate-after" in text


def test_blank_fields_keep_template_placeholders(tmp_path: Path) -> None:
    root = ensure_user_root(tmp_path / "student")
    apply_onboarding_identity(root, OnboardingIdentity())
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert "- **Student:** (name)" in text
    assert "- **Declared major(s):** (fill during onboarding)" in text
    assert "- **Good-standing target GPA:** 2.0" in text
    assert "- **Years at school (goal):** (e.g. 4)" in text
    # Empty values must not clobber the template Values placeholder.
    assert "- (multi-select from onboarding)" in text


def test_cli_writes_user_md(tmp_path: Path, capsys) -> None:
    root = ensure_user_root(tmp_path / "student")
    rc = user_profile_cli_main(
        [
            "--user-root",
            str(root),
            "--json",
            "save",
            "--name",
            "Avery Student",
            "--major",
            "Computer Science",
            "--interest",
            "backend infra",
            "--career-priority",
            "startup",
        ]
    )
    assert rc == 0
    import json

    payload = json.loads(capsys.readouterr().out)
    assert payload["ok"] is True
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert "- **Student:** Avery Student" in text
    assert "- **Declared major(s):** Computer Science" in text
