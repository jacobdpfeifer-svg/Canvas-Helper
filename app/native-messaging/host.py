#!/usr/bin/env python3
"""Chrome Native Messaging host for ProductName daemon sensors.

Protocol: 4-byte little-endian length + UTF-8 JSON on stdin/stdout.
Writes sensor events under the user root sensors/chrome.jsonl for the daemon.
"""

from __future__ import annotations

import json
import os
import struct
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow repo checkout without install
_REPO = Path(__file__).resolve().parents[2]
if str(_REPO / "src") not in sys.path:
    sys.path.insert(0, str(_REPO / "src"))

from canvas_mcp.core.user_root import resolve_user_root  # noqa: E402


def _read_message() -> dict | None:
    raw_len = sys.stdin.buffer.read(4)
    if not raw_len or len(raw_len) < 4:
        return None
    (length,) = struct.unpack("<I", raw_len)
    if length <= 0 or length > 1_000_000:
        return None
    data = sys.stdin.buffer.read(length)
    if len(data) < length:
        return None
    return json.loads(data.decode("utf-8"))


def _write_message(payload: dict) -> None:
    encoded = json.dumps(payload).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def _append_sensor(payload: dict) -> Path:
    uid = os.environ.get("PRODUCT_USER_ID", "dev")
    root = resolve_user_root(uid, create=True)
    sensors = root / "sensors"
    sensors.mkdir(parents=True, exist_ok=True)
    path = sensors / "chrome.jsonl"
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(row) + "\n")
    return path


def main() -> int:
    while True:
        msg = _read_message()
        if msg is None:
            break
        path = _append_sensor(msg if isinstance(msg, dict) else {"raw": msg})
        _write_message({"ok": True, "path": str(path)})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
