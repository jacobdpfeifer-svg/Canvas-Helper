"""Tier 1 student write tools (#170).

Canvas-focus pivot (see ``docs/handoff/canvas-focus-pivot-2026-09-11.md``):
this product does not act on a student's behalf toward anyone else. Both
tools whose Canvas write would be visible to the instructor are now preview
only, with no execution path and no confirmation-token flow to redeem:

- ``submit_assignment`` previews points, due date, accepted types and
  attempts remaining, then always ends in "submit this yourself in Canvas."
- ``comment_on_my_submission`` previews the comment text, then always ends
  in "add this yourself in Canvas."

``mark_module_item_done`` still executes for real — it is a private,
self-only completion toggle with no visibility to anyone else, so it was not
in scope of that pivot. Two properties remain load-bearing across this file:

1. **Operator ceiling.** A tool absent from ``STUDENT_WRITE_TOOLS`` is never
   registered, so it never enters the MCP tool list. The default is empty.
2. **Instructor agency.** Within that ceiling, a per-course policy can further
   restrict even previewing, re-checked on every call. See
   ``core/course_policy.py``.

``assert_no_identity_override`` (identity-override denylist for outbound
write bodies) has no live call site left in this file — neither remaining
preview writes anything, and ``mark_module_item_done`` sends no body at all.
It stays available in ``core/course_policy.py`` for the next Bucket-A
connector write that needs it; see ``core/connector_guards.py``.

Group assignments are refused in ``submit_assignment``'s preview: a
submission to a group assignment becomes the whole group's submission,
affecting students who never consented, and those shared-attempt semantics
deserve their own decision even for a preview.
"""

from __future__ import annotations

import base64
import binascii
import os
from typing import Any

from fastmcp import FastMCP
from mcp.types import ToolAnnotations

from ..core.cache import get_course_id
from ..core.client import make_canvas_request
from ..core.config import get_config
from ..core.course_policy import check_student_write_allowed
from ..core.credentials import is_http_request_active
from ..core.dates import format_date
from ..core.file_validation import (
    DEFAULT_MAX_FILE_SIZE_BYTES,
    detect_mime_type,
    sanitize_filename,
)
from ..core.untrusted_content import (
    FENCE_LEAK_ERROR,
    contains_fence_markers,
    fence_untrusted,
    fence_untrusted_inline,
)
from ..core.validation import coerce_canvas_id, validate_params
from ..core.write_confirmation import unconfirmed_write_warning

# Submission types this tool supports. Quiz and discussion types are absent by
# design: quiz-taking is refused for this student fork (academic integrity),
# and discussion participation already has dedicated tools.
_SUPPORTED_TYPES = ("online_text_entry", "online_url", "online_upload")

# Assignment shapes that look like quizzes — soft-blocked so the agent cannot
# walk the student into submitting assessments via this tool.
_QUIZ_SUBMISSION_TYPES = frozenset({"online_quiz"})


def _assignment_looks_like_quiz(assignment: dict[str, Any]) -> bool:
    """True when Canvas metadata indicates a quiz-style assessment."""
    if assignment.get("is_quiz_assignment"):
        return True
    if assignment.get("quiz_id") is not None:
        return True
    types = assignment.get("submission_types") or []
    return any(t in _QUIZ_SUBMISSION_TYPES for t in types)

# These tools are self-scoped by a hard-coded "/submissions/self" path suffix. That
# only holds while assignment_id cannot end the path early, so a non-numeric ID is
# refused outright rather than passed to Canvas.
_INVALID_ASSIGNMENT_ID = (
    "Error: assignment_id must be a numeric Canvas assignment ID. "
    "Use list_assignments to find it."
)

# Whole-request upload bounds. These exist on top of the per-file limit in
# core/file_validation, which on its own would allow an unlimited number of
# maximum-size files in a single call. Both are checked before any file content
# is decoded or read.
_MAX_UPLOAD_FILES = 20
_MAX_TOTAL_UPLOAD_BYTES = DEFAULT_MAX_FILE_SIZE_BYTES


