"""Discussion post/reply tools are preview-only (canvas-focus pivot)."""

from unittest.mock import AsyncMock, patch

import pytest
from fastmcp import FastMCP

from canvas_mcp.tools.discussions import register_shared_discussion_tools


def _get_discussion_tools():
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
    register_shared_discussion_tools(mcp)
    return captured


@pytest.mark.asyncio
async def test_post_discussion_entry_preview_never_posts():
    tools = _get_discussion_tools()

    async def responder(method, endpoint, **kwargs):
        assert method == "get", f"post_discussion_entry must never {method}"
        return {"id": 9, "title": "Week 3"}

    with patch(
        "canvas_mcp.tools.discussions.get_course_id",
        new=AsyncMock(return_value="123"),
    ), patch(
        "canvas_mcp.tools.discussions.get_course_code",
        new=AsyncMock(return_value="CS101"),
    ), patch(
        "canvas_mcp.tools.discussions.make_canvas_request", new=responder
    ):
        result = await tools["post_discussion_entry"](
            course_identifier="T",
            topic_id=9,
            message="Here is my draft post.",
        )

    assert "NOTHING has been posted" in result
    assert "Here is my draft post." in result


@pytest.mark.asyncio
async def test_reply_to_discussion_entry_preview_never_posts():
    tools = _get_discussion_tools()

    async def responder(method, endpoint, **kwargs):
        assert method == "get", f"reply_to_discussion_entry must never {method}"
        return {"id": 9, "title": "Week 3"}

    with patch(
        "canvas_mcp.tools.discussions.get_course_id",
        new=AsyncMock(return_value="123"),
    ), patch(
        "canvas_mcp.tools.discussions.get_course_code",
        new=AsyncMock(return_value="CS101"),
    ), patch(
        "canvas_mcp.tools.discussions.make_canvas_request", new=responder
    ):
        result = await tools["reply_to_discussion_entry"](
            course_identifier="T",
            topic_id=9,
            entry_id=55,
            message="Here is my draft reply.",
        )

    assert "NOTHING has been posted" in result
    assert "Here is my draft reply." in result
