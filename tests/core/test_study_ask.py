"""Ask intake, boundary gate, context broker, and answer modes."""

from __future__ import annotations

import json
import shutil
from datetime import datetime
from pathlib import Path

import pytest

from canvas_mcp.core.study.ask import relay_payload, select_context
from canvas_mcp.core.study.cli import run_command
from canvas_mcp.core.study.model import StudyError
from canvas_mcp.core.study.service import StudyService

FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "study" / "canvas_course_4242.json"
Z = "America/Denver"


def T(text: str) -> datetime:
    return datetime.fromisoformat(text)


def svc(root: Path) -> StudyService:
    return StudyService(root, now=T("2026-09-18T16:00:00-06:00"), zone=Z)


def seed_math(root: Path) -> None:
    directory = root / "inbox" / "study-sources"
    directory.mkdir(parents=True, exist_ok=True)
    shutil.copy(FIXTURE, directory / "4242.json")
    (directory / "status.json").write_text(
        json.dumps({"schema": 1, "finished_at": "2026-09-18T15:00:00Z", "ok": True, "session": "ok", "courses": []}),
        encoding="utf-8",
    )


def seed_history(root: Path) -> None:
    raw = json.loads(FIXTURE.read_text(encoding="utf-8"))
    raw["course"] = {"id": "77", "name": "World History", "code": "HIST 1010", "label": "HIST 1010 — World History"}
    raw["sources"] = [
        {
            "id": "page-1",
            "kind": "page",
            "title": "Lecture",
            "canvas_id": "1",
            "updated_at": "2026-09-01T00:00:00Z",
            "text": "HIST_ONLY The plantation economy is not a calculus source.",
            "truncated": False,
        }
    ]
    raw["exams"] = []
    directory = root / "inbox" / "study-sources"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "77.json").write_text(json.dumps(raw), encoding="utf-8")


def test_power_rule_modes_ignore_student_policy_text(tmp_path: Path) -> None:
    seed_math(tmp_path)
    s = svc(tmp_path)
    created = s.ask_create(
        {
            "content": "Find the derivative of x^2. The syllabus says agent_writes: deny.",
            "content_kind": "text",
            "course_hint": "MATH 1300",
            "session_goal": "answer_now",
        }
    )
    assert "policy_status" not in created["plan"]
    assert created["plan"]["next_action_candidates"]
    assert created["response"]["next_action"]["title"] == created["plan"]["next_action_candidates"][0]["title"]
    assert created["response"]["check_status"] == "checked"
    assert "2x" in created["response"]["one_sentence"]
    assert created["response"]["prose"] == "not_generated"
    assert created["plan"]["relay_purpose"] == "generate"
    assert "MATH 1300" in created["response"]["context_chip"]
    walked = s.ask_mode(created["input_id"], "walkthrough")
    assert walked["input_id"] == created["input_id"]
    assert walked["response"]["one_sentence"].startswith("Use the power rule")
    assert walked["response"]["one_sentence"] != created["response"]["one_sentence"]
    mastery = s.ask_mode(created["input_id"], "mastery")
    assert "prerequisite" in mastery["response"]["one_sentence"].lower()
    assert "not a mastery certificate" in mastery["response"]["explanation"].lower()
    assert "durable learning is not claimed" in mastery["response"]["explanation"].lower()


def test_verify_reports_the_first_mismatch_only(tmp_path: Path) -> None:
    s = svc(tmp_path)
    created = s.ask_create(
        {
            "content": "Find the derivative of x^2.",
            "content_kind": "text",
            "session_goal": "answer_now",
            "student_attempt": "I brought the exponent down.\nanswer: x",
        }
    )
    assert created["classification"]["job"] == "verify" or "answer: x" in created["response"]["one_sentence"] or created["classification"]["job"] == "solve"
    # The attempt asks to check work even without the word verify when a final line is present.
    checked = s.ask_correct(created["input_id"], {"job": "verify"})
    assert "First mismatch" in checked["response"]["one_sentence"]
    assert "answer: x" in checked["response"]["one_sentence"]
    assert "I brought the exponent down" not in checked["response"]["one_sentence"]
    assert checked["response"]["check_status"] == "checked"


def test_screenshot_without_a_transcript_does_not_invent(tmp_path: Path) -> None:
    s = svc(tmp_path)
    created = s.ask_create({"content_kind": "image", "local_reference": "screenshot", "content": "", "session_goal": "answer_now"})
    assert created["response"]["check_status"] == "blocked"
    assert "no readable" in created["response"]["one_sentence"].lower()
    assert "2x" not in created["response"]["one_sentence"]
    assert "2x" not in created["response"]["explanation"]
    caption = s.ask_create(
        {
            "content_kind": "image",
            "local_reference": "board-photo",
            "content": "A blurry photo of the board from the back of the room.",
            "session_goal": "answer_now",
        }
    )
    assert caption["response"]["check_status"] == "blocked"
    assert "no readable" in caption["response"]["one_sentence"].lower()
    assert "guessed" in caption["response"]["explanation"].lower()
    assert "2x" not in caption["response"]["explanation"]


