"""Apple Calendar MCP — EventKit via optional Swift helper; dry-run fallback."""

from __future__ import annotations

import json
import subprocess
import sys
import uuid
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "mcp-servers"))

from common.actuator import check_write, user_root  # noqa: E402

from canvas_mcp.core.ledger import UndoPtr, append_ledger  # noqa: E402

mcp = FastMCP("productname-apple-cal")
_EVENTS: dict[str, dict[str, Any]] = {}
SWIFT_HELPER = Path(__file__).parent / "EventKitHelper"


def _native_create(summary: str, start_iso: str, end_iso: str) -> str | None:
    if not SWIFT_HELPER.exists():
        return None
    try:
        out = subprocess.check_output(
            [str(SWIFT_HELPER), "create", summary, start_iso, end_iso],
            text=True,
            timeout=30,
        )
        return out.strip() or None
    except (subprocess.SubprocessError, OSError):
        return None


@mcp.tool()
def create_event(
    summary: str,
    start_iso: str,
    end_iso: str,
    why: str = "Apple Calendar automation",
    confirmed: bool = False,
) -> str:
    root = user_root()
    ok, reason = check_write(
        root,
        "calendar",
        confirmed=confirmed,
        actor="apple-cal",
        tool="create_event",
        target=summary,
        why=why,
        log_block=False,
    )
    if not ok:
        return f"❌ Blocked: {reason}"
    event_id = _native_create(summary, start_iso, end_iso) or f"apple_{uuid.uuid4().hex[:12]}"
    event = {"id": event_id, "summary": summary, "start": start_iso, "end": end_iso}
    _EVENTS[event_id] = event
    append_ledger(
        root,
        actor="apple-cal",
        tool="create_event",
        target=event_id,
        why=why,
        outcome="success",
        category="calendar",
        undo_ptr=UndoPtr(kind="apple_event", id=event_id, prior=None),
    )
    return json.dumps({"status": "created", "event": event, "narrate": True})


@mcp.tool()
def describe_mode() -> str:
    """Return actuator mode: live (Swift helper present) | dry-run."""
    mode = "live" if SWIFT_HELPER.exists() else "dry-run"
    return json.dumps({"mode": mode, "actuator": "apple-cal"})


if __name__ == "__main__":
    mcp.run()