def _too_large_message() -> str:
    limit_mb = _MAX_TOTAL_UPLOAD_BYTES // (1024 * 1024)
    return (
        f"❌ Those files total more than the {limit_mb} MB allowed for one "
        "submission. Submit fewer or smaller files, or upload them in Canvas."
    )

class _PreparedFile:
    """A file staged for upload, with its bytes already resolved.

    Holds bytes rather than a path because the two ingress modes differ: a
    stdio caller names a local file, while an HTTP caller must inline the
    content. Normalizing early keeps the upload path identical for both.
    """

    def __init__(self, name: str, content: bytes, mime_type: str) -> None:
        self.name = name
        self.content = content
        self.mime_type = mime_type

    @property
    def size(self) -> int:
        return len(self.content)


def _describe_attempts(assignment: dict, submission: dict) -> str:
    """Render attempt usage for the preview.

    Canvas encodes "unlimited" as ``allowed_attempts = -1`` (and often omits the
    field), which is the detail worth stating plainly: the student needs to know
    whether proceeding spends a scarce resource.
    """
    allowed = assignment.get("allowed_attempts")
    used = submission.get("attempt") or 0

    if allowed is None or allowed == -1:
        return f"Attempts: {used} used, unlimited allowed"

    remaining = allowed - used
    warning = "  ⚠️  This is your LAST attempt." if remaining <= 1 else ""
    return f"Attempts: {used} of {allowed} used, {remaining} remaining.{warning}"


