"""Part 2 probe: what one root can read must not appear when DEV_USER_ROOT points at the other.

    PYTHONPATH=src .venv/bin/python tests/fixtures/synthetic-students/probes/isolation.py \
        var/audit-user-roots/avery-chen var/audit-user-roots/blake-okonkwo
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from canvas_mcp.core.ledger import append_ledger
from canvas_mcp.core.prompt_assembly import assemble_turn
from canvas_mcp.core.skill_router import load_skills_for_routing, route_skill
from canvas_mcp.core.study.service import StudyService
from canvas_mcp.core.user_root import resolve_user_root

AVERY_MARKERS = ("APPM 2360", "ASEN 2401", "ASEN 2402", "ASEN 2501", "Problem Set 6", "AV-1", "AVERY-ODE", "Avery")


def view(root_arg: str) -> dict[str, str]:
    os.environ["DEV_USER_ROOT"] = str(Path(root_arg).resolve())
    root = resolve_user_root("dev")  # the same resolver every CLI uses
    skills = load_skills_for_routing(root)
    out: dict[str, str] = {"root": str(root)}
    for trigger in ("plan my week", "what should I do first"):
        skill = route_skill(skills, trigger).skill
        assert skill is not None, trigger
        turn = assemble_turn(skill, root, trigger)
        out[trigger] = turn.volatile + turn.profile
    week = root / "inbox" / "week.md"
    out["week"] = week.read_text(encoding="utf-8") if week.is_file() else ""
    out["ledger"] = (root / "ledger.jsonl").read_text(encoding="utf-8")
    out["study"] = json.dumps(StudyService(root).status() if (root / "study").exists() else {})
    return out


def main() -> int:
    avery_root, blake_root = sys.argv[1], sys.argv[2]
    os.environ["DEV_USER_ROOT"] = str(Path(avery_root).resolve())
    append_ledger(resolve_user_root("dev"), actor="audit", tool="isolation-probe", target="AVERY-ODE ledger marker", why="audit", outcome="success", category="audit")
    a, b = view(avery_root), view(blake_root)
    failures = []
    for key in ("plan my week", "what should I do first", "week", "ledger", "study"):
        a_hits = [m for m in AVERY_MARKERS if m in a[key]]
        b_hits = [m for m in AVERY_MARKERS if m in b[key]]
        print(f"{key:24} avery_markers={len(a_hits):2d} blake_markers={len(b_hits):2d} {b_hits or ''}")
        if b_hits:
            failures.append(key)
    if not any(m in a["plan my week"] for m in AVERY_MARKERS):
        failures.append("avery-turn-missing-own-data")
    print("roots:", a["root"] != b["root"], "PASS" if not failures else f"FAIL {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
