"""Tests for deterministic concept diagram rendering."""

from __future__ import annotations

from pathlib import Path

import pytest

matplotlib = pytest.importorskip("matplotlib")
pytest.importorskip("numpy")

from canvas_mcp.core.diagram_gen import (  # noqa: E402
    CONCEPT_RENDERERS,
    DEFAULT_PARAMS,
    UnknownConceptError,
    list_concept_keys,
    params_hash,
    render_concept_diagram,
)

MIN_PNG_BYTES = 500


@pytest.mark.parametrize("concept_key", sorted(CONCEPT_RENDERERS))
def test_render_registered_concept_writes_png(tmp_path: Path, concept_key: str) -> None:
    out = tmp_path / f"{concept_key}.png"
    path = render_concept_diagram(concept_key, {}, out_path=out)
    assert path == out
    assert path.is_file()
    assert path.stat().st_size >= MIN_PNG_BYTES
    # PNG magic
    assert path.read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"


def test_unknown_concept_raises_clear_error(tmp_path: Path) -> None:
    with pytest.raises(UnknownConceptError, match="Unknown concept key"):
        render_concept_diagram("not_a_real_concept", {}, out_path=tmp_path / "x.png")


def test_same_params_same_hash_and_path(tmp_path: Path) -> None:
    user_root = tmp_path / "student"
    params = {"x0": 2.0, "y0": 2.0, "m": 1.0}
    p1 = render_concept_diagram("tangent_line", params, user_root=user_root)
    p2 = render_concept_diagram("tangent_line", params, user_root=user_root)
    assert p1 == p2
    merged = {**DEFAULT_PARAMS["tangent_line"], **params}
    assert params_hash(merged) in p1.name
    assert p1.parent == user_root / "inbox" / "captures" / "diagrams"


def test_list_concept_keys_matches_registry() -> None:
    assert set(list_concept_keys()) == set(CONCEPT_RENDERERS)
