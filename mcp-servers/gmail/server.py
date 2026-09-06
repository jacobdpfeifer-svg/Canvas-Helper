"""Gmail MCP — read + drafts + label/archive/star. No send in Phase 1."""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP
import sys

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "src"))
sys.path.insert(0, str(REPO / "mcp-servers"))

from canvas_mcp.core.ledger import UndoPtr, append_ledger  # noqa: E402
from canvas_mcp.core.permissions import allow_write, load_permissions  # noqa: E402
from canvas_mcp.core.user_root import resolve_user_root  # noqa: E402

mcp = FastMCP("productname-gmail")
_DRAFTS: dict[str, dict[str, Any]] = {}
_LABELS: dict[str, list[str]] = {}


def _user_root() -> Path:
    return resolve_user_root(os.environ.get("PRODUCT_USER_ID", "dev"), create=True)


@mcp.tool()
def create_draft(
    to: str,
    subject: str,
    body: str,
    why: str = "Email draft automation",
    confirmed: bool = False,
) -> str:
    """Save a draft only — never sends."""
    root = _user_root()
    state = load_permissions(root)
    ok, reason = allow_write(state, "email_draft", confirmed=confirmed)
    if not ok:
        return f"❌ Blocked: {reason}"
    draft_id = f"draft_{uuid.uuid4().hex[:12]}"
    draft = {"id": draft_id, "to": to, "subject": subject, "body": body}
    _DRAFTS[draft_id] = draft
    append_ledger(
        root,
        actor="gmail",
        tool="create_draft",
        target=draft_id,
        why=why,
        outcome="success",
        category="email_draft",
        undo_ptr=UndoPtr(kind="gmail_draft", id=draft_id, prior=None),
    )
    return json.dumps({"status": "drafted", "draft": draft, "narrate": True})


@mcp.tool()
def apply_labels(
    message_id: str,
    add_labels: list[str] | None = None,
    remove_labels: list[str] | None = None,
    why: str = "Email triage",
    confirmed: bool = False,
) -> str:
    """Label/archive/star — never delete. Stores prior label state for undo."""
    root = _user_root()
    state = load_permissions(root)
    ok, reason = allow_write(state, "email_triage", confirmed=confirmed)
    if not ok:
        return f"❌ Blocked: {reason}"
    prior = list(_LABELS.get(message_id, []))
    labels = list(prior)
    for lab in remove_labels or []:
        if lab in labels:
            labels.remove(lab)
    for lab in add_labels or []:
        if lab not in labels:
            labels.append(lab)
    _LABELS[message_id] = labels
    append_ledger(
        root,
        actor="gmail",
        tool="apply_labels",
        target=message_id,
        why=why,
        outcome="success",
        category="email_label",
        undo_ptr=UndoPtr(
            kind="gmail_label",
            id=message_id,
            prior={"labels": prior},
        ),
    )
    return json.dumps({"status": "labeled", "labels": labels, "narrate": True})


@mcp.tool()
def send_email() -> str:
    """Permanently unavailable in Phase 1."""
    return "❌ Gmail send is disabled in Phase 1. Use create_draft."


if __name__ == "__main__":
    mcp.run()
