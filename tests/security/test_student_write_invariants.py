"""Security invariants for Tier 1 student write tools (#170).

These tests exist to make specific public promises falsifiable. Each one
corresponds to a claim made to institutions evaluating this server, and each
should fail loudly if a future change quietly breaks it.
"""

import inspect
from unittest.mock import AsyncMock, patch

import pytest
from fastmcp import FastMCP

from canvas_mcp.core.config import get_config, reset_config
from canvas_mcp.core.course_policy import assert_no_identity_override
from canvas_mcp.tools.student_write import register_student_write_tools

ALL_WRITE_TOOLS = "submit_assignment,comment_on_my_submission,mark_module_item_done"

# Any parameter that could let a caller name someone other than themselves.
IDENTITY_PARAMS = {
    "user_id", "as_user_id", "student_id", "assessor_id",
    "user", "student", "on_behalf_of", "group_id",
}


def get_tools(**env):
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
    yield
    reset_config()


class TestNoIdentityOverride:
    """A student write must not be able to name another student."""

    def test_no_write_tool_accepts_an_identity_parameter(self):
        tools = get_tools(STUDENT_WRITE_TOOLS=ALL_WRITE_TOOLS)
        for name, fn in tools.items():
            params = set(inspect.signature(fn).parameters)
            offending = params & IDENTITY_PARAMS
            assert not offending, f"{name} exposes identity parameter(s): {offending}"

    @pytest.mark.parametrize(
        "field",
        [
            "as_user_id",
            "submission[user_id]",
            "user_id",
            "submission[group_id]",
            "group_id",
            "student_id",
        ],
    )
    def test_guard_rejects_each_identity_field(self, field):
        """The wire-level guard, not just the Python signature.

        This matters because the submit endpoint is NOT structurally
        self-scoped: Canvas honours submission[user_id] there when the token
        carries grading permission, and a person can hold both student and TA
        enrollments.
        """
        with pytest.raises(ValueError, match="identity-override"):
            assert_no_identity_override({"submission[body]": "x", field: "999"})

    def test_guard_allows_a_legitimate_body(self):
        assert_no_identity_override(
            {
                "submission[submission_type]": "online_text_entry",
                "submission[body]": "my essay",
                "comment[text_comment]": "here you go",
            }
        )

    @pytest.mark.asyncio
    async def test_submit_assignment_preview_never_posts(self):
        """submit_assignment is read-only (canvas-focus pivot): assert no POST.

        See docs/handoff/canvas-focus-pivot-2026-09-11.md.
        """
        tools = get_tools(
            STUDENT_WRITE_TOOLS=ALL_WRITE_TOOLS
        )
        assignment = {
            "id": 42, "name": "Essay", "submission_types": ["online_text_entry"],
            "allowed_attempts": -1,
        }

        async def responder(method, endpoint, **kwargs):
            assert method == "get", f"submit_assignment must never {method}"
            if endpoint.endswith("/submissions/self"):
                return {"attempt": 0}
            return assignment

        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["submit_assignment"](
                course_identifier="T", assignment_id=42,
                submission_type="online_text_entry", body="essay",
            )

        assert "NOTHING has been submitted" in result

    @pytest.mark.asyncio
    async def test_comment_preview_never_writes(self):
        """comment_on_my_submission is also read-only (canvas-focus pivot).

        A submission comment is visible to the instructor, so this is no
        longer a live write to assert an identity-override guard on. The
        guard itself (``assert_no_identity_override``) is still tested
        directly above; it stays available in ``core/course_policy.py`` for
        the next Bucket-A connector write that needs it.
        """
        tools = get_tools(
            STUDENT_WRITE_TOOLS=ALL_WRITE_TOOLS
        )

        async def responder(method, endpoint, **kwargs):
            raise AssertionError(f"comment_on_my_submission must never {method}")

        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["comment_on_my_submission"](
                course_identifier="T", assignment_id=42,
                comment="here you go",
            )

        assert "NOTHING has been posted" in result


