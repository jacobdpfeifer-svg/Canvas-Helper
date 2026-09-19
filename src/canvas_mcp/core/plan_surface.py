"""One read for the Calendar (formerly Plan) tab.

The tab used to mount six independent daemon round-trips — due reviews,
check intention, brief streak, learn progress, evaluation compare, commitment
— each a fresh Python process (~150–300 ms of interpreter start-up apiece,
serialised on the Tauri main thread). ``plan_surface_payload`` computes all
six in one process. Every section is isolated: a missing or corrupt state
file on a fresh profile degrades that section to its empty shape instead of
failing the whole surface (the "clicking Plan doesn't work" symptom).

Nothing here writes. ``evaluate --compare`` is read-only (never ``--record``).
"""

from __future__ import annotations

import json
from collections.abc import Callable
from pathlib import Path
from typing import Any

from .commitment import commitment_payload
from .habit import streak_payload
from .learn_loop import (
    compare_evaluation_snapshots,
    due_reviews_payload,
    progress_payload,
)
from .learning_profile import load_learning_profile

EVAL_NOTE = (
    "A single window is not causal. A longer brief count is exposure, not success."
)

EMPTY_DUE: dict[str, Any] = {
    "items": [],
    "practice": {"state": "idle", "line": "", "obstacle": "", "open_with": ""},
    "coverage": [],
    "health": {
        "fragile": 0,
        "holding": 0,
        "durable": 0,
        "attempt_only": 0,
        "delayed_hit_signal": 0,
        "next_review_at": None,
        "next_checkpoint_due": None,
        "line": "",
    },
    "budget": {"now": 0, "later": 0, "later_checkpoint": None, "line": ""},
    "trail": {"line": "", "learning": [], "workflow": []},
    "garden": {"note": "", "courses": []},
    "commitment": {"commitment": None, "check_in": None, "line": ""},
}


def _section(name: str, fn: Callable[[], Any], empty: Any, errors: list[str]) -> Any:
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001 — one bad state file must not sink the tab
        errors.append(f"{name}: {type(exc).__name__}: {exc}")
        return empty


def plan_surface_payload(root: Path) -> dict[str, Any]:
    errors: list[str] = []
    due = _section(
        "due_reviews", lambda: due_reviews_payload(root), dict(EMPTY_DUE), errors
    )
    streak = _section(
        "brief_streak",
        lambda: streak_payload(root),
        {"streak": 0, "last_brief_date": None, "briefed_today": False, "line": ""},
        errors,
    )
    progress = _section(
        "learn_progress",
        lambda: progress_payload(root),
        {
            "courses": [],
            "totals": {"fragile": 0, "holding": 0, "durable": 0, "total": 0},
        },
        errors,
    )
    compare = _section(
        "evaluation_compare",
        lambda: compare_evaluation_snapshots(root),
        {"ok": False, "reason": "compare unavailable", "note": EVAL_NOTE},
        errors,
    )
    commitment = _section(
        "commitment",
        lambda: commitment_payload(root),
        {"commitment": None, "check_in": None, "line": ""},
        errors,
    )
    if_then = _section(
        "check_intention",
        lambda: str(load_learning_profile(root).to_dict().get("if_then") or ""),
        "",
        errors,
    )
    if not isinstance(compare, dict) or not compare.get("ok"):
        compare = {
            "ok": False,
            "reason": (compare or {}).get("reason", "compare unavailable")
            if isinstance(compare, dict)
            else "compare unavailable",
            "note": EVAL_NOTE,
        }
    return {
        "ok": True,
        "due": due,
        "if_then": if_then,
        "streak": streak,
        "progress": progress,
        "evaluation": compare,
        "commitment": commitment,
        "errors": errors,
    }


def main(argv: list[str] | None = None) -> int:
    import argparse
    import os

    from .user_root import resolve_user_root

    parser = argparse.ArgumentParser(description="Calendar-tab surface in one read")
    parser.add_argument("--user-root", type=Path, default=None)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    root = args.user_root or resolve_user_root(
        os.environ.get("PRODUCT_USER_ID", "dev"), create=True
    )
    payload = plan_surface_payload(root)
    print(json.dumps(payload))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
