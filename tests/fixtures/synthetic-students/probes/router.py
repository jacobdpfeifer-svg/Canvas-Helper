"""Part 3 probe: AGENTS.md skill index vs router vs skills/ directories, plus inbox-slice honesty.

    PYTHONPATH=src .venv/bin/python tests/fixtures/synthetic-students/probes/router.py <user_root> [<user_root> ...]
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from canvas_mcp.core.prompt_assembly import assemble_turn
from canvas_mcp.core.skill_router import (
    bundled_skills_dir,
    load_skills_for_routing,
    route_skill,
)

REPO = Path(__file__).resolve().parents[4]

# One utterance per AGENTS.md index row (quoted trigger where the row has one).
CASES = [
    ("plan my week", "canvas-week-plan"),
    ("what's due this week", "canvas-week-plan"),
    ("what should I do first", "student-task-brief"),
    ("brief me", "student-task-brief"),
    ("brief me on ASEN 2402", "student-course-arc"),
    ("how does my thermodynamics prof grade", "student-instructor-profile"),
    ("intake this photo", "student-photo-intake"),
    ("coach me through this", "student-screen-coach"),
    ("where do I click", "student-screen-coach"),
    ("explain tangent", "student-concept-visual"),
    ("update my inbox", "student-inbox-week"),
    ("discussion draft", "canvas-discussion-facilitator"),
    ("semester overview", "student-degree-progress"),
    ("what's my GPA", "student-gpa"),
    ("what if I get a B in ASEN 2402", "student-gpa"),
    ("what should I take next", "student-course-plan"),
    ("plan next semester", "student-course-plan"),
    ("prep for advising", "student-registration-prep"),
    ("registration", "student-registration-prep"),
    ("SSO sync", "student-canvas-browser"),
]


# Natural phrasings outside the declared triggers. Reported, not gated: the keyword
# fallback refuses a <2:1 lead by design (KEYWORD_AMBIGUOUS_RATIO).
INFO = [
    ("draft my discussion post", "canvas-discussion-facilitator"),
    ("help me draft a discussion reply", "canvas-discussion-facilitator"),
    ("run the SSO sync", "student-canvas-browser"),
]


def index_skills() -> set[str]:
    text = (REPO / "AGENTS.md").read_text(encoding="utf-8")
    section = text.split("## Skill index", 1)[1].split("\n## ", 1)[0]
    return set(re.findall(r"\|\s*`([a-z0-9-]+)`\s*\|", section))


def main() -> int:
    roots = [Path(p).resolve() for p in sys.argv[1:]]
    failures: list[str] = []
    dirs = {p.parent.name for p in bundled_skills_dir().glob("*/SKILL.md")}
    idx = index_skills()
    print("dirs without index row:", sorted(dirs - idx) or "none")
    print("index rows without dir:", sorted(idx - dirs) or "none")
    if dirs ^ idx:
        failures.append("index/dir mismatch")

    skills = load_skills_for_routing(roots[0] if roots else None)
    for trigger, want in CASES:
        res = route_skill(skills, trigger)
        got = res.skill.skill_id if res.skill else None
        ok = got == want
        print(f"{'ok  ' if ok else 'MISS'} {trigger!r:52} -> {got} ({res.method}{', ambiguous' if res.ambiguous else ''}) want {want}")
        if not ok:
            failures.append(f"route:{trigger}")

    for trigger, want in INFO:
        res = route_skill(skills, trigger)
        got = res.skill.skill_id if res.skill else None
        print(f"info {trigger!r:52} -> {got} ({res.method}{', ambiguous' if res.ambiguous else ''}) want {want}")

    for root in roots:
        week = (root / "inbox" / "week.md")
        week_md = week.read_text(encoding="utf-8") if week.is_file() else ""
        updated = re.search(r"^Updated:\s*(\S+)", week_md, re.M)
        fixture_dues = set(re.findall(r"\|\s*([A-Z][a-z]{2} \d{1,2}, [^|]+?)\s*\|", week_md))
        for trigger in ("plan my week", "what should I do first", "brief me on ASEN 2402"):
            skill = route_skill(skills, trigger).skill
            turn = assemble_turn(skill, root, trigger)
            vol = turn.volatile
            seen_dues = set(re.findall(r"([A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2} [AP]M [A-Z]{3})", vol))
            invented = seen_dues - fixture_dues
            upd_visible = bool(updated) and updated.group(1) in (turn.volatile + "".join(m.content for m in turn.messages))
            print(f"[{root.name}] {trigger!r:28} skill={skill.skill_id:20} slice={turn.method:10} dues={len(seen_dues)} invented={sorted(invented) or 0} updated_line_in_turn={upd_visible if updated else 'n/a (no week)'}")
            if invented:
                failures.append(f"invented:{root.name}:{trigger}")
    print("PASS" if not failures else f"FAIL {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
