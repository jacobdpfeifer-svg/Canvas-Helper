"""Native Messaging host framing smoke test."""

from __future__ import annotations

import json
import struct
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
HOST = REPO / "app" / "native-messaging" / "host.py"


def test_native_host_appends_sensor(tmp_path, monkeypatch):
    monkeypatch.setenv("DEV_USER_ROOT", str(tmp_path))
    payload = {"type": "canvas_focus", "url": "https://canvas.colorado.edu", "ts": 1}
    body = json.dumps(payload).encode("utf-8")
    framed = struct.pack("<I", len(body)) + body

    proc = subprocess.run(
        [sys.executable, str(HOST)],
        input=framed,
        capture_output=True,
        check=True,
        env={**dict(__import__("os").environ), "DEV_USER_ROOT": str(tmp_path)},
    )
    assert len(proc.stdout) >= 4
    (out_len,) = struct.unpack("<I", proc.stdout[:4])
    reply = json.loads(proc.stdout[4 : 4 + out_len].decode("utf-8"))
    assert reply["ok"] is True
    sensor = tmp_path / "sensors" / "chrome.jsonl"
    assert sensor.is_file()
    line = json.loads(sensor.read_text(encoding="utf-8").strip().splitlines()[-1])
    assert line["type"] == "canvas_focus"
