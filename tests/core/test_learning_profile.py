"""Learning profile — defaults, onboarding write, USER.md render, observed flips."""

from __future__ import annotations

from pathlib import Path

import pytest

from canvas_mcp.core.learning_profile import (
    OBSERVED_SIGNAL_THRESHOLD,
    apply_onboarding_answers,
    load_learning_profile,
    record_signal,
    save_learning_profile,
)
from canvas_mcp.core.learning_profile import main as lp_cli_main
from canvas_mcp.core.user_root import ensure_user_root


@pytest.fixture
def user_root(tmp_path: Path) -> Path:
    root = ensure_user_root(tmp_path / "student")
    (root / "USER.md").write_text(
        "# USER.md\n\n## Identity\n\n- **Student:** (name)\n\n"
        "## Communication preferences\n\n- Prefer narrate-after\n",
        encoding="utf-8",
    )
    return root


def test_default_profile_has_no_vak_fields(user_root: Path) -> None:
    profile = load_learning_profile(user_root)
    assert profile.practice_format == "worked_example"
    assert profile.autonomy == "choices"
    assert profile.chunk_size == "short"
    assert profile.check_depth == "thorough"
    assert profile.practice_format_source == "default"
    assert not hasattr(profile, "visual")
    assert (user_root / "calibration" / "learning-profile.yaml").is_file()


def test_apply_onboarding_answers_sets_source_and_renders_user_md(
    user_root: Path,
) -> None:
    profile = apply_onboarding_answers(
        user_root,
        practice_format="retrieval",
        autonomy="directive",
        chunk_size="long",
        check_depth="light",
    )
    assert profile.practice_format == "retrieval"
    assert profile.practice_format_source == "onboarding_game"
    assert profile.check_depth == "light"
    assert profile.check_depth_source == "onboarding_game"

    text = (user_root / "USER.md").read_text(encoding="utf-8")
    assert "## Learning profile" in text
    assert "quiz/retrieval first" in text
    assert "tell them the next step directly" in text
    assert "trust and proceed" in text
    # Sections after the block (added later) survive the replace.
    assert "## Communication preferences" in text


def test_learning_profile_section_replaced_not_duplicated(user_root: Path) -> None:
    apply_onboarding_answers(
        user_root, practice_format="retrieval", autonomy="choices", chunk_size="short"
    )
    apply_onboarding_answers(
        user_root, practice_format="worked_example", autonomy="choices", chunk_size="short"
    )
    text = (user_root / "USER.md").read_text(encoding="utf-8")
    assert text.count("## Learning profile") == 1
    assert "worked examples first" in text


def test_record_signal_does_not_flip_below_threshold(user_root: Path) -> None:
    profile = None
    for _ in range(OBSERVED_SIGNAL_THRESHOLD - 1):
        profile = record_signal(user_root, "practice_format", "retrieval")
    assert profile is not None
    assert profile.practice_format == "worked_example"  # unchanged default
    assert profile.practice_format_source == "default"


def test_record_signal_flips_to_observed_at_threshold(user_root: Path) -> None:
    profile = None
    for _ in range(OBSERVED_SIGNAL_THRESHOLD):
        profile = record_signal(user_root, "practice_format", "retrieval")
    assert profile is not None
    assert profile.practice_format == "retrieval"
    assert profile.practice_format_source == "observed"


def test_record_signal_rejects_unknown_value(user_root: Path) -> None:
    with pytest.raises(ValueError):
        record_signal(user_root, "practice_format", "auditory")


def test_save_learning_profile_seeds_user_md_when_missing(tmp_path: Path) -> None:
    """Onboarding can run before USER.md exists; skills still need the section."""
    root = ensure_user_root(tmp_path / "no-user-md")
    (root / "USER.md").unlink(missing_ok=True)
    profile = apply_onboarding_answers(
        root,
        practice_format="retrieval",
        autonomy="directive",
        chunk_size="long",
    )
    assert profile.practice_format == "retrieval"
    assert (root / "calibration" / "learning-profile.yaml").is_file()
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert text.count("## Learning profile") == 1
    assert "quiz/retrieval first" in text
    assert "tell them the next step directly" in text


def test_save_learning_profile_seeds_stub_without_template(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    root = ensure_user_root(tmp_path / "no-template")
    (root / "USER.md").unlink(missing_ok=True)
    import canvas_mcp.core.learning_profile as lp

    monkeypatch.setattr(lp, "_USER_MD_TEMPLATE", tmp_path / "missing-template.md")
    save_learning_profile(root, lp.default_learning_profile())
    text = (root / "USER.md").read_text(encoding="utf-8")
    assert "## Learning profile" in text
    assert "worked examples first" in text


def test_cli_signal_records_and_can_flip(user_root: Path, capsys: pytest.CaptureFixture[str]) -> None:
    for _ in range(OBSERVED_SIGNAL_THRESHOLD):
        rc = lp_cli_main(
            [
                "--user-root",
                str(user_root),
                "--json",
                "signal",
                "--field",
                "practice_format",
                "--value",
                "retrieval",
            ]
        )
        assert rc == 0
    out = capsys.readouterr().out.strip().splitlines()[-1]
    import json

    payload = json.loads(out)
    assert payload["practice_format"] == "retrieval"
    assert payload["practice_format_source"] == "observed"


def test_cli_signal_rejects_bad_value(user_root: Path) -> None:
    with pytest.raises(SystemExit):
        lp_cli_main(
            [
                "--user-root",
                str(user_root),
                "signal",
                "--field",
                "practice_format",
                "--value",
                "visual",
            ]
        )


def test_cli_save_includes_check_depth(user_root: Path, capsys: pytest.CaptureFixture[str]) -> None:
    rc = lp_cli_main(
        [
            "--user-root",
            str(user_root),
            "--json",
            "save",
            "--practice-format",
            "retrieval",
            "--autonomy",
            "choices",
            "--chunk-size",
            "short",
            "--check-depth",
            "light",
        ]
    )
    assert rc == 0
    import json

    payload = json.loads(capsys.readouterr().out)
    assert payload["check_depth"] == "light"
    assert payload["check_depth_source"] == "onboarding_game"
