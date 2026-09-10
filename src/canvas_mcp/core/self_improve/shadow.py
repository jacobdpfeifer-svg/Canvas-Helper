"""Shadow-test provisional skills.

HARD BAN: never shadow-test write skills. This is a safety floor, not an
eval quality gate — contributors must not weaken this allowlist.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

from ..skill_router import READ_DRAFT_CATEGORIES, WRITE_SKILL_CATEGORIES, load_skill

SynthesisFn = Callable[[str, str], Any]

_CRITIC_SYSTEM = """You compare a provisional skill draft against the baseline routing
behavior for the same intent, using held-out transcript excerpts.

Return ONLY a JSON object:
  {"provisional_better": bool, "score": float between 0 and 1, "reason": string}

Prefer the provisional skill only when it clearly handles the excerpts better
(clearer trigger coverage, safer read-only plan). Otherwise prefer baseline.
No markdown fences.
"""


@dataclass
class ShadowResult:
    allowed: bool
    provisional_better: bool | None
    reason: str
    critic_score: float | None = None


def _parse_critic(content: str) -> tuple[bool, float, str]:
    text = (content or "").strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            return False, 0.4, "critic parse failed; baseline preferred"
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return False, 0.4, "critic parse failed; baseline preferred"
    if not isinstance(data, dict):
        return False, 0.4, "critic parse failed; baseline preferred"
    better = bool(data.get("provisional_better"))
    try:
        score = float(data.get("score", 1.0 if better else 0.4))
    except (TypeError, ValueError):
        score = 1.0 if better else 0.4
    reason = str(data.get("reason") or ("shadow ok" if better else "baseline preferred"))
    return better, score, reason


def _llm_critic(
    *,
    provisional_body: str,
    excerpts: list[str],
    baseline_doc: str | None,
    semantic_context: list[str] | None,
    chat_fn: SynthesisFn | None,
) -> ShadowResult:
    from ..prompt_assembly import chat_synthesis

    synthesize = chat_fn or (
        lambda system, user: chat_synthesis(system=system, user=user)
    )
    user_parts = [
        "## Provisional skill\n",
        provisional_body[:4000],
        "\n\n## Baseline\n",
        (baseline_doc or "(existing router / bundled skill for this intent)").strip()[
            :2000
        ],
        "\n\n## Held-out excerpts\n",
        "\n".join(f"- {ex}" for ex in excerpts if ex) or "- (none)",
    ]
    if semantic_context:
        user_parts.extend(
            [
                "\n\n## Semantic memory context\n",
                "\n".join(f"- {c}" for c in semantic_context),
            ]
        )
    result = synthesize(_CRITIC_SYSTEM, "".join(user_parts))
    content = getattr(result, "content", None)
    if content is None and isinstance(result, dict):
        content = result.get("content", "")
    error = getattr(result, "error", None)
    if error:
        return ShadowResult(
            allowed=True,
            provisional_better=False,
            reason=f"critic unavailable ({error}); baseline preferred",
            critic_score=0.4,
        )
    better, score, reason = _parse_critic(str(content or ""))
    return ShadowResult(
        allowed=True,
        provisional_better=better,
        reason=reason,
        critic_score=score,
    )


def shadow_test(
    provisional_skill_path: Path,
    *,
    baseline_ok: bool = True,
    provisional_ok: bool = True,
    critic_prefers_provisional: bool = True,
    excerpts: list[str] | None = None,
    baseline_doc: str | None = None,
    semantic_context: list[str] | None = None,
    chat_fn: SynthesisFn | None = None,
) -> ShadowResult:
    """Compare provisional vs normal path.

    When ``excerpts`` is provided, score with a single LLM critic call via
    :func:`prompt_assembly.chat_synthesis`. Otherwise keep the boolean-stub
    path (tests / callers without samples). Write-skill allowlist checks
    always run first and are never bypassed.
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
    if excerpts is not None:
        return _llm_critic(
            provisional_body=skill.body
            or provisional_skill_path.read_text(encoding="utf-8"),
            excerpts=excerpts,
            baseline_doc=baseline_doc,
            semantic_context=semantic_context,
            chat_fn=chat_fn,
        )
    better = bool(critic_prefers_provisional and baseline_ok)
    return ShadowResult(
        allowed=True,
        provisional_better=better,
        reason="shadow ok" if better else "baseline preferred",
        critic_score=1.0 if better else 0.4,
    )
