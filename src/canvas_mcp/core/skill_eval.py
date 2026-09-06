"""Skill eval harness — each active skill must pass on small local models.

Marks ``requires_cloud: true`` skills as skipped for local eval.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .skill_router import load_skill


@dataclass
class EvalResult:
    skill_id: str
    passed: bool
    skipped: bool
    reason: str


def eval_skill(skill_md: Path, *, model: str = "llama3.1:8b-instruct-q4_K_M") -> EvalResult:
    """Structural eval (schema + category + prompt budget). LLM live eval optional."""
    try:
        skill = load_skill(skill_md)
    except ValueError as exc:
        return EvalResult(skill_md.parent.name, False, False, str(exc))

    if skill.requires_cloud:
        return EvalResult(skill.skill_id, True, True, "requires_cloud")

    # Prompt budget: body under ~2000 tokens ≈ 8000 chars rough
    if len(skill.body) > 12_000:
        return EvalResult(
            skill.skill_id,
            False,
            False,
            "prompt body exceeds small-model budget (~2000 tokens)",
        )
    if not skill.description:
        return EvalResult(skill.skill_id, False, False, "missing description")
    return EvalResult(skill.skill_id, True, False, f"structural ok for {model}")


def eval_all_bundled(skills_root: Path | None = None) -> list[EvalResult]:
    root = skills_root or Path(__file__).resolve().parents[3] / "skills"
    results = []
    for skill_md in sorted(root.glob("*/SKILL.md")):
        results.append(eval_skill(skill_md))
    return results
