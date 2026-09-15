"""Professional-context cache: sourced rows, refusal sentinel, one-shot show."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from canvas_mcp.core.claim_context import (
    REFUSAL_APPLICATION,
    context_for_display,
    context_skill_rules,
    is_refusal_rows,
    mark_context_shown,
    needs_context,
    refusal_rows,
    set_professional_context,
    validate_professional_context,
)
from canvas_mcp.core.claim_context import (
    main as claim_context_main,
)
from canvas_mcp.core.learn_loop import add_item, due_reviews_payload, load_items
from canvas_mcp.core.user_root import ensure_user_root

NOW = datetime(2026, 9, 8, 18, 0, tzinfo=timezone.utc)


def _root(tmp_path: Path) -> Path:
    return ensure_user_root(tmp_path / "student")


def _two_rows() -> list[dict[str, str]]:
    return [
        {
            "application": "Control systems use rate-of-change to stabilize plants",
            "field": "control engineering",
            "source_title": "IEEE Control Systems primer",
            "source_url": "https://example.org/ieee-control",
        },
        {
            "application": "Pharmacokinetics models concentration change over time",
            "field": "clinical pharmacy",
            "source_title": "ASHP kinetics overview",
            "source_url": "https://example.org/ashp-kinetics",
        },
    ]


def test_validate_requires_two_distinct_fields() -> None:
    with pytest.raises(ValueError, match="distinct fields"):
        validate_professional_context(
            [
                {
                    "application": "a",
                    "field": "same",
                    "source_title": "t1",
                    "source_url": "https://a.example",
                },
                {
                    "application": "b",
                    "field": "same",
                    "source_title": "t2",
                    "source_url": "https://b.example",
                },
            ]
        )


def test_validate_rejects_incomplete_rows() -> None:
    with pytest.raises(ValueError, match="source_title"):
        validate_professional_context(
            [
                {
                    "application": "a",
                    "field": "eng",
                    "source_title": "",
                    "source_url": "https://a.example",
                },
                {
                    "application": "b",
                    "field": "med",
                    "source_title": "t2",
                    "source_url": "https://b.example",
                },
            ]
        )


def test_validate_rejects_non_dict_rows() -> None:
    with pytest.raises(ValueError, match="JSON object"):
        validate_professional_context(["a", "b"])


def test_refusal_sentinel(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule for composites",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    assert needs_context(item)
    set_professional_context(root, item.id, refusal_rows())
    again = load_items(root)[0]
    assert not needs_context(again)
    assert is_refusal_rows(again.professional_context)
    assert context_for_display(again) is None


def test_set_and_mark_shown_yaml_roundtrip(tmp_path: Path) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the product rule for derivatives",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    set_professional_context(root, item.id, _two_rows())
    cached = load_items(root)[0]
    assert not needs_context(cached)
    assert len(cached.professional_context or []) == 2
    assert context_for_display(cached) is not None
    mark_context_shown(root, item.id)
    shown = load_items(root)[0]
    assert shown.context_shown is True
    assert context_for_display(shown) is None
    set_professional_context(root, item.id, refusal_rows())
    refused = load_items(root)[0]
    assert refused.professional_context[0]["application"] == REFUSAL_APPLICATION
    assert not needs_context(refused)


def test_due_payload_omits_professional_context(tmp_path: Path) -> None:
    """Dock cards stay free of context; skills own opt-in display."""
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the chain rule for composites",
        kind="declarative",
        checkpoint_due="2026-09-08",
        now=NOW - timedelta(days=2),
    )
    set_professional_context(root, item.id, _two_rows())
    payload = due_reviews_payload(root, now=NOW)
    assert payload["items"]
    assert "professional_context" not in payload["items"][0]
    cached = load_items(root)[0]
    assert context_for_display(cached) is not None
    mark_context_shown(root, item.id)
    again = due_reviews_payload(root, now=NOW)
    assert "professional_context" not in again["items"][0]


def test_cli_set_refuse_and_rules(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the quotient rule for derivatives",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    assert claim_context_main(["rules"]) == 0
    rules = capsys.readouterr().out
    assert "RateMyProfessors" in rules
    assert "2 independent" in context_skill_rules()

    assert (
        claim_context_main(
            [
                "--user-root",
                str(root),
                "set",
                "--id",
                item.id,
                "--rows",
                json.dumps(_two_rows()),
            ]
        )
        == 0
    )
    assert (
        claim_context_main(
            ["--user-root", str(root), "--json", "needs", "--id", item.id]
        )
        == 0
    )
    needs_out = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
    assert needs_out["needs_context"] is False

    assert (
        claim_context_main(
            ["--user-root", str(root), "mark-shown", "--id", item.id]
        )
        == 0
    )
    assert load_items(root)[0].context_shown is True


def test_cli_set_malformed_json_reports_error_not_traceback(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the quotient rule for derivatives",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    assert (
        claim_context_main(
            ["--user-root", str(root), "set", "--id", item.id, "--rows", "{not json"]
        )
        == 1
    )
    assert capsys.readouterr().err.strip()


def test_cli_set_non_dict_rows_reports_error_not_traceback(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    """--rows '["a","b"]' is valid JSON but the wrong shape; must not crash."""
    root = _root(tmp_path)
    item = add_item(
        root,
        course="MATH",
        claim="state the quotient rule for derivatives",
        kind="declarative",
        checkpoint_due="2026-09-20",
        now=NOW,
    )
    assert (
        claim_context_main(
            ["--user-root", str(root), "set", "--id", item.id, "--rows", '["a","b"]']
        )
        == 1
    )
    assert "JSON object" in capsys.readouterr().err
