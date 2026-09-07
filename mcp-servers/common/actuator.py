"""Shared bootstrap + write gate for ProductName MCP actuators.

Every actuator (gcal / gmail / apple-cal) should import from here instead of
re-implementing ``sys.path`` inserts, ``PRODUCT_USER_ID`` → user_root, and the
permissions check + blocked ledger row.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


def ensure_import_paths() -> None:
    """Make ``canvas_mcp`` and ``common`` importable from a repo checkout."""
    src = str(REPO / "src")
    mcp = str(REPO / "mcp-servers")
    if src not in sys.path:
        sys.path.insert(0, src)
    if mcp not in sys.path:
        sys.path.insert(0, mcp)


ensure_import_paths()

from canvas_mcp.core.ledger import append_ledger  # noqa: E402
from canvas_mcp.core.permissions import allow_write, load_permissions  # noqa: E402
from canvas_mcp.core.user_root import resolve_user_root  # noqa: E402


def user_root() -> Path:
    """Resolve the actuator user root (``PRODUCT_USER_ID`` or ``dev``)."""
    return resolve_user_root(os.environ.get("PRODUCT_USER_ID", "dev"), create=True)


def check_write(
    root: Path,
    category: str,
    *,
    confirmed: bool,
    actor: str,
    tool: str,
    target: str,
    why: str,
    log_block: bool = True,
) -> tuple[bool, str]:
    """Return ``(ok, reason)``. On block, optionally append a ledger veto/pause."""
    state = load_permissions(root)
    ok, reason = allow_write(state, category, confirmed=confirmed)
    if not ok and log_block:
        append_ledger(
            root,
            actor=actor,
            tool=tool,
            target=target,
            why=why,
            outcome="paused" if "STOP" in reason else "veto",
            category=category,
        )
    return ok, reason
