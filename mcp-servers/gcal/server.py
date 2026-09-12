"""Google Calendar MCP server — read-only + blocked writes (canvas-focus pivot).

Phase 1 shipped ``create_event``/``update_event`` as real writes gated by
``ConfirmationGuard``. That's cut: a calendar write is an action a student
would otherwise take themselves, and this product does not act on a
student's behalf toward anything outside their own head — including their
own calendar. See ``docs/handoff/canvas-focus-pivot-2026-09-11.md``. Both
tools are now hard-blocked, no API call, mirroring
``mcp-servers/gmail/server.py``'s ``send_email`` stub.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

from mcp.server.fastmcp import FastMCP

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "mcp-servers"))

from common import google_oauth  # noqa: E402
from common.actuator import user_root  # noqa: E402
from common.stop_rewind import engage_global_stop  # noqa: E402

mcp = FastMCP("productname-gcal")

_BLOCKED_REASON = (
    "Calendar writes are disabled — this product reads and plans, it does not "
    "act on your calendar for you. Add this to your calendar yourself."
)


@mcp.tool()
def create_event(
    summary: str = "",
    start_iso: str = "",
    end_iso: str = "",
    why: str = "",
    confirmation_token: str | None = None,
) -> str:
    """Permanently unavailable — hard-blocked, no API call. Plan the event yourself."""
    return json.dumps({"ok": False, "blocked": True, "reason": _BLOCKED_REASON})


@mcp.tool()
def update_event(
    event_id: str = "",
    summary: str | None = None,
    start_iso: str | None = None,
    end_iso: str | None = None,
    why: str = "",
    confirmation_token: str | None = None,
) -> str:
    """Permanently unavailable — hard-blocked, no API call. Edit the event yourself."""
    return json.dumps({"ok": False, "blocked": True, "reason": _BLOCKED_REASON})


@mcp.tool()
def global_stop(hours: int = 24) -> str:
    """Kill switch: pause all gated automation for this student. Kept even
    though gcal itself no longer writes — this is the only place an agent
    exposes it, and it is a student-protective control, not automation."""
    until = engage_global_stop(user_root(), hours=hours)
    return f"STOP until {until}"


@mcp.tool()
def describe_mode() -> str:
    """Return actuator mode: dry-run | oauth-ready | live (read-only regardless)."""
    mode = google_oauth.describe_mode(user_root())
    return json.dumps({"mode": mode, "actuator": "gcal"})


if __name__ == "__main__":
    mcp.run()