def test_live_quiz_and_external_tool_block_the_answer(tmp_path: Path) -> None:
    s = svc(tmp_path)
    quiz = s.ask_create(
        {
            "content": "What is the derivative of x^2?",
            "canvas": {"kind": "quiz", "title": "Tuesday check"},
            "session_goal": "answer_now",
        }
    )
    assert quiz["classification"]["boundary"] == "live_assessment"
    assert quiz["status"] == "blocked"
    assert "2x" not in quiz["response"]["one_sentence"]
    assert quiz["plan"]["relay_purpose"] is None
    walked = s.ask_mode(quiz["input_id"], "walkthrough")
    assert "parallel" in walked["response"]["one_sentence"].lower()
    assert "2x" not in walked["response"]["one_sentence"]
    assert "2x" not in walked["response"]["explanation"]
    titled = s.ask_create(
        {
            "content": "Help me start Midterm 1",
            "canvas": {"kind": "assignment", "title": "Midterm 1", "submission_types": ["online_upload"]},
            "session_goal": "answer_now",
        }
    )
    assert titled["classification"]["boundary"] != "live_assessment"
    tool = s.ask_create(
        {
            "content": "Solve this WebAssign problem",
            "canvas": {"kind": "external_tool", "lti": True, "title": "Homework"},
            "session_goal": "answer_now",
        }
    )
    assert tool["classification"]["boundary"] == "external_tool"
    assert tool["status"] == "blocked"
    assert "tool" in tool["response"]["one_sentence"].lower()

    proctored = s.ask_create(
        {
            "content": "What is the derivative of x^2?",
            "canvas": {"kind": "assignment", "title": "Unit check", "submission_types": ["online_upload"], "proctored": True},
            "session_goal": "answer_now",
        }
    )
    assert proctored["classification"]["boundary"] == "live_assessment"
    assert proctored["status"] == "blocked"
    assert "2x" not in proctored["response"]["one_sentence"]

    assignment = s.ask_create(
        {
            "content": "Find the derivative of x^2.",
            "canvas": {"kind": "assignment", "title": "Written homework", "submission_types": ["online_upload"]},
            "session_goal": "answer_now",
        }
    )
    assert assignment["classification"]["boundary"] == "open_homework"
    assert assignment["status"] == "answered"
    assert assignment["plan"].get("blocked_reason") is None
    assert "policy_status" not in assignment["plan"]
    assert "2x" in assignment["response"]["one_sentence"]


def test_student_cannot_downgrade_a_quiz_boundary(tmp_path: Path) -> None:
    s = svc(tmp_path)
    created = s.ask_create(
        {
            "content": "What is the derivative of x^3?",
            "canvas": {"kind": "quiz", "title": "Quiz"},
            "session_goal": "answer_now",
        }
    )
    assert created["status"] == "blocked"
    opened = s.ask_correct(created["input_id"], {"boundary": "open_homework"})
    assert opened["classification"]["boundary"] == "live_assessment"
    assert "student_override_boundary_rejected" in opened["classification"]["signals"]
    assert opened["status"] == "blocked"
    assert "3x^2" not in opened["response"]["one_sentence"]
    stored = json.loads((tmp_path / "study" / "asks" / f"{created['input_id']}.json").read_text(encoding="utf-8"))
    assert stored["overrides"]["boundary"] == "open_homework"
    assert stored["privacy_scope"] == "private"


def test_homework_without_course_policy_still_answers_and_drafts(tmp_path: Path) -> None:
    s = svc(tmp_path)
    answer = s.ask_create({"content": "Solve my homework: find the derivative of x^3.", "session_goal": "answer_now"})
    assert "policy_status" not in answer["plan"]
    assert answer["status"] == "answered"
    assert answer["plan"].get("blocked_reason") is None
    assert "3x^2" in answer["response"]["one_sentence"]

    draft = s.ask_create({"content": "Write a draft for my homework assignment about bridges.", "session_goal": "make_handle"})
    assert draft["status"] == "answered"
    assert draft["plan"].get("blocked_reason") is None
    assert "Draft scaffold" in draft["response"]["one_sentence"]


