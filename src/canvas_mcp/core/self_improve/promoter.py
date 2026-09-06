"""Promote provisional → active after k successes.

Counters live in calibration/permissions.yaml (skill_counters).
Skill body moves on the filesystem. Write skills are never promoted here.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from ..permissions import load_permissions, save_permissions
from ..skill_router import WRITE_SKILL_CATEGORIES, load_skill

DEFAULT_PROMOTE_K = 3


def promote_skill(
    user_root: Path,
    provisional_dir: Path,
    *,
    k_required: int = DEFAULT_PROMOTE_K,
    record_success: bool = True,
) -> Path | None:
    """Bump counter; on reaching k, move provisional → active.

    Returns the active path when promoted, else None.
    """
    skill_md = provisional_dir / "SKILL.md"
    skill = load_skill(skill_md, provisional=True)
    if skill.category in WRITE_SKILL_CATEGORIES:
        raise PermissionError(
            f"HARD BAN: refusing to promote write skill {skill.skill_id!r}"
        )

    state = load_permissions(user_root)
    if record_success:
        state.skill_counters[skill.skill_id] = (
            state.skill_counters.get(skill.skill_id, 0) + 1
        )
        save_permissions(user_root, state)

    count = state.skill_counters.get(skill.skill_id, 0)
    if count < k_required:
        return None

    active_dir = Path(user_root) / "skills" / "active" / skill.skill_id
    if active_dir.exists():
        shutil.rmtree(active_dir)
    shutil.move(str(provisional_dir), str(active_dir))
    return active_dir
