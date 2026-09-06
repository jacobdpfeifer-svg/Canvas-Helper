"""Tests for student-only tool registration (Jacob IBE fork)."""

import pytest
from fastmcp import FastMCP

from canvas_mcp.core.config import STUDENT_WRITE_TOOL_NAMES
from canvas_mcp.server import register_all_tools


async def _get_tool_names(mcp: FastMCP) -> set[str]:
    return {tool.name for tool in await mcp.list_tools()}


STUDENT_READ_TOOLS = {
    "get_my_upcoming_assignments",
    "get_my_submission_status",
    "get_my_course_grades",
    "get_my_todo_items",
    "get_my_peer_reviews_todo",
    "get_my_submission",
}

STUDENT_WRITE_TOOLS = set(STUDENT_WRITE_TOOL_NAMES)

SHARED_TOOLS = {
    "list_courses",
    "get_course_details",
    "get_course_content_overview",
    "list_pages",
    "get_page_content",
    "get_page_details",
    "get_front_page",
    "list_module_items",
    "list_assignments",
    "get_assignment_details",
    "list_discussion_topics",
    "list_announcements",
    "get_discussion_topic_details",
    "list_discussion_entries",
    "get_discussion_entry_details",
    "get_discussion_with_replies",
    "post_discussion_entry",
    "reply_to_discussion_entry",
    "list_modules",
    "get_course_structure",
    "list_course_files",
    "download_course_file",
    "read_course_file",
    "list_conversations",
    "get_conversation_details",
    "get_unread_count",
    "mark_conversations_read",
    "search_canvas_tools",
    "get_my_enrollments",
    "get_my_profile",
}

REMOVED_EDUCATOR_SAMPLE = {
    "create_assignment",
    "bulk_grade_submissions",
    "create_content_migration",
    "create_announcement",
    "create_module",
    "upload_course_file",
    "create_page",
    "list_users",
    "get_student_analytics",
    "execute_typescript",
    "check_enrollment",
}


class TestStudentOnlyRegistry:
    @pytest.mark.asyncio
    async def test_includes_student_read_tools(self, monkeypatch):
        monkeypatch.setenv("STUDENT_WRITE_TOOLS", "")
        from canvas_mcp.core import config as config_module

        config_module.reset_config()
        mcp = FastMCP(name="test-student")
        register_all_tools(mcp, role="student")
        tools = await _get_tool_names(mcp)
        for tool in STUDENT_READ_TOOLS:
            assert tool in tools, f"missing student tool {tool}"

    @pytest.mark.asyncio
    async def test_includes_write_tools_when_enabled(self, monkeypatch):
        monkeypatch.setenv(
            "STUDENT_WRITE_TOOLS", ",".join(sorted(STUDENT_WRITE_TOOLS))
        )
        from canvas_mcp.core import config as config_module

        config_module.reset_config()
        mcp = FastMCP(name="test-student-writes")
        register_all_tools(mcp, role="student")
        tools = await _get_tool_names(mcp)
        for tool in STUDENT_WRITE_TOOLS:
            assert tool in tools, f"missing write tool {tool}"
        assert "get_my_submission" in tools

    @pytest.mark.asyncio
    async def test_includes_shared_tools(self, monkeypatch):
        monkeypatch.setenv("STUDENT_WRITE_TOOLS", "")
        from canvas_mcp.core import config as config_module

        config_module.reset_config()
        mcp = FastMCP(name="test-student")
        register_all_tools(mcp, role="student")
        tools = await _get_tool_names(mcp)
        for tool in SHARED_TOOLS:
            assert tool in tools, f"missing shared tool {tool}"

    @pytest.mark.asyncio
    async def test_excludes_educator_tools(self, monkeypatch):
        monkeypatch.setenv(
            "STUDENT_WRITE_TOOLS", ",".join(sorted(STUDENT_WRITE_TOOLS))
        )
        from canvas_mcp.core import config as config_module

        config_module.reset_config()
        mcp = FastMCP(name="test-student")
        register_all_tools(mcp, role="student")
        tools = await _get_tool_names(mcp)
        for tool in REMOVED_EDUCATOR_SAMPLE:
            assert tool not in tools, f"educator tool still registered: {tool}"

    @pytest.mark.asyncio
    async def test_non_student_role_still_student_only(self, monkeypatch):
        """Fork ignores educator/all and always registers the student surface."""
        monkeypatch.setenv("STUDENT_WRITE_TOOLS", "")
        from canvas_mcp.core import config as config_module

        config_module.reset_config()
        mcp = FastMCP(name="test-ignored-role")
        register_all_tools(mcp, role="educator")
        tools = await _get_tool_names(mcp)
        assert "get_my_upcoming_assignments" in tools
        assert "create_assignment" not in tools
