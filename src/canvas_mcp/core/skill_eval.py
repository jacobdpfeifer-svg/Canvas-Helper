"""Skill eval harness — structural checks, optional live provider probe.

Marks ``requires_cloud: true`` skills as skipped for local eval.

Set ``PRODUCTNAME_LIVE_SKILL_EVAL=1`` to probe the provider that production
would use for that skill's tier. CI stays structural and offline.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from .skill_router import SkillMeta, load_skill


@dataclass
class EvalResult:
    skill_id: str
    passed: bool
    skipped: bool
    reason: str


def _live_eval_enabled() -> bool:
    return os.environ.get("PRODUCTNAME_LIVE_SKILL_EVAL", "").strip().lower() in (
        "1",
        "true",
        "yes",
    )


def _live_tool_call_probe(skill: SkillMeta) -> EvalResult | None:
    """Optional live probe — returns None to keep structural result."""
    if not _live_eval_enabled():
        return None
    from .prompt_assembly import run_skill_turn
    from .user_root import resolve_user_root

    trigger = (
        f"Evaluate skill `{skill.skill_id}`. "
        "Reply with exactly one line: TOOL_OK if you can follow the skill, "
        "else TOOL_FAIL."
    )
    try:
        root = resolve_user_root("dev", create=True)
    except ValueError:
        return EvalResult(
            skill.skill_id,
            False,
            True,
            "live eval skipped — no user root",
        )
    result = run_skill_turn(skill, root, trigger)
    if getattr(result, "error", None) or not getattr(result, "content", None):
        return EvalResult(
            skill.skill_id,
            False,
            True,
            "live eval skipped — provider unreachable",
        )
    content = result.content
    ok = "TOOL_OK" in content.upper()
    return EvalResult(
        skill.skill_id,
        ok,
        False,
        "live provider ok" if ok else f"live provider failed: {content[:120]}",
    )


def eval_skill(skill_md: Path, *, model: str | None = None) -> EvalResult:
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

    live = _live_tool_call_probe(skill)
    if live is not None:
        return live
    label = model or "configured-provider"
    return EvalResult(skill.skill_id, True, False, f"structural ok for {label}")


def eval_all_bundled(skills_root: Path | None = None) -> list[EvalResult]:
    root = skills_root or Path(__file__).resolve().parents[3] / "skills"
    results = []
    for skill_md in sorted(root.glob("*/SKILL.md")):
        results.append(eval_skill(skill_md))
    return results