def _decoded_size(encoded: str) -> int:
    """How many bytes a base64 string will decode to, computed without decoding.

    Used to reject an oversized upload before allocating it. The naive
    ``len(encoded) // 4 * 3`` overshoots by the number of padding characters, so
    a file whose decoded size is exactly the documented limit would be refused;
    subtracting the trailing '=' makes this exact for well-formed input.
    """
    padding = len(encoded) - len(encoded.rstrip("="))
    return max(0, len(encoded) // 4 * 3 - padding)


def _normalize_extensions(raw: list[str] | None) -> frozenset[str] | None:
    """Normalize an assignment's ``allowed_extensions`` into ``{'.pdf', ...}``.

    Canvas stores these without leading dots and with inconsistent case. An
    empty or absent list means the assignment does not restrict types.
    """
    if not raw:
        return None
    return frozenset(
        f".{str(ext).strip().lstrip('.').lower()}" for ext in raw if str(ext).strip()
    )


def _check_submission_name(
    name: str, allowed_extensions: frozenset[str] | None
) -> tuple[str, str | None]:
    """Sanitize a filename and check it against the ASSIGNMENT's own rules.

    Returns ``(safe_name, error)``.

    Deliberately no global extension allowlist. The instructor's
    ``allowed_extensions`` on the assignment is the legitimate statement of what
    that assignment accepts; a separate hard-coded list can only disagree with
    it, and the one previously used here rejected ordinary student work such as
    ``.heic`` photos and ``.tex`` sources. Sanitization is still applied, since
    a malicious *path* is a real attack whereas an unusual extension is not.
    """
    safe_name = sanitize_filename(name)
    if not safe_name or safe_name in (".", ".."):
        return "", f"❌ '{name}' is not a usable filename."

    if allowed_extensions is not None:
        extension = os.path.splitext(safe_name)[1].lower()
        if extension not in allowed_extensions:
            accepted = ", ".join(sorted(allowed_extensions))
            return "", (
                f"❌ This assignment does not accept "
                f"'{extension or 'files without an extension'}'. "
                f"It accepts: {accepted}"
            )
    return safe_name, None


def _prepare_files(
    file_paths: list[str] | None,
    file_contents: list[dict[str, str]] | None,
    allowed_extensions: frozenset[str] | None = None,
) -> tuple[list[_PreparedFile], str | None]:
    """Resolve either ingress mode into raw bytes.

    Returns ``(files, error)``.

    ``file_paths`` reads the *server's* filesystem, which is correct for a
    local stdio server and a serious disclosure hole for a shared HTTP one: a
    remote caller could name any file the server process can read and upload it
    into their own Canvas submission. It is therefore refused outright over HTTP
    transport, where callers must inline content instead.
    """
    prepared: list[_PreparedFile] = []

    if file_paths and is_http_request_active():
        return [], (
            "Error: 'file_paths' reads files from the server and is only "
            "available on a local (stdio) server. On this hosted server, pass "
            "the file with 'file_contents' as base64 instead."
        )

    # Bound the whole request, not just each file. A per-file cap alone lets a
    # caller send an unlimited NUMBER of maximum-size files, and the preview
    # decodes and holds them all before any confirmation is required, so one
    # authenticated request could exhaust a shared server's memory.
    total_files = len(file_paths or []) + len(file_contents or [])
    if total_files > _MAX_UPLOAD_FILES:
        return [], (
            f"❌ Too many files ({total_files}). At most {_MAX_UPLOAD_FILES} may "
            "be submitted at once."
        )

    running_bytes = 0

    for path in file_paths or []:
        if not os.path.isfile(path):
            return [], f"❌ Cannot submit '{path}': no such file."
        try:
            file_size = os.path.getsize(path)
        except OSError as exc:
            return [], f"❌ Could not read '{path}': {exc}"
        if file_size > DEFAULT_MAX_FILE_SIZE_BYTES:
            return [], f"❌ '{path}' exceeds the maximum upload size."
        running_bytes += file_size
        if running_bytes > _MAX_TOTAL_UPLOAD_BYTES:
            return [], _too_large_message()

        safe_name, name_error = _check_submission_name(
            os.path.basename(path), allowed_extensions
        )
        if name_error:
            return [], name_error
        try:
            with open(path, "rb") as handle:
                content = handle.read()
        except OSError as exc:
            return [], f"❌ Could not read '{path}': {exc}"
        prepared.append(
            _PreparedFile(safe_name, content, detect_mime_type(safe_name))
        )

    for entry in file_contents or []:
        name = str(entry.get("name") or "").strip()
        encoded = entry.get("content_base64")
        if not name or not encoded:
            return [], "Error: each file_contents entry needs 'name' and 'content_base64'"

        # Bound sizes BEFORE decoding, so an oversized request is rejected
        # without ever allocating the buffer it describes.
        encoded = encoded.strip()
        approx_size = _decoded_size(encoded)
        if approx_size > DEFAULT_MAX_FILE_SIZE_BYTES:
            return [], f"❌ '{name}' exceeds the maximum upload size."
        running_bytes += approx_size
        if running_bytes > _MAX_TOTAL_UPLOAD_BYTES:
            return [], _too_large_message()

        try:
            content = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError):
            return [], f"❌ '{name}' is not valid base64."

        # Validate the name the CLIENT actually supplied. An earlier version
        # checked a temp file's random basename instead, which meant the
        # sanitized result was discarded and a name like "../essay.pdf" reached
        # Canvas untouched.
        safe_name, name_error = _check_submission_name(name, allowed_extensions)
        if name_error:
            return [], name_error
        if len(content) > DEFAULT_MAX_FILE_SIZE_BYTES:
            return [], f"❌ '{name}' exceeds the maximum upload size."

        prepared.append(
            _PreparedFile(safe_name, content, detect_mime_type(safe_name))
        )

    return prepared, None


