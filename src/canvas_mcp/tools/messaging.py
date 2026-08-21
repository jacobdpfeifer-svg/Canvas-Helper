"""Canvas messaging/conversations tools (student shared reads)."""

import sys
from typing import Any

from fastmcp import FastMCP
from mcp.types import ToolAnnotations

from ..core.client import make_canvas_request
from ..core.untrusted_content import UNTRUSTED_NOTICE, fence_untrusted
from ..core.validation import validate_params


def _fence_conversation_fields(conversation: Any) -> None:
    """Fence third-party text fields of one conversation dict, in place."""
    if not isinstance(conversation, dict):
        return
    for key in ("subject", "last_message", "last_authored_message"):
        value = conversation.get(key)
        if isinstance(value, str) and value:
            conversation[key] = fence_untrusted(value, "conversation message")
    for participant in conversation.get("participants") or []:
        if not isinstance(participant, dict):
            continue
        for key in ("name", "full_name"):
            value = participant.get(key)
            if isinstance(value, str) and value:
                participant[key] = fence_untrusted(value, "participant name")
    _fence_attachments(conversation)
    for message in conversation.get("messages") or []:
        _fence_message_body(message)


def _fence_message_body(message: Any) -> None:
    """Fence one conversation message body, including forwards."""
    if not isinstance(message, dict):
        return
    if isinstance(message.get("body"), str) and message["body"]:
        message["body"] = fence_untrusted(message["body"], "conversation message")
    _fence_attachments(message)
    for forwarded in message.get("forwarded_messages") or []:
        _fence_message_body(forwarded)


def _fence_attachments(container: Any) -> None:
    """Fence sender-controlled attachment labels, in place."""
    if not isinstance(container, dict):
        return
    for attachment in container.get("attachments") or []:
        if not isinstance(attachment, dict):
            continue
        for key in ("display_name", "filename"):
            value = attachment.get(key)
            if isinstance(value, str) and value:
                attachment[key] = fence_untrusted(value, "attachment name")


def register_shared_messaging_tools(mcp: FastMCP) -> None:
    """Register inbox read tools for the authenticated student."""

    @mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
    @validate_params
    async def list_conversations(
        scope: str = "unread",
        filter_ids: list[str] | None = None,
        filter_mode: str = "and",
        include_participants: bool = True,
        include_all_ids: bool = False
    ) -> dict[str, Any]:
        """
        List conversations for the current user.

        Args:
            scope: "unread", "starred", "sent", "archived", or "all"
            filter_ids: Conversation IDs to filter by
            filter_mode: "and" or "or" for filter_ids
            include_participants: Include participant info
            include_all_ids: Include all participant IDs
        """

        valid_scopes = ["unread", "starred", "sent", "archived", "all"]
        if scope not in valid_scopes:
            return {"error": f"scope must be one of: {', '.join(valid_scopes)}"}

        try:
            params = {
                "scope": scope,
                "include_participants": include_participants,
                "include_all_conversation_ids": include_all_ids
            }

            if filter_ids:
                params["filter[]"] = filter_ids
                params["filter_mode"] = filter_mode

            response = await make_canvas_request("get", "/conversations", params=params)

            if "error" in response:
                error_response: dict[str, Any] = response
                return error_response

            if isinstance(response, list):
                for conversation in response:
                    _fence_conversation_fields(conversation)

            return {
                "success": True,
                "untrusted_content_notice": UNTRUSTED_NOTICE,
                "conversations": response,
                "count": len(response) if isinstance(response, list) else 0
            }

        except Exception as e:
            print(f"Error listing conversations: {str(e)}", file=sys.stderr)
            return {"error": f"Failed to list conversations: {str(e)}"}

    @mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
    @validate_params
    async def get_conversation_details(
        conversation_id: str | int,
        auto_mark_read: bool = True,
        include_messages: bool = True
    ) -> dict[str, Any]:
        """
        Get detailed conversation information with messages.

        Args:
            conversation_id: Conversation ID
            auto_mark_read: Mark as read when viewed
            include_messages: Include all messages
        """

        try:
            params = {
                "auto_mark_as_read": auto_mark_read,
                "include_all_conversation_ids": True
            }

            response = await make_canvas_request(
                "get",
                f"/conversations/{conversation_id}",
                params=params
            )

            if "error" in response:
                error_response: dict[str, Any] = response
                return error_response

            _fence_conversation_fields(response)

            return {
                "success": True,
                "untrusted_content_notice": UNTRUSTED_NOTICE,
                "conversation": response
            }

        except Exception as e:
            print(f"Error getting conversation details: {str(e)}", file=sys.stderr)
            return {"error": f"Failed to get conversation details: {str(e)}"}

    @mcp.tool(annotations=ToolAnnotations(readOnlyHint=True))
    async def get_unread_count() -> dict[str, Any]:
        """Get number of unread conversations."""

        try:
            response = await make_canvas_request("get", "/conversations/unread_count")

            if "error" in response:
                error_response: dict[str, Any] = response
                return error_response

            return {
                "success": True,
                "unread_count": response.get("unread_count", 0)
            }

        except Exception as e:
            print(f"Error getting unread count: {str(e)}", file=sys.stderr)
            return {"error": f"Failed to get unread count: {str(e)}"}

    @mcp.tool(annotations=ToolAnnotations(destructiveHint=False, idempotentHint=True))
    @validate_params
    async def mark_conversations_read(conversation_ids: list[str]) -> dict[str, Any]:
        """
        Mark multiple conversations as read.

        Args:
            conversation_ids: List of conversation IDs to mark as read
        """

        if not conversation_ids:
            return {"error": "conversation_ids cannot be empty"}

        try:
            data = {
                "conversation_ids[]": conversation_ids,
                "event": "mark_as_read"
            }

            response = await make_canvas_request(
                "put", "/conversations", data=data, use_form_data=True
            )

            if "error" in response:
                error_response: dict[str, Any] = response
                return error_response

            return {
                "success": True,
                "marked_read": len(conversation_ids),
                "response": response
            }

        except Exception as e:
            print(f"Error marking conversations as read: {str(e)}", file=sys.stderr)
            return {"error": f"Failed to mark conversations as read: {str(e)}"}

    print("Canvas shared messaging tools registered successfully!", file=sys.stderr)
