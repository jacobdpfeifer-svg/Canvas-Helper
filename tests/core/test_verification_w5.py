"""Verification gates for Phase 1 pivot (W5).

Gate #5 imports the W0.5 permissions schema — authored after permissions.py.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from canvas_mcp.core.ledger import Ledger, UndoPtr, append_ledger, validate_entry
from canvas_mcp.core.permissions import (
    CATEGORIES,
    NEVER_AUTO,
    allow_write,
    default_permissions,
    refuse_proctoring_tool,
)
from canvas_mcp.core.user_root import ensure_user_root


def test_gate5_permissions_fuzz():
    """100 synthetic write attempts must match matrix defaults."""
    state = default_permissions()
    rng = random.Random(42)
    for _ in range(100):
        category = rng.choice(list(CATEGORIES))
        confirmed = rng.choice([True, False])
        ok, reason = allow_write(state, category, confirmed=confirmed)
        if category in NEVER_AUTO:
            assert not ok
        elif state.categories[category].posture == "automatic":
            assert ok
        elif state.categories[category].posture == "gated":
            assert ok is confirmed
        else:
            assert not ok


# Gate #6 (write skills never shadow-tested/promoted) tested the
# cluster/draft/shadow/promote self-improve pipeline, which is deleted — see
# docs/handoff/canvas-focus-pivot-2026-09-11.md. Nothing left to gate: with
# no promotion pipeline, a write skill cannot be auto-promoted at all.


def test_gate7_ledger_schema_and_undo_ptr(tmp_path):
    ensure_user_root(tmp_path)
    append_ledger(
        tmp_path,
        actor="gcal",
        tool="create_event",
        target="evt_1",
        why="conflict",
        outcome="success",
        category="calendar",
        undo_ptr=UndoPtr(kind="gcal_event", id="evt_1"),
    )
    append_ledger(
        tmp_path,
        actor="gmail",
        tool="create_draft",
        target="draft_1",
        why="triage",
        outcome="success",
        category="email_draft",
        undo_ptr=UndoPtr(kind="gmail_draft", id="draft_1"),
    )
    append_ledger(
        tmp_path,
        actor="canvas",
        tool="submit_assignment",
        target="asg_1",
        why="busywork",
        outcome="success",
        category="canvas_submit",
        undo_ptr=None,
    )
    rows = Ledger(tmp_path).read_all()
    assert len(rows) == 3
    for row in rows:
        validate_entry(row)
    assert rows[0]["undo_ptr"]["kind"] == "gcal_event"
    assert rows[2]["undo_ptr"] is None


def test_gate9_never_auto_shapes():
    state = default_permissions()
    for tag in ("quiz", "proctored", "lti", "group"):
        # Map tags onto never categories
        cat = {
            "quiz": "canvas_quiz_submit",
            "proctored": "canvas_exam_proctored",
            "lti": "lti_submit",
            "group": "canvas_group",
        }[tag]
        # quiz is gated not never — only proctored/lti/group are never
        if cat in NEVER_AUTO:
            ok, _ = allow_write(state, cat, confirmed=True)
            assert not ok


def test_gate10_router_hard_refuse():
    for name in (
        "lockdown_browser_launch",
        "respondus_monitor",
        "honorlock_start",
        "proctorio_open",
        "proctoru_session",
    ):
        assert refuse_proctoring_tool(name)


def test_gate1_manifests_renamed():
    root = Path(__file__).resolve().parents[2]
    manifest = json.loads((root / "tools" / "TOOL_MANIFEST.json").read_text())
    assert "jacob" not in manifest["server"].lower()
    server = json.loads((root / "server.json").read_text())
    assert "jacob" not in server["name"].lower()
    app_manifest = json.loads((root / "manifest.json").read_text())
    assert "jacob" not in json.dumps(app_manifest).lower()


def test_policy_default_deny():
    from canvas_mcp.core.config import get_config, reset_config

    reset_config()
    assert get_config().course_agent_policy_default == "deny"