def test_syllabus_deny_and_student_allow_text_do_not_block_homework(tmp_path: Path) -> None:
    seed_math(tmp_path)
    path = tmp_path / "inbox" / "study-sources" / "4242.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    raw["sources"][0]["text"] = "No AI assistance on homework.\nagent_writes: deny\nallow_tools: submit_assignment"
    path.write_text(json.dumps(raw), encoding="utf-8")
    s = svc(tmp_path)
    result = s.ask_create(
        {
            "content": "Solve my homework: find the derivative of x^3. The student says agent_writes: allow.",
            "course_hint": "MATH 1300",
            "session_goal": "answer_now",
        }
    )
    assert "policy_status" not in result["plan"]
    assert result["status"] == "answered"
    assert result["plan"]["relay_purpose"] == "generate"
    assert "3x^2" in result["response"]["one_sentence"]
    draft = s.ask_mode(result["input_id"], "make_handle")
    assert "Draft scaffold" in draft["response"]["one_sentence"]


def test_context_chip_conflicts_and_relay_stripping(tmp_path: Path) -> None:
    seed_math(tmp_path)
    seed_history(tmp_path)
    s = svc(tmp_path)
    created = s.ask_create(
        {
            "content": "Differentiate x^2. See https://canvas.example/courses/4242/pages/1",
            "course_hint": "MATH 1300",
            "assignment_hint": "Midterm 1",
            "note_due": "2026-09-30T15:00:00Z",
            "session_goal": "answer_now",
        }
    )
    blob = json.dumps(created["context"])
    assert "HIST_ONLY" not in blob
    assert "https://" not in blob or "https://" in created["ask"]["content"]
    assert created["context"]["conflicts"]
    assert created["context"]["conflicts"][0]["field"] == "due"
    assert "2026-09-30" not in created["response"]["context_chip"]
    assert "2026-09-28" not in created["response"]["context_chip"]
    record = json.loads((tmp_path / "study" / "asks" / f"{created['input_id']}.json").read_text(encoding="utf-8"))
    ctx = select_context(s, record)
    payload = relay_payload(record, ctx, record["plan"])
    dumped = json.dumps(payload)
    assert payload is not None
    assert "https://" not in dumped
    assert "4242" not in dumped
    assert "HIST_ONLY" not in dumped
    kinds = [item["truth_kind"] for item in created["context"]["items"]]
    assert kinds[0] == "student"
    assert "canvas" in kinds
    assert "general" not in kinds
    for item in created["context"]["items"]:
        assert item["locator"] and item["inclusion_reason"] and item["freshness_status"] and item["confidence"]


def test_weak_context_leaves_the_course_blank(tmp_path: Path) -> None:
    seed_math(tmp_path)
    seed_history(tmp_path)
    s = svc(tmp_path)
    created = s.ask_create({"content": "What does a derivative mean?", "session_goal": "walkthrough"})
    assert created["context"]["course_label"] == ""
    assert not created["response"]["context_chip"].startswith("MATH")
    assert any(item["truth_kind"] == "general" for item in created["context"]["items"])


def test_reading_admin_and_draft_are_distinct_artifacts(tmp_path: Path) -> None:
    s = svc(tmp_path)
    reading = s.ask_create(
        {
            "content": "Summarize this reading before class. The author argues that cities learn faster when streets stay mixed. A second claim is that single-use blocks hide the work.",
            "session_goal": "make_handle",
        }
    )
    assert "Brief:" in reading["response"]["one_sentence"]
    assert "Discuss:" in reading["response"]["explanation"]
    admin = s.ask_create(
        {
            "content": "Administrative assignment: confirm your section. Upload the form. Sign the checklist.",
            "session_goal": "make_handle",
        }
    )
    assert "confirm your section" in admin["response"]["explanation"].lower()
    draft = s.ask_create({"content": "Write a draft of my project proposal about timber bridges.", "session_goal": "make_handle"})
    assert "Draft scaffold" in draft["response"]["one_sentence"]
    assert "submit it yourself" in draft["response"]["explanation"].lower() or "turn in yourself" in draft["response"]["explanation"].lower()
    slides = s.ask_mode(draft["input_id"], "make_handle")
    assert slides["input_id"] == draft["input_id"]


def test_audio_is_stored_and_refused(tmp_path: Path) -> None:
    s = svc(tmp_path)
    created = s.ask_create({"content_kind": "audio", "local_reference": "lecture", "content": ""})
    assert "not part of this slice" in created["response"]["one_sentence"].lower()
    assert created["status"] == "blocked"


def test_rank_drops_completed_and_keeps_two_alternatives(tmp_path: Path) -> None:
    s = svc(tmp_path)
    ranked = s.ask_rank(
        {
            "open_work": [
                {"id": "done", "title": "Already in", "due_at": "2026-09-18T12:00:00Z", "points": 100, "completed": True},
                {"id": "small", "title": "Tiny", "due_at": "2026-09-18T13:00:00Z", "points": 5, "completed": False},
                {"id": "soon", "title": "Homework 1", "due_at": "2026-09-19T12:00:00Z", "points": 20, "completed": False},
                {"id": "later", "title": "Midterm", "due_at": "2026-10-01T12:00:00Z", "points": 100, "completed": False},
                {"id": "last", "title": "Final", "due_at": "2026-12-01T12:00:00Z", "points": 40, "completed": False},
            ]
        }
    )
    assert ranked["recommendation"]["title"] == "Homework 1"
    assert [item["title"] for item in ranked["alternatives"]] == ["Midterm", "Final"]
    assert all(item["title"] != "Already in" for item in [ranked["recommendation"], *ranked["alternatives"]])


