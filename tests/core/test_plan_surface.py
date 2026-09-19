"""plan_surface: one process, six sections, each isolated from the others."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from canvas_mcp.core import plan_surface


def test_fresh_profile_returns_every_section_in_its_empty_shape(tmp_path: Path) -> None:
    payload = plan_surface.plan_surface_payload(tmp_path)
    assert payload["ok"] is True
    assert payload["due"]["items"] == []
    assert payload["due"]["practice"]["state"]
    assert payload["streak"]["streak"] == 0
    assert payload["progress"]["courses"] == []
    assert payload["evaluation"]["ok"] is False
    assert payload["commitment"]["commitment"] is None
    assert payload["if_then"] == ""
    assert payload["errors"] == []


def test_one_broken_section_does_not_sink_the_others(
    tmp_path: Path, monkeypatch
) -> None:
    def boom(_root: Path):
        raise RuntimeError("corrupt state file")

    monkeypatch.setattr(plan_surface, "due_reviews_payload", boom)
    payload = plan_surface.plan_surface_payload(tmp_path)
    assert payload["ok"] is True
    assert payload["due"]["items"] == []
    assert payload["errors"] == ["due_reviews: RuntimeError: corrupt state file"]
    assert payload["streak"]["streak"] == 0


def test_cli_prints_one_json_object(tmp_path: Path) -> None:
    out = subprocess.run(
        [
            sys.executable,
            "-m",
            "canvas_mcp.core.plan_surface",
            "--json",
            "--user-root",
            str(tmp_path),
        ],
        capture_output=True,
        text=True,
        check=True,
        cwd=Path(__file__).resolve().parents[2] / "src",
    )
    payload = json.loads(out.stdout.strip().splitlines()[-1])
    assert set(payload) >= {
        "due",
        "if_then",
        "streak",
        "progress",
        "evaluation",
        "commitment",
        "errors",
    }
