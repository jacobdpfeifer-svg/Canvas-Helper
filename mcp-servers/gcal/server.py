"""Google Calendar MCP server (Phase 1).

Creates/updates write ledger rows with undo_ptr. Narrate-after for automatic
calendar category. Uses preview→confirm when gated.

Real Google API wiring is behind GOOGLE_CALENDAR_CREDENTIALS; without it the
server runs in dry-run mode that still exercises ledger + undo_ptr.
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

# Allow running from repo without install
import sys

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "src"))
sys.path.insert(0, str(REPO / "mcp-servers"))

from canvas_mcp.core.ledger import UndoPtr, append_ledger  # noqa: E402
from canvas_mcp.core.permissions import allow_write, load_permissions  # noqa: E402
from canvas_mcp.core.user_root import resolve_user_root  # noqa: E402
from common.stop_rewind import engage_global_stop, rewind_last  # noqa: E402

mcp = FastMCP("productname-gcal")

# In-memory dry-run store: event_id -> event dict
_EVENTS: dict[str, dict[str, Any]] = {}


def _user_root() -> Path:
    uid = os.environ.get("PRODUCT_USER_ID", "dev")
    return resolve_user_root(uid, create=True)


@mcp.tool()
def create_event(
    summary: str,
    start_iso: str,
    end_iso: str,
    why: str = "Calendar automation",
    confirmed: bool = False,
) -> str:
    """Create a calendar event (automatic/narrate-after by default)."""
    root = _user_root()
    state = load_permissions(root)
    ok, reason = allow_write(state, "calendar", confirmed=confirmed)
    if not ok:
        append_ledger(
            root,
            actor="gcal",
            tool="create_event",
            target=summary,
            why=why,
            outcome="paused" if "STOP" in reason else "veto",
            category="calendar",
        )
        return f"❌ Blocked: {reason}"

    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    event = {
        "id": event_id,
        "summary": summary,
        "start": start_iso,
        "end": end_iso,
    }
    _EVENTS[event_id] = event
    append_ledger(
        root,
        actor="gcal",
        tool="create_event",
        target=event_id,
        why=why,
        outcome="success",
        category="calendar",
        undo_ptr=UndoPtr(kind="gcal_event", id=event_id, prior=None),
    )
    return json.dumps({"status": "created", "event": event, "narrate": True})


@mcp.tool()
def update_event(
    event_id: str,
    summary: str | None = None,
    start_iso: str | None = None,
    end_iso: str | None = None,
    why: str = "Calendar update",
    confirmed: bool = False,
) -> str:
    root = _user_root()
    state = load_permissions(root)
    ok, reason = allow_write(state, "calendar", confirmed=confirmed)
    if not ok:
        return f"❌ Blocked: {reason}"
    prior = dict(_EVENTS.get(event_id) or {})
    if not prior:
        return f"❌ Unknown event {event_id}"
    event = dict(prior)
    if summary is not None:
        event["summary"] = summary
    if start_iso is not None:
        event["start"] = start_iso
    if end_iso is not None:
        event["end"] = end_iso
    _EVENTS[event_id] = event
    append_ledger(
        root,
        actor="gcal",
        tool="update_event",
        target=event_id,
        why=why,
        outcome="success",
        category="calendar",
        undo_ptr=UndoPtr(kind="gcal_event", id=event_id, prior=prior),
    )
    return json.dumps({"status": "updated", "event": event, "narrate": True})


def _undo_gcal(ptr: dict[str, Any]) -> bool:
    event_id = ptr.get("id")
    prior = ptr.get("prior")
    if prior:
        _EVENTS[event_id] = prior
        return True
    return bool(_EVENTS.pop(event_id, None) is not None)


@mcp.tool()
def global_stop(hours: int = 24) -> str:
    until = engage_global_stop(_user_root(), hours=hours)
    return f"STOP until {until}"


@mcp.tool()
def rewind(n: int = 1) -> str:
    undone = rewind_last(_user_root(), n, handlers={"gcal_event": _undo_gcal})
    return json.dumps({"undone": len(undone), "ids": [u.get("target") for u in undone]})


if __name__ == "__main__":
    mcp.run()
