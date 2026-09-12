"""Shared bootstrap + write gate for ProductName MCP actuators.

Every actuator (gcal / gmail / apple-cal) should import from here instead of
re-implementing ``sys.path`` inserts, ``PRODUCT_USER_ID`` → user_root, and the
permissions check + blocked ledger row.

Bucket-A connector writes that can be gated must go through
``gate_connector_write`` (ConfirmationGuard preview → fingerprint → token),
not a forgeable ``confirmed: bool`` tool argument.
"""

from __future__ import annotations

import os
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

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

from canvas_mcp.core.connector_guards import get_connector_guard  # noqa: E402
from canvas_mcp.core.ledger import append_ledger  # noqa: E402
from canvas_mcp.core.permissions import (  # noqa: E402
    allow_write,
    load_permissions,
    resolve_posture,
)
from canvas_mcp.core.user_root import resolve_user_root  # noqa: E402

GateKind = Literal["blocked", "preview", "proceed"]


@dataclass(frozen=True)
class GateResult:
    """Outcome of ``gate_connector_write``.

    ``confirmation_token`` is set on ``proceed`` only when a gated token was
    reserved; callers must ``release_connector_confirmation`` if the write
    never starts.
    """

    kind: GateKind
    message: str = ""
    confirmation_token: str | None = None
    connector_id: str | None = None


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
    """Return ``(ok, reason)``. On block, optionally append a ledger veto/pause.

    Prefer ``gate_connector_write`` for Bucket-A MCP write tools so gated
    categories require a fingerprint-bound token instead of a boolean.
    """
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


def release_connector_confirmation(
    connector_id: str,
    token: str | None,
) -> None:
    """Undo a reserved gated confirmation when the write never started."""
    if not token:
        return
    get_connector_guard(connector_id).release(token)


def gate_connector_write(
    root: Path,
    category: str,
    *,
    connector_id: str,
    tool: str,
    fingerprint_parts: Sequence[str],
    preview_lines: Sequence[str],
    confirmation_token: str | None,
    actor: str,
    target: str,
    why: str,
    log_block: bool = True,
) -> GateResult:
    """Permissions + ConfirmationGuard gate for Bucket-A connector writes.

    - ``automatic`` → proceed without a token
    - ``gated`` + no token → issue preview (no side effect)
    - ``gated`` + token → check → matrix confirm → reserve → proceed
    - ``never`` → blocked (ledger when ``log_block``)
    """
    state = load_permissions(root)
    posture = resolve_posture(state, category)

    if posture == "never":
        ok, reason = check_write(
            root,
            category,
            confirmed=False,
            actor=actor,
            tool=tool,
            target=target,
            why=why,
            log_block=log_block,
        )
        assert not ok
        return GateResult(kind="blocked", message=f"❌ Blocked: {reason}")

    if posture == "automatic":
        ok, reason = check_write(
            root,
            category,
            confirmed=False,
            actor=actor,
            tool=tool,
            target=target,
            why=why,
            log_block=log_block,
        )
        if not ok:
            return GateResult(kind="blocked", message=f"❌ Blocked: {reason}")
        return GateResult(kind="proceed")

    # gated
    parts = [str(p) for p in fingerprint_parts]
    guard = get_connector_guard(connector_id)
    fingerprint = guard.fingerprint(*parts)

    token = (confirmation_token or "").strip() or None
    if not token:
        issued = guard.issue(fingerprint)
        lines = [
            "📋 Write preview — NOTHING has been written yet.",
            "",
            f"Connector: {connector_id}",
            f"Tool: {tool}",
            f"Category: {category}",
            "",
            *preview_lines,
            "",
            "➡️  Always show this preview in chat. To proceed, call again with "
            f"confirmation_token='{issued}' and identical arguments.",
        ]
        return GateResult(kind="preview", message="\n".join(lines))

    token_error = guard.check(token, fingerprint)
    if token_error:
        return GateResult(kind="blocked", message=token_error)

    ok, reason = check_write(
        root,
        category,
        confirmed=True,
        actor=actor,
        tool=tool,
        target=target,
        why=why,
        log_block=log_block,
    )
    if not ok:
        return GateResult(kind="blocked", message=f"❌ Blocked: {reason}")

    if not guard.reserve(token):
        return GateResult(
            kind="blocked",
            message=(
                "❌ That confirmation was already used. Nothing was written. "
                "Run the preview again."
            ),
        )

    return GateResult(
        kind="proceed",
        confirmation_token=token,
        connector_id=connector_id,
    )
