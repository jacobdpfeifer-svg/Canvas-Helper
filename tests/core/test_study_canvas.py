"""Phase 3: Canvas source records → packets → student-authored items."""

from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

import pytest

from canvas_mcp.core.study.model import StudyError
from canvas_mcp.core.study.service import StudyService

Z = "America/Denver"
FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "study" / "canvas_course_4242.json"


def T(text: str) -> datetime:
    return datetime.fromisoformat(text)


def svc(root: Path, at: str) -> StudyService:
    return StudyService(root, now=T(at), zone=Z)


def seed(root: Path, *, status: dict | None = None) -> None:
    directory = root / "inbox" / "study-sources"
    directory.mkdir(parents=True, exist_ok=True)
    shutil.copy(FIXTURE, directory / "4242.json")
    if status is not None:
        (directory / "status.json").write_text(json.dumps(status), encoding="utf-8")


def test_sync_status_is_honest(tmp_path: Path) -> None:
    s = svc(tmp_path, "2026-09-18T16:00:00-06:00")
    assert s.canvas_sources()["status"]["state"] == "never"
    seed(tmp_path, status={"schema": 1, "finished_at": "2026-09-18T15:00:00Z", "ok": True, "session": "ok", "courses": []})
    assert svc(tmp_path, "2026-09-18T16:00:00-06:00").canvas_sources()["status"]["state"] == "ok"
    assert svc(tmp_path, "2026-09-22T16:00:00-06:00").canvas_sources()["status"]["state"] == "stale"
    seed(tmp_path, status={"schema": 1, "finished_at": "2026-09-18T15:00:00Z", "ok": False, "session": "expired_or_missing", "courses": []})
    status = svc(tmp_path, "2026-09-18T16:00:00-06:00").canvas_sources()["status"]
    assert status["state"] == "session_expired" and "Sign in" in status["line"]
    seed(tmp_path, status={"schema": 1, "finished_at": "2026-09-18T15:00:00Z", "ok": True, "partial": True, "session": "ok", "courses": []})
    assert svc(tmp_path, "2026-09-18T16:00:00-06:00").canvas_sources()["status"]["state"] == "partial"


def test_import_selected_sources_then_author_and_practice(tmp_path: Path) -> None:
    seed(tmp_path)
    s = svc(tmp_path, "2026-09-18T16:00:00-06:00")
    listing = s.canvas_sources()
    assert listing["courses"][0]["imported_version"] is None
    assert [x["kind"] for x in listing["courses"][0]["sources"]] == ["syllabus", "page", "assignment"]
    res = s.canvas_import("4242", ["page-701", "syllabus-4242"])
    assert res["packet_id"] == "canvas-4242" and res["sources"] == 2 and res["items"] == 0
    s = svc(tmp_path, "2026-09-18T16:01:00-06:00")
    packet = s.packets["canvas-4242"]
    assert packet["provenance"] == "instructor"
    assert all(src["permission_scope"] == "instructor_permitted" for src in packet["sources"])
    assert packet["exams"][0]["provenance"] == "canvas_inferred" and packet["exams"][0]["value"] == "known_instant"
    assert len(packet["exams"]) == 1  # the undated quiz is not an exam record
    # Sources exist but no items yet: honest recovery path.
    offer = s.offer(course=packet["course"])
    assert offer["kind"] == "no_eligible_item" and offer["action"] == "create"
    # A student-authored, source-quoted item becomes practice.
    created = s.create_item(
        "canvas-4242",
        {
            "source_id": "page-701",
            "objective_label": "Derivative of sin x",
            "stem": "What is the derivative of sin x?",
            "checker_type": "expression",
            "answer": "cos x",
            "explanation": "Stated directly in the notes.",
            "support_quote": "The derivative of sin x is cos x.",
        },
    )
    assert created["version"] == 2 and created["item_id"] == "canvas-4242-i1"
    s = svc(tmp_path, "2026-09-18T16:02:00-06:00")
    offer = s.offer(course=packet["course"])
    assert offer["kind"] == "offer" and offer["item"]["id"] == "canvas-4242-i1"
    aid = s.start("canvas-4242-i1", "review")["attempt"]["attempt_id"]
    r = svc(tmp_path, "2026-09-18T16:03:00-06:00").submit(aid, "cos(x)", {"answer": "cos(x)"})
    assert r["assessment"]["outcome"] == "correct" and r["assessment"]["grader"] == "deterministic"
    assert r["key"]["provenance_label"] == "your key, quoted from instructor material"
    assert r["key"]["support_refs"] == ["The derivative of sin x is cos x."]
    # Exam cap: due +1 day (Sep 19) is before the Sep 28 08:00 Denver cutoff.
    assert r["state"]["due"] == "2026-09-19T22:03:00+00:00"


def test_reimport_keeps_student_items_and_bumps_version(tmp_path: Path) -> None:
    seed(tmp_path)
    s = svc(tmp_path, "2026-09-18T16:00:00-06:00")
    s.canvas_import("4242")
    s = svc(tmp_path, "2026-09-18T16:01:00-06:00")
    s.create_item("canvas-4242", {"source_id": "page-701", "objective_label": "Chain rule", "stem": "State the derivative of sin x.", "checker_type": "expression", "answer": "cos x", "explanation": "", "support_quote": "The derivative of sin x is cos x."})
    s = svc(tmp_path, "2026-09-18T16:02:00-06:00")
    again = s.canvas_import("4242", ["page-701"])
    assert again["version"] == 3 and again["kept_items"] == 1
    dropped = svc(tmp_path, "2026-09-18T16:03:00-06:00").canvas_import("4242", ["syllabus-4242"])
    assert dropped["kept_items"] == 0  # its source was not re-imported


def test_author_item_validation(tmp_path: Path) -> None:
    seed(tmp_path)
    s = svc(tmp_path, "2026-09-18T16:00:00-06:00")
    s.canvas_import("4242")
    s = svc(tmp_path, "2026-09-18T16:01:00-06:00")
    base = {"source_id": "page-701", "objective_label": "x", "stem": "What is the derivative of sin x?", "checker_type": "expression", "answer": "cos x", "explanation": ""}
    with pytest.raises(StudyError, match="verbatim"):
        s.create_item("canvas-4242", {**base, "support_quote": "not in the page"})
    with pytest.raises(StudyError, match="expected answer"):
        s.create_item("canvas-4242", {**base, "answer": "", "support_quote": "The derivative of sin x is cos x."})
    with pytest.raises(StudyError, match="unknown source"):
        s.create_item("canvas-4242", {**base, "source_id": "nope", "support_quote": "x"})
    # Free-text items need no quote and abstain when graded.
    created = s.create_item("canvas-4242", {**base, "checker_type": "none", "answer": "", "support_quote": ""})
    s = svc(tmp_path, "2026-09-18T16:02:00-06:00")
    aid = s.start(created["item_id"], "review")["attempt"]["attempt_id"]
    r = svc(tmp_path, "2026-09-18T16:03:00-06:00").submit(aid, "cos x", {"answer": "cos x"}, self_outcome="correct")
    assert r["assessment"]["grader"] == "student_self" and r["state"]["hits"] == 0
