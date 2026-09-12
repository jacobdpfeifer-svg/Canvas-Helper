"""W2 bundled-skill tests.

The self-improve cluster/draft/shadow/promote pipeline this file used to
exercise is deleted — see docs/handoff/canvas-focus-pivot-2026-09-11.md.
What remains here is unrelated to that pipeline: it checks the bundled
skills themselves.
"""

from __future__ import annotations

from pathlib import Path

from canvas_mcp.core.skill_eval import eval_all_bundled


def test_bundled_skills_have_schema_version():
    root = Path(__file__).resolve().parents[2] / "skills"
    for skill_md in root.glob("*/SKILL.md"):
        # Bundled skills live at repo skills/; may need copy for load_skill schema
        text = skill_md.read_text()
        assert "schema_version" in text, skill_md


def test_skill_eval_bundled():
    results = eval_all_bundled()
    assert results
    assert all(r.passed for r in results)