class TestInlineFilenames:
    """A hosted caller supplies the filename, so it is untrusted input."""

    def test_path_traversal_in_a_supplied_name_is_stripped(self):
        from canvas_mcp.tools.student_write import _prepare_files

        prepared, error = _prepare_files(
            None,
            [{"name": "../../essay.pdf", "content_base64": "cGRmYnl0ZXM="}],
        )
        assert error is None
        assert ".." not in prepared[0].name
        assert "/" not in prepared[0].name

    def test_the_assignment_decides_which_types_are_allowed(self):
        """The instructor's allowed_extensions is the authority, not a global list.

        An earlier version enforced a hard-coded allowlist here, which could only
        ever disagree with the instructor, and which rejected ordinary student
        work such as .heic photos.
        """
        from canvas_mcp.tools.student_write import _prepare_files

        _, error = _prepare_files(
            None,
            [{"name": "photo.heic", "content_base64": "YWJj"}],
            allowed_extensions=frozenset({".pdf"}),
        )
        assert error is not None
        assert "does not accept" in error
        assert ".pdf" in error, "the student should be told what IS accepted"

    def test_types_the_assignment_permits_are_accepted(self):
        from canvas_mcp.tools.student_write import _prepare_files

        prepared, error = _prepare_files(
            None,
            [{"name": "photo.heic", "content_base64": "YWJj"}],
            allowed_extensions=frozenset({".heic", ".jpg"}),
        )
        assert error is None
        assert prepared[0].name == "photo.heic"

    def test_unrestricted_assignments_accept_any_type(self):
        """No global allowlist: .heic and .tex must both go through."""
        from canvas_mcp.tools.student_write import _prepare_files

        for name in ["photo.heic", "paper.tex", "data.dta"]:
            prepared, error = _prepare_files(
                None, [{"name": name, "content_base64": "YWJj"}]
            )
            assert error is None, f"{name} was rejected with no assignment restriction"
            assert prepared[0].name == name

    def test_canvas_extension_format_is_normalized(self):
        """Canvas stores allowed_extensions without dots and in mixed case."""
        from canvas_mcp.tools.student_write import _normalize_extensions

        assert _normalize_extensions(["PDF", "docx", ".Heic"]) == frozenset(
            {".pdf", ".docx", ".heic"}
        )
        assert _normalize_extensions([]) is None
        assert _normalize_extensions(None) is None

    def test_odd_extension_returns_an_error_not_an_exception(self):
        from canvas_mcp.tools.student_write import _prepare_files

        for name in ["noextension", "trailing.", "x" * 300 + ".pdf", ".hidden"]:
            _, error = _prepare_files(
                None, [{"name": name, "content_base64": "YWJj"}]
            )
            assert isinstance(error, (str, type(None)))


