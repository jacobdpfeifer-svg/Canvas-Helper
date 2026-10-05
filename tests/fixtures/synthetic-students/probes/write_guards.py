"""Part 7 probe: personal Gmail/GCal writes need a per-instance confirmation; Apple Calendar is
hard-blocked; standing 'automatic' posture is clamped. Google is stubbed so nothing can leave.

    PYTHONPATH=src DEV_USER_ROOT=var/audit-user-roots/avery-guards .venv/bin/python \
        tests/fixtures/synthetic-students/probes/write_guards.py
"""

from __future__ import annotations

import importlib.util
import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
root_env = os.environ.get("DEV_USER_ROOT", "")
if "audit-user-roots" not in root_env:
    raise SystemExit("set DEV_USER_ROOT to an audit root")
ROOT = Path(root_env).resolve()

calls: list[str] = []


class _NoNetwork:
    """Any attribute access on the stubbed Google service is recorded, never executed."""

    def __getattr__(self, name: str):  # noqa: ANN204
        calls.append(f"service.{name}")
        raise RuntimeError("audit: Google service touched")


def load(name: str, rel: str):  # noqa: ANN201
    spec = importlib.util.spec_from_file_location(name, REPO / rel)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


gmail = load("audit_gmail", "mcp-servers/gmail/server.py")
gcal = load("audit_gcal", "mcp-servers/gcal/server.py")
apple = load("audit_apple", "mcp-servers/apple-cal/server.py")
from common import google_oauth  # noqa: E402  (path inserted by the servers)

from canvas_mcp.core import connectors  # noqa: E402
from canvas_mcp.core.permissions import load_permissions, resolve_posture  # noqa: E402

# Stub every network edge.
google_oauth.gmail_service = lambda root: _NoNetwork()
google_oauth.calendar_service = lambda root: _NoNetwork()
google_oauth.gmail_send_message = lambda *a, **k: calls.append("gmail_send_message") or {"id": "stub"}
google_oauth.gcal_create_event = lambda *a, **k: calls.append("gcal_create_event") or {"id": "stub"}
google_oauth.gcal_update_event = lambda *a, **k: calls.append("gcal_update_event") or {"id": "stub"}

results: list[tuple[str, bool]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok))
    print(f"{'ok  ' if ok else 'FAIL'} {name}: {detail}")


TOKEN_RE = re.compile(r"confirmation_token='([^']+)'")
ledger = ROOT / "ledger.jsonl"
ledger_before = ledger.read_text(encoding="utf-8") if ledger.exists() else ""

# --- Gmail send
prev = gmail.send_email(to="avery.synthetic@example.invalid", subject="PS6 question", body="Draft only")
token = TOKEN_RE.search(prev)
check("send_email with no token returns a preview, not a send", prev.startswith("📋 Write preview") and not calls, prev.splitlines()[0])
bad = gmail.send_email(to="avery.synthetic@example.invalid", subject="PS6 question", body="Draft only", confirmation_token="forged-token")
check("send_email with a forged token fails closed", "\"status\": \"sent\"" not in bad and not calls, bad.splitlines()[0][:100])
changed = gmail.send_email(to="avery.synthetic@example.invalid", subject="PS6 question", body="DIFFERENT body", confirmation_token=token.group(1) if token else "")
check("token for other content does not send changed content", "\"status\": \"sent\"" not in changed and not calls, changed.replace("\n", " ")[:160])

# --- Standing automatic posture is clamped
perm = ROOT / "calibration" / "permissions.yaml"
perm.write_text("categories:\n  email_send:\n    posture: automatic\n  calendar:\n    posture: automatic\n", encoding="utf-8")
state = load_permissions(ROOT)
check("hand-edited automatic posture is clamped for email_send/calendar",
      resolve_posture(state, "email_send") != "automatic" and resolve_posture(state, "calendar") != "automatic",
      f"email_send={resolve_posture(state, 'email_send')} calendar={resolve_posture(state, 'calendar')}")
again = gmail.send_email(to="avery.synthetic@example.invalid", subject="x", body="y")
check("send_email still previews after 'automatic' edit", again.startswith("📋 Write preview") and not calls)
perm.unlink()

# --- GCal MCP create/update
c = gcal.create_event(summary="PS6 work block", start_iso="2026-10-06T16:00:00-06:00", end_iso="2026-10-06T17:00:00-06:00")
check("gcal create_event with no token previews only", c.startswith("📋 Write preview") and not calls, c.splitlines()[0])
c2 = gcal.create_event(summary="PS6 work block", start_iso="2026-10-06T16:00:00-06:00", end_iso="2026-10-06T17:00:00-06:00", confirmation_token="forged")
check("gcal create_event with a forged token fails closed", "📋" not in c2[:2] and not calls, c2.splitlines()[0][:100])
u = gcal.update_event(event_id="evt_synthetic", summary="moved", start_iso="2026-10-07T16:00:00-06:00", end_iso="2026-10-07T17:00:00-06:00")
check("gcal update_event with no token previews only", not calls, u.splitlines()[0][:100])

# --- App-side GCal (core/connectors.py, persisted single-use token)
try:
    pv = connectors.gcal_preview_event(ROOT, summary="PS6 block", start_iso="2026-10-06T16:00:00-06:00", end_iso="2026-10-06T17:00:00-06:00", why="audit")
    try:
        connectors.gcal_confirm_event(ROOT, summary="PS6 block (edited)", start_iso="2026-10-06T16:00:00-06:00", end_iso="2026-10-06T17:00:00-06:00", why="audit", confirmation_token=pv["confirmation_token"])
        check("app gcal confirm rejects edited content", False)
    except connectors.ConnectorError as exc:
        check("app gcal confirm rejects edited content", not calls, exc.code)
    try:
        connectors.gcal_confirm_event(ROOT, summary="PS6 block", start_iso="2026-10-06T16:00:00-06:00", end_iso="2026-10-06T17:00:00-06:00", why="audit", confirmation_token=pv["confirmation_token"])
        check("app gcal token burned after a mismatch (no revert-replay)", False)
    except connectors.ConnectorError as exc:
        check("app gcal token burned after a mismatch (no revert-replay)", not calls, exc.code)
except connectors.ConnectorError as exc:
    check("app gcal preview", False, exc.code)

# --- Apple Calendar
a = json.loads(apple.create_event(summary="x", start_iso="2026-10-06T16:00:00-06:00", end_iso="2026-10-06T17:00:00-06:00", confirmation_token="anything"))
check("Apple Calendar create_event is hard-blocked even with a token", a.get("blocked") is True and not (REPO / "mcp-servers/apple-cal/EventKitHelper").exists())

ledger_after = ledger.read_text(encoding="utf-8") if ledger.exists() else ""
new_rows = [json.loads(x) for x in ledger_after[len(ledger_before):].splitlines() if x.strip()]
check("no success row for email_send/calendar in the ledger", not any(r.get("outcome") == "success" and r.get("category") in ("email_send", "calendar") for r in new_rows), f"new rows={len(new_rows)}")
check("no Google API call was made", not calls, str(calls))

failed = [n for n, ok in results if not ok]
print("PASS" if not failed else f"FAIL {failed}")
sys.exit(1 if failed else 0)
