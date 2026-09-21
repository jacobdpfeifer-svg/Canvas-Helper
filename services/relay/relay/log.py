"""Content-free operational logging.

Only enumerated scalar fields may be logged; anything else is dropped, so a
future contributor cannot accidentally log a prompt or answer by passing it
through. Values are truncated and free text is refused.
"""

from __future__ import annotations

import json
import sys
from typing import Any

ALLOWED_FIELDS = {
    "event",
    "request_id",
    "dispatch_id",
    "tester_id",
    "status",
    "model",
    "pricing_version",
    "input_tokens",
    "output_tokens",
    "reasoning_tokens",
    "reserved_cents",
    "settled_cents",
    "code",
    "http_status",
    "latency_ms",
}
MAX_VALUE_CHARS = 64


def log(event: str, **fields: Any) -> dict[str, Any]:
    row: dict[str, Any] = {"event": str(event)[:MAX_VALUE_CHARS]}
    for key, value in fields.items():
        if key not in ALLOWED_FIELDS:
            continue
        if isinstance(value, bool):
            row[key] = value
        elif isinstance(value, int | float):
            row[key] = value
        elif value is None:
            row[key] = None
        else:
            text = str(value)
            if len(text) > MAX_VALUE_CHARS or "\n" in text:
                continue  # never free text
            row[key] = text
    sys.stderr.write(json.dumps(row, sort_keys=True) + "\n")
    return row
