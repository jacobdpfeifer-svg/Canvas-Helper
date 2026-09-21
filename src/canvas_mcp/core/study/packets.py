"""Study packets: verbatim sources + items with spoiler-separated keys.

A packet is one JSON document. Import validates the shape, computes the hash
of each source's saved text (no fictional digests), and stores the packet
under ``{user_root}/study/packets/``. The public view of an item omits its
``key`` and ``feedback`` blocks; those are only released by the service after
submission or an explicitly logged reveal.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
from pathlib import Path
from typing import Any

from .model import (
    EXAM_VALUES,
    MODES,
    PROVENANCE,
    StudyError,
    require_choice,
    require_id,
)
from .store import canonical, study_dir

CHECKER_TYPES = ("none", "choice", "true_false", "numeric", "expression")
# Only material the student may practice against. Anything naming a live or
# proctored assessment is refused at import — it must never become solvable work.
PERMISSION_SCOPES = ("practice", "instructor_permitted", "student_notes", "synthetic")
_ANSWER_LEAK_RE = re.compile(r"\b(answer|solution|key)\b", re.IGNORECASE)


def packets_dir(user_root: Path) -> Path:
    return study_dir(user_root) / "packets"


def exams_path(user_root: Path) -> Path:
    return study_dir(user_root) / "exams.json"


def source_hash(text: str) -> str:
    return "sha256:" + hashlib.sha256(text.encode("utf-8")).hexdigest()


def _str(value: Any, what: str, *, required: bool = True, max_len: int = 20000) -> str:
    if value is None or value == "":
        if required:
            raise StudyError("validation", f"{what} is required")
        return ""
    if not isinstance(value, str):
        raise StudyError("validation", f"{what} must be a string")
    if len(value) > max_len:
        raise StudyError("validation", f"{what} is longer than {max_len} characters")
    return value


def validate_packet(raw: Any) -> dict[str, Any]:
    """Return a normalized packet or raise StudyError('validation')."""
    if not isinstance(raw, dict):
        raise StudyError("validation", "packet must be a JSON object")
    packet_id = require_id(raw.get("packet_id"), "packet_id")
    version = raw.get("version", 1)
    if not isinstance(version, int) or version < 1:
        raise StudyError("validation", "version must be a positive integer")
    provenance = require_choice(raw.get("provenance", "student"), PROVENANCE, "provenance")
    course = _str(raw.get("course"), "course", required=False, max_len=200)
    title = _str(raw.get("title"), "title", required=False, max_len=200)
    zone = _str(raw.get("zone"), "zone", required=False, max_len=64) or "UTC"

    sources_raw = raw.get("sources")
    if not isinstance(sources_raw, list) or not sources_raw:
        raise StudyError("validation", "packet needs at least one source with text")
    sources: list[dict[str, Any]] = []
    source_ids: set[str] = set()
    for entry in sources_raw:
        if not isinstance(entry, dict):
            raise StudyError("validation", "each source must be an object")
        sid = require_id(entry.get("id"), "source.id")
        if sid in source_ids:
            raise StudyError("validation", f"duplicate source id {sid}")
        source_ids.add(sid)
        text = _str(entry.get("text"), f"source {sid} text").strip()
        if not text:
            raise StudyError("validation", f"source {sid} has no text")
        sources.append(
            {
                "id": sid,
                "locator": _str(entry.get("locator"), "locator", required=False, max_len=200)
                or sid,
                "text": text,
                "hash": source_hash(text),
                "permission_scope": require_choice(
                    entry.get("permission_scope") or "practice", PERMISSION_SCOPES, f"source {sid} permission_scope"
                ),
                "ocr_status": _str(entry.get("ocr_status"), "ocr_status", required=False, max_len=32)
                or "typed",
                "captured_at": _str(entry.get("captured_at"), "captured_at", required=False, max_len=64),
                "canvas_id": _str(entry.get("canvas_id"), "canvas_id", required=False, max_len=64),
            }
        )

    objectives_raw = raw.get("objectives") or []
    objectives: list[dict[str, Any]] = []
    objective_ids: set[str] = set()
    for entry in objectives_raw:
        if not isinstance(entry, dict):
            raise StudyError("validation", "each objective must be an object")
        oid = require_id(entry.get("id"), "objective.id")
        objective_ids.add(oid)
        objectives.append({"id": oid, "label": _str(entry.get("label"), "objective label", max_len=300)})

    items_raw = raw.get("items") or []
    if not isinstance(items_raw, list):
        raise StudyError("validation", "items must be a list")
    items: list[dict[str, Any]] = []
    item_ids: set[str] = set()
    for entry in items_raw:
        if not isinstance(entry, dict):
            raise StudyError("validation", "each item must be an object")
        iid = require_id(entry.get("id"), "item.id")
        if iid in item_ids:
            raise StudyError("validation", f"duplicate item id {iid}")
        item_ids.add(iid)
        oid = require_id(entry.get("objective_id"), f"item {iid} objective_id")
        if objective_ids and oid not in objective_ids:
            raise StudyError("validation", f"item {iid} names unknown objective {oid}")
        refs = entry.get("source_refs") or []
        if not isinstance(refs, list) or not refs:
            raise StudyError("validation", f"item {iid} needs source_refs")
        for ref in refs:
            if ref not in source_ids:
                raise StudyError("validation", f"item {iid} references unknown source {ref}")
        stem = _str(entry.get("stem"), f"item {iid} stem", max_len=4000)
        neutral = _str(entry.get("neutral_locator"), "neutral_locator", required=False, max_len=200)
        if neutral and _ANSWER_LEAK_RE.search(neutral):
            raise StudyError("validation", f"item {iid} neutral_locator must not mention answers")
        fields = entry.get("fields") or []
        if not isinstance(fields, list):
            raise StudyError("validation", f"item {iid} fields must be a list")
        norm_fields: list[dict[str, Any]] = []
        for spec in fields:
            if not isinstance(spec, dict):
                raise StudyError("validation", f"item {iid} field must be an object")
            fid = require_id(spec.get("id"), f"item {iid} field id")
            checker = spec.get("checker") or {"type": "none"}
            if not isinstance(checker, dict):
                raise StudyError("validation", f"item {iid} field {fid} checker must be an object")
            require_choice(checker.get("type", "none"), CHECKER_TYPES, f"field {fid} checker type")
            norm_fields.append(
                {
                    "id": fid,
                    "label": _str(spec.get("label"), "field label", required=False, max_len=200) or fid,
                    "kind": _str(spec.get("kind"), "field kind", required=False, max_len=32) or "text",
                    "options": [str(o) for o in (spec.get("options") or [])],
                    "checker": checker,
                }
            )
        key = entry.get("key") or {}
        if not isinstance(key, dict):
            raise StudyError("validation", f"item {iid} key must be an object")
        support = key.get("support_refs") or []
        scorable = [f for f in norm_fields if f["checker"].get("type") != "none"]
        if scorable and not support:
            raise StudyError("validation", f"item {iid} has a scored key without support_refs")
        for ref in support:
            if not _support_resolves(str(ref), [s for s in sources if s["id"] in refs]):
                raise StudyError(
                    "validation",
                    f"item {iid} support ref {ref!r} does not resolve to a referenced source id, locator, or passage label",
                )
        example = entry.get("example")
        if example is not None and not isinstance(example, dict):
            raise StudyError("validation", f"item {iid} example must be an object")
        modes = entry.get("modes") or ["review", "learn", "practice"]
        for mode in modes:
            require_choice(mode, MODES, f"item {iid} mode")
        items.append(
            {
                "id": iid,
                "objective_id": oid,
                "source_refs": list(refs),
                "kind": _str(entry.get("kind"), "kind", required=False, max_len=32) or "concept",
                "stem": stem,
                "neutral_locator": neutral or (sources[0]["locator"] if sources else ""),
                "fields": norm_fields,
                "key": key,
                "feedback": entry.get("feedback") or {},
                "example": example,
                "hint": _str(entry.get("hint"), "hint", required=False, max_len=2000),
                "modes": list(modes),
                "predicted_seconds": int(entry.get("predicted_seconds") or 180),
                "why": _str(entry.get("why"), "why", required=False, max_len=400),
            }
        )

    exams_raw = raw.get("exams") or []
    exams: list[dict[str, Any]] = []
    for entry in exams_raw:
        if not isinstance(entry, dict):
            raise StudyError("validation", "each exam must be an object")
        exams.append(normalize_exam(entry, default_course=course, default_zone=zone))

    return {
        "packet_id": packet_id,
        "version": version,
        "title": title or packet_id,
        "course": course,
        "provenance": provenance,
        "zone": zone,
        "sources": sources,
        "objectives": objectives,
        "items": items,
        "exams": exams,
    }


def _support_resolves(ref: str, sources: list[dict[str, Any]]) -> bool:
    """A support ref must name a referenced source (id or locator) or a passage
    label that literally appears in that source's text (e.g. "P3" in P1–P7)."""
    token = ref.strip()
    if not token:
        return False
    for source in sources:
        if token in (source["id"], source["locator"]):
            return True
        if re.search(r"(?<![A-Za-z0-9])" + re.escape(token) + r"(?![A-Za-z0-9])", source["text"]):
            return True
    return False