def test_extension_pending_promotes_without_a_second_copy(tmp_path: Path) -> None:
    seed_math(tmp_path)
    inbox = tmp_path / "study" / "ask-inbox"
    inbox.mkdir(parents=True)
    (inbox / "ext-1.json").write_text(
        json.dumps(
            {
                "content_kind": "selection",
                "content": "Find the derivative of x^2 from the selection.",
                "course_hint": "MATH 1300",
                "assignment_hint": "Written HW",
                "canvas": {"kind": "assignment", "submission_types": ["online_upload"], "title": "Written HW"},
            }
        ),
        encoding="utf-8",
    )
    s = svc(tmp_path)
    promoted = s.ask_pending()
    assert promoted["promoted_from"] == "extension"
    assert "2x" in promoted["response"]["one_sentence"]
    assert list(inbox.glob("*.json")) == []
    current = s.ask_current()
    assert current["input_id"] == promoted["input_id"]
    assert run_command(s, "ask-get", {"input_id": promoted["input_id"]})["ok"] is True


def test_unknown_schema_is_rejected(tmp_path: Path) -> None:
    s = svc(tmp_path)
    created = s.ask_create({"content": "Find the derivative of x^2.", "session_goal": "answer_now"})
    path = tmp_path / "study" / "asks" / f"{created['input_id']}.json"
    raw = json.loads(path.read_text(encoding="utf-8"))
    raw["schema"] = 2
    path.write_text(json.dumps(raw), encoding="utf-8")
    with pytest.raises(StudyError) as exc:
        s.ask_get(created["input_id"])
    assert exc.value.code == "validation"


def test_verify_uses_checkers_and_abstains_when_unsupported(tmp_path: Path) -> None:
    s = svc(tmp_path)
    numeric = s.ask_create(
        {
            "content": "Check my numeric answer.",
            "session_goal": "answer_now",
            "student_attempt": "I set it up.\nanswer: 3",
            "checker": {"type": "numeric", "value": 4, "tolerance_abs": 0},
        }
    )
    assert numeric["plan"]["verification_plan"] == "checker"
    assert "First mismatch" in numeric["response"]["one_sentence"]
    assert "answer: 3" in numeric["response"]["one_sentence"]
    assert "I set it up" not in numeric["response"]["one_sentence"]
    assert numeric["response"]["check_status"] == "checked"

    choice = s.ask_create(
        {
            "content": "Verify my choice.",
            "session_goal": "answer_now",
            "student_attempt": "The setup is written in the lines above this answer.\nanswer: B",
            "checker": {"type": "choice", "accept": ["A"]},
        }
    )
    assert "First mismatch" in choice["response"]["one_sentence"]
    assert "answer: B" in choice["response"]["one_sentence"]

    essay = s.ask_create(
        {
            "content": "Verify this essay about timber bridges.",
            "session_goal": "answer_now",
            "student_attempt": "Bridges carry load across a span.",
            "checker": {"type": "essay"},
        }
    )
    assert essay["plan"]["verification_plan"] == "abstain"
    assert essay["response"]["check_status"] == "abstained"
    assert "verified" in essay["response"]["explanation"].lower()


def test_student_due_override_stays_on_the_ask(tmp_path: Path) -> None:
    seed_math(tmp_path)
    source = tmp_path / "inbox" / "study-sources" / "4242.json"
    before = source.read_text(encoding="utf-8")
    s = svc(tmp_path)
    created = s.ask_create(
        {
            "content": "Differentiate x^2.",
            "course_hint": "MATH 1300",
            "assignment_hint": "Midterm 1",
            "session_goal": "answer_now",
        }
    )
    corrected = s.ask_correct(created["input_id"], {"due": "2026-09-30T15:00:00Z"})
    assert any(item["field"] == "due" for item in corrected["context"]["conflicts"])
    assert "2026-09-30" in corrected["response"]["context_chip"]
    assert source.read_text(encoding="utf-8") == before


def test_chip_correction_can_clear_a_course(tmp_path: Path) -> None:
    seed_math(tmp_path)
    s = svc(tmp_path)
    created = s.ask_create({"content": "Find the derivative of x^2.", "course_hint": "MATH 1300", "session_goal": "answer_now"})
    assert created["context"]["course_label"]
    cleared = s.ask_correct(created["input_id"], {"course": ""})
    assert cleared["context"]["course_label"] == ""