class TestUploadResourceBounds:
    """A per-file cap alone lets one request exhaust server memory."""

    def test_file_count_is_capped(self):
        import base64

        from canvas_mcp.tools.student_write import _MAX_UPLOAD_FILES, _prepare_files

        tiny = base64.b64encode(b"x").decode()
        _, error = _prepare_files(
            None,
            [
                {"name": f"f{i}.txt", "content_base64": tiny}
                for i in range(_MAX_UPLOAD_FILES + 1)
            ],
        )
        assert error is not None
        assert "Too many files" in error

    def test_aggregate_size_is_capped_without_decoding(self):
        """Many individually-legal files must not add up to an illegal request.

        The check runs on the encoded length, so an oversized request is refused
        before its bytes are ever materialized.
        """
        from canvas_mcp.tools.student_write import (
            _MAX_TOTAL_UPLOAD_BYTES,
            _prepare_files,
        )

        # Six ~20MB claims: each under the per-file cap, together over the total.
        chunk = "A" * ((20 * 1024 * 1024) // 3 * 4)
        _, error = _prepare_files(
            None,
            [{"name": f"f{i}.pdf", "content_base64": chunk} for i in range(6)],
        )
        assert error is not None
        assert "total more than" in error
        assert _MAX_TOTAL_UPLOAD_BYTES > 0

    def test_pre_decode_size_estimate_is_exact(self):
        """The size check must not overshoot, or it rejects legal uploads.

        The naive len(encoded)//4*3 overshoots by the padding count, so a file
        whose decoded size is exactly the documented limit would be refused
        before it was ever decoded. Checked across all three padding cases.
        """
        import base64

        from canvas_mcp.tools.student_write import _decoded_size

        for length in range(0, 40):
            payload = b"x" * length
            encoded = base64.b64encode(payload).decode()
            assert _decoded_size(encoded) == length, (
                f"estimate wrong for {length} bytes "
                f"(padding={encoded.count('=')})"
            )

    def test_boundary_file_is_not_rejected_by_the_estimate(self):
        """Exercise the limit comparison itself without allocating 100 MB."""
        import base64

        from canvas_mcp.tools.student_write import _decoded_size

        # Worst case for the naive formula: two padding characters.
        payload = b"x" * 100
        encoded = base64.b64encode(payload).decode()
        assert encoded.endswith("=="), "expected two padding characters"
        assert _decoded_size(encoded) == 100
        # The naive formula would have said 102 and could refuse a limit-sized file.
        assert len(encoded) // 4 * 3 == 102

    def test_a_normal_submission_still_works(self):
        """The bounds must not break the ordinary case."""
        import base64

        from canvas_mcp.tools.student_write import _prepare_files

        prepared, error = _prepare_files(
            None,
            [
                {"name": "essay.pdf", "content_base64": base64.b64encode(b"pdf").decode()},
                {"name": "chart.png", "content_base64": base64.b64encode(b"png").decode()},
            ],
        )
        assert error is None
        assert [p.name for p in prepared] == ["essay.pdf", "chart.png"]


class TestHostedFileIngress:
    """file_paths reads the SERVER's disk. That must not be reachable remotely."""

    @pytest.mark.asyncio
    async def test_local_paths_refused_over_http_transport(self):
        """Otherwise a remote caller could exfiltrate server files.

        They would name any path the server process can read and upload it into
        their own Canvas submission.
        """
        tools = get_tools(
            STUDENT_WRITE_TOOLS=ALL_WRITE_TOOLS
        )
        assignment = {
            "id": 42, "name": "E", "submission_types": ["online_upload"],
            "allowed_attempts": -1,
        }
        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new_callable=AsyncMock
        ) as request, patch(
            "canvas_mcp.tools.student_write.is_http_request_active", return_value=True
        ):
            request.side_effect = [assignment, {"attempt": 0}]
            result = await tools["submit_assignment"](
                course_identifier="T", assignment_id=42,
                submission_type="online_upload", file_paths=["/etc/passwd"],
            )

        assert "only available on a local (stdio) server" in result
        assert not [c for c in request.call_args_list if c.args[0] == "post"]


class TestModuleDoneConfirmationGuard:
    """mark_module_item_done must not PUT without a redeemed confirmation token."""

    @pytest.mark.asyncio
    async def test_preview_never_puts(self):
        from canvas_mcp.tools.student_write import _MODULE_DONE_GUARD

        _MODULE_DONE_GUARD.reset()
        tools = get_tools(
            STUDENT_WRITE_TOOLS="mark_module_item_done",
        )
        calls = []

        async def responder(method, endpoint, **kwargs):
            calls.append(method)
            return {
                "id": 2,
                "title": "Reading",
                "completion_requirement": {
                    "type": "must_mark_done",
                    "completed": False,
                },
            }

        with patch(
            "canvas_mcp.tools.student_write.get_course_id",
            new=AsyncMock(return_value="123"),
        ), patch(
            "canvas_mcp.tools.student_write.make_canvas_request", new=responder
        ):
            result = await tools["mark_module_item_done"](
                course_identifier="TEST", module_id=1, item_id=2
            )

        assert "confirmation_token=" in result
        assert "put" not in calls
        assert "confirmation_token" in inspect.signature(
            tools["mark_module_item_done"]
        ).parameters