def normalize_exam(entry: dict[str, Any], *, default_course: str = "", default_zone: str = "UTC") -> dict[str, Any]:
    exam_id = require_id(entry.get("id"), "exam.id")
    value = require_choice(entry.get("value", "unknown"), EXAM_VALUES, "exam value")
    return {
        "id": exam_id,
        "course": _str(entry.get("course"), "exam course", required=False, max_len=200) or default_course,
        "objective_scope": [str(o) for o in (entry.get("objective_scope") or [])],
        "value": value,
        "at": _str(entry.get("at"), "exam at", required=False, max_len=64),
        "date": _str(entry.get("date"), "exam date", required=False, max_len=32),
        "zone": _str(entry.get("zone"), "exam zone", required=False, max_len=64) or default_zone,
        "provenance": _str(entry.get("provenance"), "exam provenance", required=False, max_len=32)
        or "student",
        "label": _str(entry.get("label"), "exam label", required=False, max_len=200),
        "revision": int(entry.get("revision") or 1),
    }


def public_item(packet: dict[str, Any], item: dict[str, Any]) -> dict[str, Any]:
    """Item view safe to render before submission: no key, no feedback, no example."""
    return {
        "id": item["id"],
        "packet_id": packet["packet_id"],
        "packet_version": packet["version"],
        "course": packet["course"],
        "objective_id": item["objective_id"],
        "objective_label": next(
            (o["label"] for o in packet["objectives"] if o["id"] == item["objective_id"]),
            item["objective_id"],
        ),
        "kind": item["kind"],
        "stem": item["stem"],
        "neutral_locator": item["neutral_locator"],
        "fields": [
            {"id": f["id"], "label": f["label"], "kind": f["kind"], "options": f["options"],
             "scored": f["checker"].get("type") != "none"}
            for f in item["fields"]
        ],
        "has_example": item.get("example") is not None,
        "has_hint": bool(item.get("hint")),
        "modes": item["modes"],
        "predicted_seconds": item["predicted_seconds"],
        "provenance": packet["provenance"],
    }


