"""Tool-annotation contract for the student-only Jacob IBE fork."""

import json
from pathlib import Path

import pytest
from fastmcp import Client, FastMCP

import canvas_mcp.core.config as config_module
from canvas_mcp.core.config import STUDENT_WRITE_TOOL_NAMES
from canvas_mcp.server import register_all_tools


@pytest.fixture(autouse=True)
def _student_write_tools_enabled(monkeypatch):
    monkeypatch.setenv("STUDENT_WRITE_TOOLS", ",".join(sorted(STUDENT_WRITE_TOOL_NAMES)))
    monkeypatch.setattr(config_module, "_config", None, raising=False)
    yield
    monkeypatch.setattr(config_module, "_config", None, raising=False)


def _registry() -> FastMCP:
    mcp = FastMCP(name="test-metadata")
    register_all_tools(mcp, role="student")
    return mcp


DESTRUCTIVE = {
    "submit_assignment",
}

ADDITIVE = {
    "post_discussion_entry",
    "reply_to_discussion_entry",
    "mark_conversations_read",
    "comment_on_my_submission",
    "mark_module_item_done",
}

NOT_IDEMPOTENT = {
    "post_discussion_entry",
    "reply_to_discussion_entry",
    "submit_assignment",
    "comment_on_my_submission",
}


@pytest.mark.asyncio
async def test_student_write_tools_are_registered_when_enabled():
    names = {tool.name for tool in await _registry().list_tools()}
    missing = STUDENT_WRITE_TOOL_NAMES - names
    assert not missing, f"STUDENT_WRITE_TOOLS not reaching the registry: {sorted(missing)}"
    assert "execute_typescript" not in names


@pytest.mark.asyncio
async def test_every_tool_declares_its_effect_on_the_world():
    tools = await _registry().list_tools()
    assert tools, "no tools registered — the gate would vacuously pass"

    undeclared = []
    for tool in tools:
        annotations = tool.annotations
        if annotations is None:
            undeclared.append(f"{tool.name}: no annotations at all")
            continue
        if annotations.readOnlyHint:
            continue
        if annotations.destructiveHint is None:
            undeclared.append(f"{tool.name}: write tool missing destructiveHint")
        if annotations.idempotentHint is None:
            undeclared.append(f"{tool.name}: write tool missing idempotentHint")

    assert not undeclared, (
        "every tool must declare readOnlyHint, or both destructiveHint and "
        "idempotentHint:\n  " + "\n  ".join(sorted(undeclared))
    )


@pytest.mark.asyncio
async def test_tools_that_replace_data_are_marked_destructive():
    tools = {tool.name: tool for tool in await _registry().list_tools()}
    for name in DESTRUCTIVE:
        assert name in tools, f"{name} is no longer registered — update this list"
        assert tools[name].annotations.destructiveHint is True, (
            f"{name} changes submission/module state; destructiveHint must be True"
        )


@pytest.mark.asyncio
async def test_additive_tools_are_not_marked_destructive():
    tools = {tool.name: tool for tool in await _registry().list_tools()}
    for name in ADDITIVE:
        assert name in tools, f"{name} is no longer registered — update this list"
        assert tools[name].annotations.destructiveHint is False


@pytest.mark.asyncio
async def test_repeatable_tools_declare_idempotency_honestly():
    tools = {tool.name: tool for tool in await _registry().list_tools()}
    for name in NOT_IDEMPOTENT:
        assert tools[name].annotations.idempotentHint is False


@pytest.mark.asyncio
async def test_read_tools_are_marked_read_only():
    tools = {tool.name: tool for tool in await _registry().list_tools()}
    for name in (
        "list_courses",
        "get_course_details",
        "get_syllabus",
        "read_course_file",
        "get_my_upcoming_assignments",
    ):
        assert tools[name].annotations.readOnlyHint is True


@pytest.mark.asyncio
async def test_tool_manifest_matches_registry_exactly():
    manifest_path = Path(__file__).parent.parent / "tools" / "TOOL_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text())
    manifest_names = [t["name"] for t in manifest["tools"]]

    dupes = {n for n in manifest_names if manifest_names.count(n) > 1}
    assert not dupes, f"duplicate manifest entries: {sorted(dupes)}"

    registered = {tool.name for tool in await _registry().list_tools()}
    manifest_set = set(manifest_names)

    missing = registered - manifest_set
    extra = manifest_set - registered
    assert not missing and not extra, (
        "tools/TOOL_MANIFEST.json is out of sync with the live registry:\n"
        f"  undocumented tools (add to manifest): {sorted(missing)}\n"
        f"  stale manifest entries (remove or rename): {sorted(extra)}"
    )

    known_categories = {c["id"] for c in manifest["categories"]}
    bad = [t["name"] for t in manifest["tools"] if t["category"] not in known_categories]
    assert not bad, f"manifest entries with unknown category: {bad}"


@pytest.mark.asyncio
async def test_list_courses_boolean_parameters_have_descriptions():
    async with Client(_registry()) as client:
        tools = {tool.name: tool for tool in await client.list_tools()}

    properties = tools["list_courses"].inputSchema["properties"]
    assert "concluded" in properties["include_concluded"]["description"].lower()
    assert "active" in properties["include_all"]["description"].lower()
