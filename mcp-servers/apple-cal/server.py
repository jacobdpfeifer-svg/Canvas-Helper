"""Apple Calendar MCP — read-only + blocked writes.

``create_event`` used to shell out to a Swift EventKit helper. That path stays
hard-blocked: no working EventKit helper exists in this repo to wire up
(engineering gap, not a policy choice). Personal Google Calendar writes are
separate — gated + real via ``mcp-servers/gcal/server.py`` and the 2026-09-13
addendum in ``docs/handoff/canvas-focus-pivot-2026-09-11.md``.
"""

from __future__ import annotations

import json
from pathlib import Path

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("productname-apple-cal")
SWIFT_HELPER = Path(__file__).parent / "EventKitHelper"

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
    """Permanently unavailable — hard-blocked, no EventKit call. Add it yourself."""
    return json.dumps({"ok": False, "blocked": True, "reason": _BLOCKED_REASON})


@mcp.tool()
def describe_mode() -> str:
    """Return actuator mode: unused | dry-run (read-only regardless)."""
    return json.dumps({"mode": "dry-run", "actuator": "apple-cal"})


if __name__ == "__main__":
    mcp.run()