def snapshot_path(user_root: Path, packet_id: str, version: int) -> Path:
    return packets_dir(user_root) / f"{packet_id}.v{version}.json"


def stage_packet(user_root: Path, packet: dict[str, Any]) -> Path:
    """Write the immutable version snapshot as ``.pending``; ``commit_packet``
    renames it after the import event is durable (crash-safe ordering)."""
    directory = packets_dir(user_root)
    directory.mkdir(parents=True, exist_ok=True)
    pending = snapshot_path(user_root, packet["packet_id"], packet["version"]).with_suffix(".json.pending")
    try:
        pending.write_text(canonical(packet), encoding="utf-8")
    except OSError as exc:
        raise StudyError("persistence_failed", f"could not save packet: {exc}") from exc
    return pending


def commit_packet(user_root: Path, packet_id: str, version: int) -> None:
    pending = snapshot_path(user_root, packet_id, version).with_suffix(".json.pending")
    final = snapshot_path(user_root, packet_id, version)
    current = packets_dir(user_root) / f"{packet_id}.json"
    try:
        if pending.exists():
            os.replace(pending, final)
        if final.exists():
            tmp = current.with_suffix(".tmp")
            tmp.write_text(final.read_text(encoding="utf-8"), encoding="utf-8")
            os.replace(tmp, current)
    except OSError as exc:
        raise StudyError("persistence_failed", f"could not commit packet: {exc}") from exc


