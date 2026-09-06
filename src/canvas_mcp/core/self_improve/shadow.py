"""Shadow-test provisional skills.

HARD BAN: never shadow-test write skills. This is a safety floor, not an
eval quality gate — contributors must not weaken this allowlist.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ..skill_router import READ_DRAFT_CATEGORIES, WRITE_SKILL_CATEGORIES, load_skill


@dataclass
class ShadowResult:
    allowed: bool
    provisional_better: bool | None
    reason: str
    critic_score: float | None = None


def shadow_test(
    provisional_skill_path: Path,
    *,
    baseline_ok: bool = True,
    provisional_ok: bool = True,
    critic_prefers_provisional: bool = True,
) -> ShadowResult:
    """Compare provisional vs normal path.

    Production will run both paths and score with a critic LLM. This function
    enforces the write-skill ban and records a simple success signal.
    """
    skill = load_skill(provisional_skill_path, provisional=True)
    if skill.category in WRITE_SKILL_CATEGORIES or skill.is_write_skill:
        return ShadowResult(
            allowed=False,
            provisional_better=None,
            reason="HARD BAN: write skills cannot be shadow-tested",
        )
    if skill.category not in READ_DRAFT_CATEGORIES:
        return ShadowResult(
            allowed=False,
            provisional_better=None,
            reason=f"Category {skill.category!r} not in read/draft allowlist",
        )
    if not provisional_ok:
        return ShadowResult(
            allowed=True,
            provisional_better=False,
            reason="provisional path failed",
            critic_score=0.0,
        )
    better = bool(critic_prefers_provisional and baseline_ok)
    return ShadowResult(
        allowed=True,
        provisional_better=better,
        reason="shadow ok" if better else "baseline preferred",
        critic_score=1.0 if better else 0.4,
    )