def register_student_write_tools(mcp: FastMCP) -> None:
    """Register Tier 1 student tools.

    ``get_my_submission`` is read-only and always registered. The write tools
    register only when the operator has named them in ``STUDENT_WRITE_TOOLS``,
    so an unlisted tool never becomes visible to an agent at all.
    """
    enabled = get_config().student_write_tools

    @mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
    @validate_params
    async def get_my_submission(
        course_identifier: str | int,
        assignment_id: str | int,
    ) -> str:
        """Get your own submission for an assignment, including attempts used.

        Args:
            course_identifier: Course code or Canvas ID
            assignment_id: Canvas assignment ID
        """
        validated_assignment_id = coerce_canvas_id(assignment_id)
        if validated_assignment_id is None:
            return _INVALID_ASSIGNMENT_ID
        assignment_id = validated_assignment_id

        course_id = await get_course_id(course_identifier)
        if not course_id:
            return f"Error: Could not find course {course_identifier}"

        submission = await make_canvas_request(
            "get",
            f"/courses/{course_id}/assignments/{assignment_id}/submissions/self",
            params={"include[]": ["submission_comments", "assignment"]},
        )
        if isinstance(submission, dict) and "error" in submission:
            return f"Error fetching submission: {submission['error']}"

        assignment = submission.get("assignment") or {}
        lines = [
            # Assignment name and submission comments are author-controlled
            # (teacher/peer feedback) — fenced (issue 239).
            f"Submission for: {fence_untrusted_inline(assignment.get('name', f'Assignment {assignment_id}'), 'assignment name')}",
            f"Status: {submission.get('workflow_state', 'unsubmitted')}",
        ]

        if submission.get("submitted_at"):
            lines.append(f"Submitted: {format_date(submission['submitted_at'])}")
        else:
            lines.append("Submitted: not yet")

        if assignment.get("due_at"):
            lines.append(f"Due: {format_date(assignment['due_at'])}")
        if assignment.get("lock_at"):
            lines.append(f"Locks: {format_date(assignment['lock_at'])}")

        lines.append(_describe_attempts(assignment, submission))

        if submission.get("grade") is not None:
            lines.append(f"Grade: {submission['grade']}")

        comments = submission.get("submission_comments") or []
        if comments:
            lines.append(f"\nComments ({len(comments)}):")
            for comment in comments:
                author = comment.get("author_name")
                prefix = (
                    f"{fence_untrusted_inline(author, 'comment author')}: "
                    if author else ""
                )
                lines.append(
                    f"• {prefix}"
                    f"{fence_untrusted(comment.get('comment', ''), 'submission comment')}"
                )

        return "\n".join(lines)

    if "submit_assignment" in enabled:

        @mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
        @validate_params
        async def submit_assignment(
            course_identifier: str | int,
            assignment_id: str | int,
            submission_type: str,
            body: str | None = None,
            url: str | None = None,
            file_paths: list[str] | None = None,
            file_contents: list[dict[str, str]] | None = None,
            comment: str | None = None,
        ) -> str:
            """Preview one of YOUR OWN assignment submissions. Never submits.

            Read-only by design (canvas-focus pivot,
            docs/handoff/canvas-focus-pivot-2026-09-11.md): a submission is
            visible to your instructor and consumes an attempt, so this
            product does not act on your behalf here. Use this to check
            points, due date, accepted types, and attempts remaining — then
            submit it yourself in Canvas.

            Args:
                course_identifier: Course code or Canvas ID
                assignment_id: Canvas assignment ID
                submission_type: online_text_entry, online_url, or online_upload
                body: HTML/text content for online_text_entry
                url: URL for online_url
                file_paths: Local file paths (local stdio servers only, any file type)
                file_contents: Inline files as [{"name": ..., "content_base64": ...}]
                comment: Optional comment you would attach to the submission
            """
            if submission_type not in _SUPPORTED_TYPES:
                return (
                    f"Error: submission_type must be one of "
                    f"{', '.join(_SUPPORTED_TYPES)} (got '{submission_type}')"
                )

            validated_assignment_id = coerce_canvas_id(assignment_id)
            if validated_assignment_id is None:
                return _INVALID_ASSIGNMENT_ID
            assignment_id = validated_assignment_id

            course_id = await get_course_id(course_identifier)
            if not course_id:
                return f"Error: Could not find course {course_identifier}"

            allowed, reason = await check_student_write_allowed(
                course_id, "submit_assignment"
            )
            if not allowed:
                return f"❌ Submission blocked. {reason}"

            # Backstop for issue 239: never publish our provenance markers into
            # a submission body or its comment.
            if contains_fence_markers(body or "") or contains_fence_markers(comment or ""):
                return FENCE_LEAK_ERROR

            if submission_type == "online_text_entry" and not body:
                return "Error: online_text_entry requires 'body'"
            if submission_type == "online_url" and not url:
                return "Error: online_url requires 'url'"
            if submission_type == "online_upload" and not (file_paths or file_contents):
                return "Error: online_upload requires 'file_paths' or 'file_contents'"

            assignment = await make_canvas_request(
                "get", f"/courses/{course_id}/assignments/{assignment_id}"
            )
            if isinstance(assignment, dict) and "error" in assignment:
                return f"Error fetching assignment: {assignment['error']}"

            if _assignment_looks_like_quiz(assignment):
                return (
                    "❌ This looks like a quiz or LTI assessment "
                    f"(types: {', '.join(assignment.get('submission_types') or []) or 'unknown'}). "
                    "Take it in Canvas — this tool never handles quizzes."
                )

            # A group submission becomes the whole group's submission and
            # consumes a shared attempt, affecting students who never consented.
            # Refused even for a preview.
            if assignment.get("group_category_id"):
                return (
                    "❌ This is a group assignment. Submit it in Canvas — "
                    "previewing here would still describe a submission that "
                    "affects classmates who never consented."
                )

            accepted_types = assignment.get("submission_types") or []
            if submission_type not in accepted_types:
                return (
                    f"❌ This assignment does not accept '{submission_type}'. "
                    f"It accepts: {', '.join(accepted_types) or 'nothing'}"
                )

            submission = await make_canvas_request(
                "get",
                f"/courses/{course_id}/assignments/{assignment_id}/submissions/self",
            )
            if not isinstance(submission, dict) or "error" in submission:
                detail = (
                    submission.get("error")
                    if isinstance(submission, dict)
                    else "unexpected response from Canvas"
                )
                return (
                    "❌ Could not read your current submission state: "
                    f"{detail}"
                )

            prepared, prep_error = _prepare_files(
                file_paths,
                file_contents,
                _normalize_extensions(assignment.get("allowed_extensions")),
            )
            if prep_error:
                return prep_error

            preview = [
                "📋 Submission preview — this tool never submits.",
                "",
                # Assignment name is instructor-authored — fenced (issue 239),
                # same as get_my_submission.
                f"Assignment: {fence_untrusted_inline(assignment.get('name', str(assignment_id)), 'assignment name')}",
                f"Requested type: {submission_type}",
                f"Accepted types: {', '.join(accepted_types) or 'none'}",
                f"Points possible: {assignment.get('points_possible', 'N/A')}",
            ]
            if assignment.get("due_at"):
                preview.append(f"Due: {format_date(assignment['due_at'])}")
            if assignment.get("lock_at"):
                preview.append(f"Locks: {format_date(assignment['lock_at'])}")
            preview.append(_describe_attempts(assignment, submission))
            preview.append("")

            if submission_type == "online_text_entry":
                text = body or ""
                preview.append(f"Content ({len(text)} chars):\n{text}")
            elif submission_type == "online_url":
                preview.append(f"URL: {url}")
            else:
                preview.append("Files:")
                for item in prepared:
                    preview.append(f"• {item.name} ({item.mime_type}, {item.size} bytes)")
            if comment:
                preview.append(f"\nComment: {comment}")

            preview.append(
                "\n➡️  NOTHING has been submitted, and this tool cannot submit "
                "it for you. Show this preview in chat, then submit it "
                "yourself in Canvas."
            )
            return "\n".join(preview)

    if "comment_on_my_submission" in enabled:

        @mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
        @validate_params
        async def comment_on_my_submission(
            course_identifier: str | int,
            assignment_id: str | int,
            comment: str,
        ) -> str:
            """Preview a comment on YOUR OWN submission. Never posts it.

            Read-only by design (canvas-focus pivot,
            docs/handoff/canvas-focus-pivot-2026-09-11.md): a submission
            comment is visible to your instructor, so this product does not
            post it for you. Use this to check the wording, then add it
            yourself in Canvas.

            Args:
                course_identifier: Course code or Canvas ID
                assignment_id: Canvas assignment ID
                comment: The comment text
            """
            if not comment.strip():
                return "Error: comment cannot be empty"

            # Backstop for issue 239: never publish our provenance markers.
            if contains_fence_markers(comment):
                return FENCE_LEAK_ERROR

            validated_assignment_id = coerce_canvas_id(assignment_id)
            if validated_assignment_id is None:
                return _INVALID_ASSIGNMENT_ID
            assignment_id = validated_assignment_id

            course_id = await get_course_id(course_identifier)
            if not course_id:
                return f"Error: Could not find course {course_identifier}"

            allowed, reason = await check_student_write_allowed(
                course_id, "comment_on_my_submission"
            )
            if not allowed:
                return f"❌ Comment blocked. {reason}"

            return (
                "📋 Comment preview — this tool never posts it.\n\n"
                f"Comment ({len(comment)} chars):\n{comment}\n\n"
                "➡️  NOTHING has been posted, and this tool cannot post it "
                "for you. Add this comment yourself in Canvas."
            )

    if "mark_module_item_done" in enabled:

        @mcp.tool(annotations=ToolAnnotations(destructiveHint=False, idempotentHint=True))
        @validate_params
        async def mark_module_item_done(
            course_identifier: str | int,
            module_id: str | int,
            item_id: str | int,
        ) -> str:
            """Mark a module item done for YOURSELF.

            Args:
                course_identifier: Course code or Canvas ID
                module_id: Canvas module ID
                item_id: Canvas module item ID
            """
            course_id = await get_course_id(course_identifier)
            if not course_id:
                return f"Error: Could not find course {course_identifier}"

            allowed, reason = await check_student_write_allowed(
                course_id, "mark_module_item_done"
            )
            if not allowed:
                return f"❌ Update blocked. {reason}"

            item_endpoint = (
                f"/courses/{course_id}/modules/{module_id}/items/{item_id}"
            )

            # The /done PUT only has a visible effect on items whose
            # completion requirement is must_mark_done; for anything else
            # Canvas accepts the request and changes nothing (#221), so a
            # bare 200 is not evidence the item was marked.
            item = await make_canvas_request("get", item_endpoint)
            if not isinstance(item, dict) or "error" in item:
                detail = item.get("error") if isinstance(item, dict) else item
                return f"❌ Could not read module item: {detail}"

            requirement = item.get("completion_requirement")
            if not isinstance(requirement, dict) or requirement.get("type") != "must_mark_done":
                have = (
                    f"a '{requirement.get('type')}' completion requirement"
                    if isinstance(requirement, dict)
                    else "no completion requirement"
                )
                return (
                    f"❌ '{item.get('title', item_id)}' cannot be marked done: it has "
                    f"{have}, not 'must_mark_done'. Canvas accepts the request but "
                    "nothing changes. Only items the instructor configured with a "
                    "'Mark as done' requirement support this."
                )

            if requirement.get("completed"):
                return "✅ Module item is already marked done."

            response = await make_canvas_request(
                "put",
                f"{item_endpoint}/done",
            )
            if isinstance(response, dict) and "error" in response:
                return f"❌ Could not mark item done: {response['error']}"

            # Confirm the write actually landed before claiming success.
            after = await make_canvas_request("get", item_endpoint)
            confirmed = (
                isinstance(after, dict)
                and isinstance(after.get("completion_requirement"), dict)
                and after["completion_requirement"].get("completed")
            )
            if not confirmed:
                return unconfirmed_write_warning(
                    "the module item was marked done",
                    {
                        "Item": item.get("title", item_id),
                        "Module": module_id,
                        "Course": course_id,
                    },
                    "Canvas accepted the request but the item still shows as not "
                    "done. Check the module in Canvas and retry.",
                )

            return "✅ Module item marked done."