def discard_pending(user_root: Path, packet_id: str, version: int) -> None:
    pending = snapshot_path(user_root, packet_id, version).with_suffix(".json.pending")
    try:
        pending.unlink()
    except OSError:
        pass


def _load_one(path: Path) -> dict[str, Any] | None:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        packet = validate_packet(raw)
    except (OSError, ValueError, StudyError):
        return None
    # Verify saved text still matches its recorded hash; a mismatch marks
    # the source stale so dependent items stop scoring (spec §4.3).
    for source in packet["sources"]:
        source["stale"] = source_hash(source["text"]) != raw_hash(raw, source["id"])
    return packet


def load_packets(user_root: Path) -> dict[str, dict[str, Any]]:
    """Current packets: ``{id}.json`` (latest committed version). ``.pending``
    files and version snapshots are ignored here."""
    directory = packets_dir(user_root)
    packets: dict[str, dict[str, Any]] = {}
    if not directory.is_dir():
        return packets
    for path in sorted(directory.glob("*.json")):
        if ".v" in path.stem:
            continue
        packet = _load_one(path)
        if packet is not None:
            packets[packet["packet_id"]] = packet
    return packets


def load_packet_version(user_root: Path, packet_id: str, version: int) -> dict[str, Any] | None:
    """Immutable snapshot an old attempt was graded against; None if absent."""
    return _load_one(snapshot_path(user_root, packet_id, version))


def pending_imports(user_root: Path) -> list[tuple[str, int]]:
    directory = packets_dir(user_root)
    if not directory.is_dir():
        return []
    rows: list[tuple[str, int]] = []
    for path in directory.glob("*.v*.json.pending"):
        stem = path.name[: -len(".json.pending")]
        packet_id, _, ver = stem.rpartition(".v")
        if packet_id and ver.isdigit():
            rows.append((packet_id, int(ver)))
    return rows


def raw_hash(raw: dict[str, Any], source_id: str) -> str:
    for entry in raw.get("sources") or []:
        if isinstance(entry, dict) and entry.get("id") == source_id:
            stored = entry.get("hash")
            if isinstance(stored, str) and stored:
                return stored
            return source_hash(str(entry.get("text") or "").strip())
    return ""


def load_exams(user_root: Path, packets: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Packet exams, overridden by student-edited records in exams.json (by id)."""
    merged: dict[str, dict[str, Any]] = {}
    for packet in packets.values():
        for exam in packet.get("exams") or []:
            merged[exam["id"]] = exam
    path = exams_path(user_root)
    if path.exists():
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            for entry in raw.get("exams") or []:
                exam = normalize_exam(entry)
                merged[exam["id"]] = exam
        except (OSError, ValueError, StudyError):
            pass
    return list(merged.values())


def save_exam(user_root: Path, exam: dict[str, Any]) -> None:
    path = exams_path(user_root)
    existing: list[dict[str, Any]] = []
    if path.exists():
        try:
            existing = list(json.loads(path.read_text(encoding="utf-8")).get("exams") or [])
        except (OSError, ValueError, AttributeError):
            existing = []
    existing = [e for e in existing if e.get("id") != exam["id"]] + [exam]
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(canonical({"exams": existing}), encoding="utf-8")
    os.replace(tmp, path)


def find_item(packets: dict[str, dict[str, Any]], item_id: str) -> tuple[dict[str, Any], dict[str, Any]] | None:
    for packet in packets.values():
        for item in packet["items"]:
            if item["id"] == item_id:
                return packet, item
    return None


def item_sources(packet: dict[str, Any], item: dict[str, Any]) -> list[dict[str, Any]]:
    return [s for s in packet["sources"] if s["id"] in item["source_refs"]]
