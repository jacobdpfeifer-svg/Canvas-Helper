"""Draft provisional SKILL.md bundles from repeat clusters."""

from __future__ import annotations

from pathlib import Path

from ..skill_router import READ_DRAFT_CATEGORIES, SKILL_SCHEMA_VERSION
from .cluster import RepeatCluster


def draft_provisional_skill(
    user_root: Path,
    cluster: RepeatCluster,
    *,
    category: str = "canvas_read",
    name: str | None = None,
) -> Path:
    """Write a provisional skill. Refuses write categories."""
    if category not in READ_DRAFT_CATEGORIES:
        raise PermissionError(
            f"Refusing to draft write-category skill {category!r} "
            "(self-improve safety floor)"
        )

    skill_id = (name or cluster.intent_tag).lower().replace(" ", "-")
    skill_id = "".join(c if c.isalnum() or c in "-_" else "-" for c in skill_id)
    dest_dir = Path(user_root) / "skills" / "provisional" / skill_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    skill_md = dest_dir / "SKILL.md"

    examples = "\n".join(f"- {ex}" for ex in cluster.sample_excerpts if ex) or "- (none)"
    content = f"""---
name: {skill_id}
description: Auto-drafted from repeated intent `{cluster.intent_tag}` (n={cluster.size})
schema_version: {SKILL_SCHEMA_VERSION}
category: {category}
requires_cloud: false
---

# {skill_id}

Auto-authored provisional skill. Shadow-tested before promotion.

## Trigger

Intent tag: `{cluster.intent_tag}`

## Examples from cluster

{examples}

## Tool plan

1. Load relevant inbox / course memory
2. Execute the repeated workflow with the same tool sequence observed in the cluster
3. Narrate outcome; do not perform gated writes
"""
    skill_md.write_text(content, encoding="utf-8")
    return skill_md
