"""Append-only event log with duplicate detection and a rebuildable projection.

Guarantees (DECISIONS D-04):
- one JSON object per line, ``seq`` assigned under an exclusive file lock;
- append is fsync'd before the caller sees ``Recorded``;
- a duplicate ``event_id`` with identical type+payload returns ``Duplicate``;
  the same id with different bytes is a ``conflict`` and nothing is written;
- a partial tail line (crash mid-write) is rejected on read and truncated on
  the next locked append — it is never treated as committed;
- the projection cache is advisory: any mismatch triggers a full replay.
"""

from __future__ import annotations

import json
import os
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import IO, Any

from .model import Event, StudyError

if sys.platform != "win32":
    import fcntl
else:  # pragma: no cover - windows
    import msvcrt


def study_dir(user_root: Path) -> Path:
    return user_root / "study"


def events_path(user_root: Path) -> Path:
    return study_dir(user_root) / "events.jsonl"


def projection_path(user_root: Path) -> Path:
    return study_dir(user_root) / "projection.json"


def _lock_path(user_root: Path) -> Path:
    return study_dir(user_root) / "events.lock"


@dataclass(frozen=True)
class RecordResult:
    status: str  # recorded | duplicate
    event_id: str
    seq: int


@dataclass
class LogRead:
    events: list[Event]
    good_bytes: int
    partial_tail: bool
    corrupt_interior: bool = False


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


@contextmanager
def _locked(user_root: Path) -> Iterator[IO[str]]:
    study_dir(user_root).mkdir(parents=True, exist_ok=True)
    handle = open(_lock_path(user_root), "a+", encoding="utf-8")
    try:
        if sys.platform != "win32":
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        else:  # pragma: no cover - windows
            msvcrt.locking(handle.fileno(), msvcrt.LK_LOCK, 1)
        yield handle
    finally:
        try:
            if sys.platform != "win32":
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
            else:  # pragma: no cover - windows
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
        finally:
            handle.close()


def read_log(user_root: Path) -> LogRead:
    path = events_path(user_root)
    if not path.exists():
        return LogRead([], 0, False)
    data = path.read_bytes()
    events: list[Event] = []
    offset = 0
    partial = False
    corrupt_interior = False
    chunks = data.split(b"\n")
    for index, chunk in enumerate(chunks):
        if not chunk.strip():
            offset += len(chunk) + 1
            continue
        try:
            raw = json.loads(chunk.decode("utf-8"))
            event = Event.from_line(raw)
        except (ValueError, StudyError):
            later_valid = any(_parses(c) for c in chunks[index + 1 :])
            if later_valid:
                # A bad record with valid history after it is corruption, not a
                # torn tail: never truncate valid later work (audit A finding).
                corrupt_interior = True
                offset += len(chunk) + 1
                continue
            partial = True
            break
        events.append(event)
        offset += len(chunk) + 1
    good = min(offset, len(data))
    if not partial and data and not data.endswith(b"\n"):
        # Last line parsed but lacks its newline: treat as committed but repairable.
        good = len(data)
    return LogRead(events, good, partial, corrupt_interior)


def _parses(chunk: bytes) -> bool:
    if not chunk.strip():
        return False
    try:
        Event.from_line(json.loads(chunk.decode("utf-8")))
    except (ValueError, StudyError):
        return False
    return True


def append_event(user_root: Path, event: Event) -> RecordResult:
    """Durably append one event. Raises StudyError(conflict|persistence_failed)."""
    with _locked(user_root):
        log = read_log(user_root)
        if log.corrupt_interior:
            raise StudyError(
                "persistence_failed",
                "the study log has a damaged record with valid history after it; "
                "restore events.jsonl from a backup or move the damaged line aside before continuing",
            )
        for existing in log.events:
            if existing.event_id == event.event_id:
                same = existing.type == event.type and canonical(existing.payload) == canonical(
                    event.payload
                )
                if same:
                    return RecordResult("duplicate", event.event_id, existing.seq)
                raise StudyError(
                    "conflict",
                    f"event {event.event_id} already exists with different content",
                )
        event.seq = (log.events[-1].seq + 1) if log.events else 1
        path = events_path(user_root)
        line = canonical(event.to_line()) + "\n"
        try:
            if log.partial_tail:
                with open(path, "r+b") as repair:
                    repair.truncate(log.good_bytes)
            with open(path, "ab") as handle:
                if log.good_bytes and not log.partial_tail:
                    handle.seek(0, os.SEEK_END)
                    if handle.tell() > 0:
                        with open(path, "rb") as check:
                            check.seek(-1, os.SEEK_END)
                            if check.read(1) != b"\n":
                                handle.write(b"\n")
                handle.write(line.encode("utf-8"))
                handle.flush()
                os.fsync(handle.fileno())
        except OSError as exc:
            raise StudyError("persistence_failed", f"could not append event: {exc}") from exc
        return RecordResult("recorded", event.event_id, event.seq)


def load_projection_cache(user_root: Path) -> dict[str, Any] | None:
    path = projection_path(user_root)
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return raw if isinstance(raw, dict) else None


def save_projection_cache(user_root: Path, payload: dict[str, Any]) -> None:
    path = projection_path(user_root)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix(".tmp")
        tmp.write_text(canonical(payload), encoding="utf-8")
        os.replace(tmp, path)
    except OSError:
        # The cache is advisory; replay rebuilds it.
        return
