"""Append-only action ledger.

Pinned row schema (day one — every mutating actuator MUST use this writer;
do not invent per-server shapes):

{
  "ts": "ISO-8601",
  "actor": "skill_or_daemon",
  "skill": "skill_id_or_null",
  "tool": "mcp_tool_name",
  "target": "opaque_target_ref",
  "preview_hash": "hex_or_null",
  "why": "human_readable_reason",
  "outcome": "success|veto|error|paused",
  "undo_ptr": { "kind": "...", "id": "...", "prior": {} } | null,
  "category": "calendar|email_draft|email_label|canvas_submit|..."
}

``undo_ptr`` is null when the action is irreversible. Reversible actuators
populate ``kind`` / ``id`` / ``prior`` so STOP+rewind can walk back the last N.
"""

from __future__ import annotations

import json
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

Outcome = Literal["success", "veto", "error", "paused"]

LEDGER_SCHEMA_VERSION = 1

REQUIRED_FIELDS = (
    "ts",
    "actor",
    "skill",
    "tool",
    "target",
    "preview_hash",
    "why",
    "outcome",
    "undo_ptr",
    "category",
)

VALID_OUTCOMES = frozenset({"success", "veto", "error", "paused"})


@dataclass
class UndoPtr:
    kind: str
    id: str
    prior: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {"kind": self.kind, "id": self.id, "prior": self.prior}


@dataclass
class LedgerEntry:
    actor: str
    tool: str
    target: str
    why: str
    outcome: Outcome
    category: str
    skill: str | None = None
    preview_hash: str | None = None
    undo_ptr: UndoPtr | None = None
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_dict(self) -> dict[str, Any]:
        return {
            "ts": self.ts,
            "actor": self.actor,
            "skill": self.skill,
            "tool": self.tool,
            "target": self.target,
            "preview_hash": self.preview_hash,
            "why": self.why,
            "outcome": self.outcome,
            "undo_ptr": self.undo_ptr.to_dict() if self.undo_ptr else None,
            "category": self.category,
        }


class LedgerSchemaError(ValueError):
    """Raised when a ledger row does not match the pinned schema."""


def validate_entry(row: dict[str, Any]) -> None:
    """Validate a ledger row dict against the pinned schema."""
    missing = [k for k in REQUIRED_FIELDS if k not in row]
    if missing:
        raise LedgerSchemaError(f"Ledger row missing fields: {missing}")
    if row["outcome"] not in VALID_OUTCOMES:
        raise LedgerSchemaError(f"Invalid outcome: {row['outcome']!r}")
    undo = row["undo_ptr"]
    if undo is not None:
        if not isinstance(undo, dict) or "kind" not in undo or "id" not in undo:
            raise LedgerSchemaError(
                "undo_ptr must be null or {kind, id, prior}"
            )


_lock = threading.Lock()


class Ledger:
    """Append-only JSONL ledger bound to a user root."""

    def __init__(self, user_root: Path) -> None:
        self.path = Path(user_root) / "ledger.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            self.path.touch()

    def append(self, entry: LedgerEntry) -> dict[str, Any]:
        row = entry.to_dict()
        validate_entry(row)
        line = json.dumps(row, ensure_ascii=False, separators=(",", ":"))
        with _lock:
            with self.path.open("a", encoding="utf-8") as fh:
                fh.write(line + "\n")
        return row

    def read_all(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        if not self.path.is_file():
            return rows
        with self.path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                rows.append(json.loads(line))
        return rows

    def last_reversible(self, n: int = 3) -> list[dict[str, Any]]:
        """Return the last ``n`` successful rows that have an undo_ptr."""
        reversible = [
            r
            for r in self.read_all()
            if r.get("outcome") == "success" and r.get("undo_ptr")
        ]
        return reversible[-n:]


def append_ledger(
    user_root: Path,
    *,
    actor: str,
    tool: str,
    target: str,
    why: str,
    outcome: Outcome,
    category: str,
    skill: str | None = None,
    preview_hash: str | None = None,
    undo_ptr: UndoPtr | dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Convenience writer used by MCP tools and the daemon."""
    ptr: UndoPtr | None
    if undo_ptr is None:
        ptr = None
    elif isinstance(undo_ptr, UndoPtr):
        ptr = undo_ptr
    else:
        ptr = UndoPtr(
            kind=str(undo_ptr["kind"]),
            id=str(undo_ptr["id"]),
            prior=undo_ptr.get("prior"),
        )
    return Ledger(user_root).append(
        LedgerEntry(
            actor=actor,
            tool=tool,
            target=target,
            why=why,
            outcome=outcome,
            category=category,
            skill=skill,
            preview_hash=preview_hash,
            undo_ptr=ptr,
        )
    )
