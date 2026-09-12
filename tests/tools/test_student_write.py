"""Tests for Tier 1 student write tools (#170).

These cover the behaviour an operator and a student see. The security
invariants that must hold regardless of behaviour live in
``tests/security/test_student_write_invariants.py``.

``submit_assignment`` is read-only preview only (canvas-focus pivot, see
``docs/handoff/canvas-focus-pivot-2026-09-11.md``) — it never POSTs to
Canvas, so there is no confirm/upload/token machinery left to test here.
``comment_on_my_submission`` and ``mark_module_item_done`` still execute for
real and are unaffected by that pivot.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastmcp import FastMCP

from canvas_mcp.core.config import reset_config
from canvas_mcp.core.course_policy import reset_policy_cache
from canvas_mcp.tools.student_write import register_student_write_tools


def get_tools(**env):
    """Register the write tools under a given operator configuration.

    Returns a dict of tool name -> callable. A tool the operator has not
    enabled is genuinely absent from this dict, which is the point: it was
    never registered, so no agent can see it.
    """
    captured = {}
    mcp = FastMCP("test")
    original_tool = mcp.tool

    def capturing_tool(*args, **kwargs):
        decorator = original_tool(*args, **kwargs)

        def wrapper(fn):
            captured[fn.__name__] = fn
            return decorator(fn)

        return wrapper

    mcp.tool = capturing_tool
    with patch.dict("os.environ", env, clear=False):
        reset_config()
        register_student_write_tools(mcp)
    return captured


@pytest.fixture(autouse=True)
def _clean_state():
    reset_config()
    reset_policy_cache()
    yield
    reset_config()
    reset_policy_cache()


class TestOperatorCeiling:
    """STUDENT_WRITE_TOOLS is the campus-wide ceiling. Default is nothing."""

    def test_no_write_tools_by_default(self):
        tools = get_tools(STUDENT_WRITE_TOOLS="")
        assert "submit_assignment" not in tools
        assert "comment_on_my_submission" not in tools
        assert "mark_module_item_done" not in tools

    def test_read_tool_always_registered(self):
        tools = get_tools(STUDENT_WRITE_TOOLS="")
        assert "get_my_submission" in tools

    def test_only_named_tools_register(self):
        tools = get_tools(STUDENT_WRITE_TOOLS="submit_assignment")
        assert "submit_assignment" in tools
        assert "comment_on_my_submission" not in tools

    def test_accepts_comma_and_space_separated(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment, mark_module_item_done"
        )
        assert "submit_assignment" in tools
        assert "mark_module_item_done" in tools

    def test_unknown_names_do_not_register_anything(self):
        tools = get_tools(STUDENT_WRITE_TOOLS="take_quiz_for_me")
        assert "submit_assignment" not in tools


def _mock_assignment(**overrides):
    base = {
        "id": 42,
        "name": "Essay 1",
        "submission_types": ["online_text_entry"],
        "allowed_attempts": 3,
        "due_at": "2026-08-01T23:59:00Z",
    }
    base.update(overrides)
    return base


class TestSubmitAssignment:
    """Read-only preview. There is no confirm step and no POST."""

    @pytest.mark.asyncio
    async def test_preview_never_submits(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.side_effect = [_mock_assignment(), {"attempt": 1}]
            result = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_text_entry", body="hello",
            )

        assert "NOTHING has been submitted" in result
        assert "cannot submit it for you" in result
        assert "confirmation_token" not in result
        assert "Points possible:" in result
        assert "Accepted types:" in result
        # Only the two reads happened. No POST — the tool has no way to POST.
        assert all(call.args[0] == "get" for call in request.call_args_list)

    @pytest.mark.asyncio
    async def test_no_confirmation_token_parameter_exists(self):
        """There is nothing left to confirm into, so the parameter is gone."""
        import inspect

        tools = get_tools(STUDENT_WRITE_TOOLS="submit_assignment")
        assert "confirmation_token" not in inspect.signature(
            tools["submit_assignment"]
        ).parameters

    @pytest.mark.asyncio
    async def test_preview_includes_points_possible(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.side_effect = [
                _mock_assignment(points_possible=5),
                {"attempt": 0},
            ]
            result = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_text_entry", body="hello",
            )

        assert "Points possible: 5" in result
        assert "online_text_entry" in result

    @pytest.mark.asyncio
    async def test_quiz_assignment_blocked(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.return_value = _mock_assignment(
                submission_types=["online_quiz"],
                is_quiz_assignment=True,
                quiz_id=99,
            )
            result = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_text_entry", body="hello",
            )

        assert "quiz" in result.lower()
        assert request.call_count == 1

    @pytest.mark.asyncio
    async def test_group_assignment_refused_even_for_preview(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.side_effect = [_mock_assignment(group_category_id=7)]
            result = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_text_entry", body="hello",
            )

        assert "group assignment" in result

    @pytest.mark.asyncio
    async def test_rejects_type_the_assignment_does_not_accept(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.side_effect = [_mock_assignment(submission_types=["online_upload"])]
            result = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_text_entry", body="hello",
            )

        assert "does not accept" in result

    @pytest.mark.asyncio
    async def test_unsupported_submission_type_rejected(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        result = await tools["submit_assignment"](
            course_identifier="TEST", assignment_id=42,
            submission_type="online_quiz",
        )
        assert "must be one of" in result

    @pytest.mark.asyncio
    async def test_long_essay_is_not_truncated_in_the_preview(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        essay = "Paragraph. " * 300  # well past any excerpt limit
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.side_effect = [_mock_assignment(), {"attempt": 0}]
            preview = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_text_entry", body=essay,
            )

        assert essay in preview, "the student must see everything the preview describes"
        assert "..." not in preview.split("Content (")[1][:len(essay) + 50]

    @pytest.mark.asyncio
    async def test_invalid_base64_rejected(self):
        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.side_effect = [
                _mock_assignment(submission_types=["online_upload"]),
                {"attempt": 0},
            ]
            result = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_upload",
                file_contents=[{"name": "x.jpg", "content_base64": "not!base64!"}],
            )
        assert "not valid base64" in result

    @pytest.mark.asyncio
    async def test_assignment_restriction_is_reported_in_the_preview(self):
        """The instructor's allowed_extensions is checked even without an upload."""
        import base64

        tools = get_tools(
            STUDENT_WRITE_TOOLS="submit_assignment",
            COURSE_AGENT_POLICY_ENABLED="false",
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request:
            request.side_effect = [
                _mock_assignment(
                    submission_types=["online_upload"], allowed_extensions=["pdf"]
                ),
                {"attempt": 0},
            ]
            result = await tools["submit_assignment"](
                course_identifier="TEST", assignment_id=42,
                submission_type="online_upload",
                file_contents=[
                    {"name": "notes.txt", "content_base64": base64.b64encode(b"hi").decode()}
                ],
            )
        assert "does not accept" in result
        assert not [c for c in request.call_args_list if c.args[0] == "post"]


class TestMarkModuleItemDone:
    """#221: PUT .../done returns success even for items without a
    'must_mark_done' completion requirement — Canvas accepts it and changes
    nothing (measured live: plain Page/File items carry
    completion_requirement: null). The tool must check the requirement first
    and confirm the write actually landed.
    """

    def _tools(self):
        return get_tools(
            STUDENT_WRITE_TOOLS="mark_module_item_done",
            COURSE_AGENT_POLICY_ENABLED="false",
        )

    @staticmethod
    def _responder(item_states, put_result=None):
        """item_states: successive GET responses for the module item."""
        gets = list(item_states)
        calls = []

        async def responder(method, endpoint, **kwargs):
            calls.append((method, endpoint))
            if method == "get":
                return gets.pop(0) if len(gets) > 1 else gets[0]
            if method == "put":
                return put_result if put_result is not None else {}
            raise AssertionError(f"unexpected call {method} {endpoint}")

        responder.calls = calls
        return responder

    @pytest.mark.asyncio
    async def test_item_without_mark_done_requirement_is_refused(self):
        tools = self._tools()
        responder = self._responder(
            [{"id": 2, "title": "Spec page", "type": "Page",
              "completion_requirement": None}]
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["mark_module_item_done"](
                course_identifier="TEST", module_id=1, item_id=2
            )

        assert "✅" not in result
        assert "must_mark_done" in result
        assert not [c for c in responder.calls if c[0] == "put"]

    @pytest.mark.asyncio
    async def test_wrong_requirement_type_is_refused(self):
        tools = self._tools()
        responder = self._responder(
            [{"id": 2, "title": "Quiz", "type": "Quiz",
              "completion_requirement": {"type": "min_score", "min_score": 5}}]
        )
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["mark_module_item_done"](
                course_identifier="TEST", module_id=1, item_id=2
            )

        assert "✅" not in result
        assert "min_score" in result
        assert not [c for c in responder.calls if c[0] == "put"]

    @pytest.mark.asyncio
    async def test_confirmed_mark_done_reports_success(self):
        tools = self._tools()
        responder = self._responder([
            {"id": 2, "title": "Reading", "type": "Page",
             "completion_requirement": {"type": "must_mark_done", "completed": False}},
            {"id": 2, "title": "Reading", "type": "Page",
             "completion_requirement": {"type": "must_mark_done", "completed": True}},
        ])
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["mark_module_item_done"](
                course_identifier="TEST", module_id=1, item_id=2
            )

        assert "✅" in result
        assert [c for c in responder.calls if c[0] == "put"]

    @pytest.mark.asyncio
    async def test_unconfirmed_write_is_not_reported_as_success(self):
        """PUT accepted but the item still shows completed=False."""
        tools = self._tools()
        responder = self._responder([
            {"id": 2, "title": "Reading", "type": "Page",
             "completion_requirement": {"type": "must_mark_done", "completed": False}},
            {"id": 2, "title": "Reading", "type": "Page",
             "completion_requirement": {"type": "must_mark_done", "completed": False}},
        ])
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["mark_module_item_done"](
                course_identifier="TEST", module_id=1, item_id=2
            )

        assert "Could not confirm" in result
        assert "✅" not in result

    @pytest.mark.asyncio
    async def test_already_done_is_a_no_op_success(self):
        tools = self._tools()
        responder = self._responder([
            {"id": 2, "title": "Reading", "type": "Page",
             "completion_requirement": {"type": "must_mark_done", "completed": True}},
        ])
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["mark_module_item_done"](
                course_identifier="TEST", module_id=1, item_id=2
            )

        assert "already" in result
        assert not [c for c in responder.calls if c[0] == "put"]
