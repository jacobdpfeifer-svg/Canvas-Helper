"""Skill router — load active + provisional SKILL.md bundles.

Anthropic / Hermes / agentskills.io compatible. Every skill MUST declare
``schema_version`` in frontmatter; unsupported versions are refused.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

SUPPORTED_SCHEMA_VERSIONS = frozenset({1})
SKILL_SCHEMA_VERSION = 1

# Categories that self-improve may never shadow-test or auto-promote.
WRITE_SKILL_CATEGORIES = frozenset(
    {
        "canvas_submit",
        "canvas_quiz_submit",
        "email_send",
        "rsvp_paid",
        "lti_submit",
        "proctoring_launch",
        "canvas_group",
        "canvas_exam_proctored",
        "calendar_delete",
    }
)

READ_DRAFT_CATEGORIES = frozenset(
    {
        "canvas_read",
        "canvas_discussion_draft",
        "email_draft",
        "email_triage",
        "photo_intake",
        "audio_capture",
        "calendar",  # creates are reversible; deletes are write
        "rsvp_free",
        "skill_promotion",
    }
)


@dataclass
class SkillMeta:
    skill_id: str
    name: str
    description: str
    schema_version: int
    category: str
    requires_cloud: bool
    path: Path
    body: str
    frontmatter: dict[str, Any] = field(default_factory=dict)
    provisional: bool = False

    @property
    def is_write_skill(self) -> bool:
        return self.category in WRITE_SKILL_CATEGORIES


_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    match = _FM_RE.match(text)
    if not match:
        return {}, text
    fm: dict[str, Any] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        fm[key.strip()] = val.strip().strip("\"'")
    return fm, match.group(2)


def load_skill(path: Path, *, provisional: bool = False) -> SkillMeta:
    text = path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    schema_version = int(fm.get("schema_version") or 0)
    if schema_version not in SUPPORTED_SCHEMA_VERSIONS:
        raise ValueError(
            f"Unsupported or missing schema_version in {path} "
            f"(got {schema_version!r}, supported={sorted(SUPPORTED_SCHEMA_VERSIONS)})"
        )
    skill_id = path.parent.name
    return SkillMeta(
        skill_id=skill_id,
        name=str(fm.get("name") or skill_id),
        description=str(fm.get("description") or ""),
        schema_version=schema_version,
        category=str(fm.get("category") or "canvas_read"),
        requires_cloud=str(fm.get("requires_cloud") or "false").lower()
        in ("1", "true", "yes"),
        path=path,
        body=body,
        frontmatter=fm,
        provisional=provisional,
    )


def load_skills(user_root: Path) -> list[SkillMeta]:
    """Load active then provisional skills from the user root."""
    skills: list[SkillMeta] = []
    for rel, provisional in (("skills/active", False), ("skills/provisional", True)):
        root = Path(user_root) / rel
        if not root.is_dir():
            continue
        for skill_md in sorted(root.glob("*/SKILL.md")):
            try:
                skills.append(load_skill(skill_md, provisional=provisional))
            except ValueError:
                continue
    return skills


def select_skill(skills: list[SkillMeta], trigger: str) -> SkillMeta | None:
    """Naive trigger match on name + description (small-LLM will replace)."""
    needle = trigger.lower()
    scored: list[tuple[int, SkillMeta]] = []
    for skill in skills:
        hay = f"{skill.name} {skill.description} {skill.skill_id}".lower()
        score = sum(1 for tok in needle.split() if tok and tok in hay)
        if score:
            scored.append((score, skill))
    if not scored:
        return None
    scored.sort(key=lambda x: (-x[0], x[1].skill_id))
    return scored[0][1]


def bundled_skills_dir() -> Path:
    """Repo-shipped skills/ (copied into user root on onboarding)."""
    return Path(__file__).resolve().parents[3] / "skills"
