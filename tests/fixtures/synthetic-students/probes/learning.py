"""Part 4 probe: confidence is not a hit, habit has no losable state, commitments stay local,
exam moves remap (or honestly skip), legacy learn_loop hits do not earn study credit.

    PYTHONPATH=src .venv/bin/python tests/fixtures/synthetic-students/probes/learning.py <scratch_root>

Run against a throwaway root: it rewrites inbox/courses/ASEN2402.md checkpoints.
"""

from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from canvas_mcp.core import commitment, habit, learn_loop, progress
from canvas_mcp.core.study.service import StudyService

NOW = datetime(2026, 10, 5, 15, 0, tzinfo=timezone.utc)
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"{'ok  ' if ok else 'FAIL'} {name}: {detail}")


def set_checkpoints(root: Path, body: str) -> None:
    path = root / "inbox" / "courses" / "ASEN2402.md"
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"(## Checkpoints\n\n).*?(\n\n## )", lambda m: m.group(1) + body + m.group(2), text, count=1, flags=re.S)
    path.write_text(text, encoding="utf-8")


def main() -> int:
    root = Path(sys.argv[1]).resolve()
    items_path = root / "inbox" / "learn" / "items.yaml"
    if items_path.exists():
        items_path.unlink()

    # --- confidence / same-session are not hits
    item = learn_loop.add_item(root, course="ASEN 2402", claim="Second law: entropy of an isolated system never decreases",
                               kind="declarative", checkpoint_due="2026-10-12", now=NOW)
    before = item.stability
    after_conf = learn_loop.record_outcome(root, item.id, "hit", confidence_claimed=True, now=NOW + timedelta(minutes=5))
    check("confidence 'I know this' before the scheduled check is not a hit", after_conf.stability == before and after_conf.stability_delta is None,
          f"{before} -> {after_conf.stability}")
    after_same = learn_loop.record_outcome(root, item.id, "hit", same_session=True, now=NOW + timedelta(days=2))
    check("same-session hit after due does not move stability", after_same.stability == before, f"{before} -> {after_same.stability}")

    # --- exam move: ISO checkpoint (the format learn_loop parses)
    set_checkpoints(root, "- **Midterm 1** — due 2026-10-14; 100 pts (quiz)")
    res = learn_loop.reconcile_from_inbox(root, now=NOW)
    moved = [i for i in learn_loop.load_items(root) if i.id == item.id][0]
    check("reconcile remaps one moved exam (ISO checkpoint)", res["updated"] == 1 and moved.checkpoint_due == "2026-10-14", json.dumps(res["remaps"]))

    # --- ambiguous move is skipped with a reason
    learn_loop.add_item(root, course="ASEN 2402", claim="Isentropic process: ds = 0 for reversible adiabatic",
                        kind="declarative", checkpoint_due="2026-10-13", now=NOW)
    set_checkpoints(root, "- **Midterm 1** — due 2026-10-16; 100 pts (quiz)\n- **Quiz 3** — due 2026-10-18; 10 pts (quiz)")
    res = learn_loop.reconcile_from_inbox(root, now=NOW)
    check("ambiguous exam move is skipped, not guessed", res["updated"] == 0 and any(s["reason"] == "ambiguous checkpoint move" for s in res["skipped"]),
          json.dumps(res["skipped"]))

    # --- exam move in a legacy course file (display only, written before the due token existed)
    learn_loop.reconcile_checkpoints(root, [{"course": "ASEN 2402", "from_due": "2026-10-13", "to_due": "2026-10-14"}], now=NOW)
    set_checkpoints(root, "- **Midterm 1** — due Oct 16, 7:00 PM MDT; 100 pts (quiz)")
    res = learn_loop.reconcile_from_inbox(root, now=NOW)
    check("[legacy format] reconcile sees a moved exam written as 'Oct 16, 7:00 PM MDT'", res["updated"] >= 1,
          f"updated={res['updated']} remaps={res['remaps']} skipped={res['skipped']}")

    # --- exam move in the format sync writes today (formatCheckpoints → formatDueForSync)
    set_checkpoints(root, "- **Midterm 1** — due Oct 18, 7:00 PM MDT <!-- due:2026-10-18 -->; 100 pts (quiz)")
    res = learn_loop.reconcile_from_inbox(root, now=NOW)
    check("[sync format] reconcile sees a moved exam carrying the due token", res["updated"] >= 1,
          f"updated={res['updated']} remaps={res['remaps']} skipped={res['skipped']}")

    # --- habit: continuity is exposure only
    hab = root / "inbox" / "habit.yaml"
    if hab.exists():
        hab.unlink()
    tz = timezone.utc
    lines = []
    for day in (NOW, NOW + timedelta(days=1), NOW + timedelta(days=4)):
        payload = habit.record_brief_day(root, now=day, tz=tz)
        lines.append(payload["line"])
    no_count = all(not re.search(r"\d", ln or "") for ln in lines)
    keys = set(payload)
    check("habit line never names a count", no_count, json.dumps(lines))
    check("habit payload has no leaderboard/rank/streak-loss field", not ({"rank", "leaderboard", "lost", "broken"} & keys), sorted(keys).__str__())

    # --- commitment stays local
    auth_before = sorted(p.name for p in (root / "auth").rglob("*"))
    ledger_before = (root / "ledger.jsonl").read_text(encoding="utf-8")
    commitment.set_commitment(root, text="Start PS6 problem 1 after lab", deadline=(NOW + timedelta(hours=6)).isoformat(), course="APPM 2360", now=NOW)
    done = commitment.resolve_commitment(root, "met", now=NOW + timedelta(hours=7))
    auth_after = sorted(p.name for p in (root / "auth").rglob("*"))
    check("commitment add → resolve writes no auth/connector/ledger state", auth_before == auth_after and ledger_before == (root / "ledger.jsonl").read_text(encoding="utf-8"),
          f"status={done.status}")
    check("commitment vocabulary", True, f"statuses={commitment.STATUSES} (doc says started/kept/released)")

    # --- legacy learn_loop delayed hit vs study credit
    study_before = StudyService(root, now=NOW).status()["items"]
    legacy = learn_loop.add_item(root, course="APPM 2360 (synthetic)", claim="Saddle: eigenvalues of opposite sign", kind="declarative",
                                 checkpoint_due="2026-10-21", now=NOW - timedelta(days=6))
    learn_loop.record_outcome(root, legacy.id, "miss", now=NOW - timedelta(days=5))
    hit = learn_loop.record_outcome(root, legacy.id, "hit", now=NOW + timedelta(days=1))
    study_after = StudyService(root, now=NOW + timedelta(days=1)).status()["items"]
    check("legacy learn_loop delayed hit leaves study projection unchanged", study_before["stability"] == study_after["stability"],
          f"learn_loop {hit.stability}; study {study_after['stability']}")
    kinds = [e.get("kind") for e in progress.read_events(root)]
    check("legacy hit lands in progress outcomes (separate projection)", True, f"progress kinds={kinds}")

    failed = [n for n, ok, _ in results if not ok]
    print("PASS" if not failed else f"FAIL {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
