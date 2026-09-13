# Canvas MCP Tools Documentation

This document provides a comprehensive overview of all tools available in the Canvas MCP Server, organized by audience and functionality.

## Table of Contents

- [Student Tools](#student-tools)
- [Educator Tools](#educator-tools) (removed — student-only server)
- [Shared Tools](#shared-tools-both-students--educators)
- [Developer Tools](#developer-tools)
- [Tool Usage Guidelines](#tool-usage-guidelines)

> **Canvas-focus pivot:** this server is **student-only**. `submit_assignment` and
> `comment_on_my_submission` are **preview-only** (no Canvas write). Do not
> re-add a confirm/execute path. Educator grading tools are gone — see the
> tombstone under [Educator Tools](#educator-tools).

---

## Student Tools

These tools provide students with personal academic tracking and organization capabilities using Canvas API's "self" endpoints.

### Self-Identity

Available under **every** role profile (student, educator, all) — these describe only the authenticated caller, so they need no roster permission.

#### `get_my_profile`
Get your own Canvas identity.

**Parameters:** none

**Example:**
```
"Who am I in Canvas?"
"What's my Canvas user ID?"
```

**Returns:** Your Canvas user ID, name, and login ID. `primary_email` and `sis_user_id` are deliberately omitted — neither is needed to identify you to other tools, and both are needlessly sensitive in a transcript.

---

#### `get_my_enrollments`
List the courses **you** are enrolled in, with your role in each.

**Parameters:**
- `include_concluded` (optional): Also include concluded/completed courses (default `false` = active only)

**Example:**
```
"What courses am I in?"
"Am I a student or a TA in BADM 350?"
```

**Returns:** Course code, name, ID, and your role(s) per course. Reports **all** roles when you hold more than one enrollment in a course (e.g. TA and student).

Use this — not [`check_enrollment`](#check_enrollment) — for any question about your own enrollment. `check_enrollment` reads the course roster, which requires roster-admin rights your token probably does not have.

---

### Personal Organization

#### `get_my_upcoming_assignments`
Get your upcoming assignments across all enrolled courses.

**Parameters:**
- `days` (optional): Number of days to look ahead (default: 7)

**Example:**
```
"What assignments do I have due this week?"
"Show me what's due in the next 3 days"
```

**Returns:** List of assignments due within timeframe, sorted by due date, with submission status.

---

#### `get_my_todo_items`
Get your Canvas TODO list including assignments, quizzes, and discussions.

**Example:**
```
"Show me my Canvas TODO list"
"What do I need to do?"
```

**Returns:** All items requiring your attention with due dates and course information.

---

#### `get_my_submission_status`
Check your submission status across assignments.

**Parameters:**
- `course_identifier` (optional): Specific course code or ID to filter

**Example:**
```
"Have I submitted everything?"
"Show me my submission status for BADM 350"
"What haven't I turned in yet?"
```

**Returns:** Submitted and missing assignments, with overdue items flagged.

---

#### `list_my_assignment_scores`
List graded assignment scores (structured) for weak-topic detection.

**Parameters:**
- `course_identifier` (optional): Specific course code or ID to filter

**Example:**
```
"What are my scores in MATH 2300?"
"List my graded assignment scores"
```

**Returns:** Per-assignment `name`, `score`, `points_possible`, `workflow_state`, and course code. Skips ungraded rows. Prefer this over `get_my_submission_status` when feeding `find_weak_topics`.

---

#### `get_my_submission`
View your own submission for a single assignment, including how many attempts
you have used and any instructor comments.

**Parameters:**
- `course_identifier` (required): Course code or Canvas ID
- `assignment_id` (required): Canvas assignment ID

**Example:**
```
"Did my essay for BADM 350 go through?"
"How many attempts do I have left on assignment 4821?"
```

**Returns:** Status, submitted time, due and lock dates, attempts used vs allowed,
grade if any, and submission comments.

---

### Student Write Tools

> **Off by default.** These tools only exist if the server operator enabled them
> via `STUDENT_WRITE_TOOLS`, and an instructor can additionally block them in
> their own course. See [Student write configuration](#student-write-configuration).

#### `submit_assignment`
**Preview only — never submits.** Shows points, due/lock dates, accepted types,
and attempts remaining, then always ends with “submit this yourself in Canvas.”

There is **no** confirmation-token / second-call execute path. A previous
two-step submit flow was removed (canvas-focus pivot). Do not re-add it.

**Parameters:**
- `course_identifier` (required): Course code or Canvas ID
- `assignment_id` (required): Canvas assignment ID
- `submission_type` (required): `online_text_entry`, `online_url`, or `online_upload`
- `body` (for text entry): Draft content to preview (not sent)
- `url` (for URL submissions): URL to preview (not sent)
- `file_paths` / `file_contents` (optional): Files to validate against the
  assignment’s allowed extensions for the preview only — nothing is uploaded
- `comment` (optional): Comment text shown in the preview only

**Returns:** A preview of what *you* would submit in Canvas. Never a submission
result. Group assignments and quiz-shaped assignments are refused in the preview.

---

#### `comment_on_my_submission`
**Preview only — never posts.** Shows the comment text, then always ends with
“add this yourself in Canvas.” No execute path.

**Parameters:**
- `course_identifier` (required): Course code or Canvas ID
- `assignment_id` (required): Canvas assignment ID
- `comment` (required): The comment text (preview only)

---

#### `mark_module_item_done`
Mark a module item complete for **yourself** when the item uses a
`must_mark_done` completion requirement. This is a private self-only write
(not visible to others). It uses the same preview → `confirmation_token` →
confirm flow as other student-private writes (`ConfirmationGuard`).

**Parameters:**
- `course_identifier` (required): Course code or Canvas ID
- `module_id` (required): Canvas module ID
- `item_id` (required): Canvas module item ID
- `confirmation_token` (optional): Token from the preview call; omit to preview

---

#### Student write configuration

Two independent gates, and the second can only ever narrow the first.

**1. Operator ceiling — `STUDENT_WRITE_TOOLS`**

Comma- or space-separated tool names. Empty (the default) means no student write
tool is registered at all. Enabling `submit_assignment` / `comment_on_my_submission`
only enables **preview** tools — they still never write to Canvas.

```bash
STUDENT_WRITE_TOOLS=submit_assignment,comment_on_my_submission,mark_module_item_done
```

**2. Per-course instructor policy**

An instructor states their course's stance in the course syllabus (the default
carrier, because students cannot edit it):

```
agent_writes: deny
```

or, to allow with limits (tool names here are **preview/triage grants**, not
permission to auto-submit):

```
agent_writes: allow
allow_tools: submit_assignment
note: Allowed for the weekly labs. Ask me before using it on the final project.
```

`COURSE_AGENT_POLICY_DEFAULT` decides what happens in a course that says nothing:
`deny` (the default, instructors opt in) or `allow` (instructors opt out).

The syllabus is the only supported carrier, and that is deliberate. Students can
read it but cannot edit it, so instructor authorship is structural rather than
assumed. A course-page carrier was built and then removed: a page's
`editing_roles` tells you who may edit it *now*, not who wrote it, so a student
who can create pages could author the policy and set it teacher-only in the same
breath. Authorship cannot be established from a student's own token.

Anything ambiguous denies: a malformed policy, contradictory directives (an
`agent_writes: deny` appended under an earlier `allow`), a failed read, or a
course this caller cannot see.

---

### Academic Performance

#### `get_my_course_grades`
View your current grades across all enrolled courses.

**Example:**
```
"What are my current grades?"
"Show me how I'm doing in all my courses"
```

**Returns:** Current grade, percentage, and enrollment status for each course.

---

### Peer Review Management

#### `get_my_peer_reviews_todo`
List peer reviews you need to complete.

**Parameters:**
- `course_identifier` (optional): Filter by specific course. Required if `assignment_identifier` is given.
- `assignment_identifier` (optional): Check a specific assignment directly, bypassing the per-course discovery scan. Use this if you know which assignment has your peer review but the general scan doesn't find it.

**Example:**
```
"What peer reviews do I need to complete?"
"Show me my pending peer reviews for ENGL 101"
"Do I have a peer review to do for assignment 4821 in ENGL 101?"
```

**Returns:** Incomplete peer reviews with assignment and course information, each
labeled with its discovery source (`Assignment scan` or `Planner feed`). The
per-course discovery scan (`Assignment scan`) only checks assignments whose
listing carries `peer_reviews: true`; as of #275 it is supplemented with a
Planner API query (`Planner feed`) that mirrors how Canvas's own student
"To Do" list finds pending peer reviews, since the two sources can disagree
on some instances. Results from both are merged and deduplicated.

---

## Educator Tools

**Removed.** This product ships a **student-only** MCP server. Educator /
grading / publishing / migration tools documented here historically are **not**
registered and must not be re-added. See `CLAUDE.md` and
`docs/handoff/canvas-focus-pivot-2026-09-11.md`.

Course listing, modules, and other **read** tools that both roles once shared
live under [Shared Tools](#shared-tools-both-students--educators) where still
implemented for students.

---

## Shared Tools (student server)

These tools work for both audiences, providing access to course content and information.

### Course Management

#### `list_courses`
List all enrolled courses.

**Example:**
```
"Show me my courses"
"What courses am I enrolled in?"
```

---

#### `get_course_details`
Get detailed course information including syllabus.

**Parameters:**
- `course_identifier`: Course code or ID

**Example:**
```
"Show me the syllabus for BADM 350"
"What's the course description for my Marketing class?"
```

> Note: `get_course_details` and `get_course_content_overview` return only a short
> syllabus preview. For the **complete** syllabus body, use `get_syllabus` below.

---

#### `get_syllabus`
Get the complete Canvas Syllabus tab content for a course, **untruncated**. Unlike `get_course_content_overview` (which returns only a ~1000-character preview), this returns the full syllabus body, so later sections such as grading policies, weighting, and final-exam details remain accessible.

**Parameters:**
- `course_identifier`: Course code or ID
- `output_format` (optional): `text` (plain text, default), `html` (raw HTML body), or `both`
- `max_chars` (optional): Cap on returned characters per section. When exceeded, the content is truncated with an explicit `[truncated...]` marker. Defaults to no truncation.

**Example:**
```
"Get the full syllabus for BADM 350 including the grading policy"
"Show me the raw HTML of the CS101 syllabus"
```

---

#### `get_course_content_overview`
Get a comprehensive overview of course content including pages, modules, and syllabus in one call.

**Parameters:**
- `course_identifier`: Course code or ID
- `include_pages` (optional): Include pages information (default: true)
- `include_modules` (optional): Include modules and their items (default: true)
- `include_syllabus` (optional): Include syllabus content (default: true)

**Example:**
```
"Give me an overview of everything in BADM 350"
```

**Returns:** Structured overview of the course's pages, modules, and syllabus. The syllabus portion is a ~1000-character preview — use `get_syllabus` for the full body.

---

### Content Access

#### `list_pages`
List pages in a course.

**Parameters:**
- `course_identifier`: Course code or ID
- `sort` (optional): Sort by title, created_at, or updated_at
- `published` (optional): Filter by published status

**Example:**
```
"Show me all pages in BADM 350"
"List published pages for my course"
```

---

#### `get_page_content`
Read the full content of a course page.

**Parameters:**
- `course_identifier`: Course code or ID
- `page_url_or_id`: Page URL or ID

**Example:**
```
"Show me the Week 1 Overview page"
"Read the Course Policies page for HIST 202"
```

---

#### `get_page_details`
Get detailed page metadata.

**Parameters:**
- `course_identifier`: Course code or ID
- `page_url_or_id`: Page URL or ID

---

#### `get_front_page`
Get the front page content for a course.

**Parameters:**
- `course_identifier`: Course code or ID

**Example:**
```
"What's on the course front page?"
```

**Returns:** Front page title and full content body.

---

### Modules

Modules are Canvas's primary content organization system, allowing you to structure course content into ordered units with prerequisites and completion requirements.

#### `get_course_structure`
Get the complete course module structure as a JSON tree. Returns all modules with their items in a single call, plus summary statistics. Ideal for course auditing, QC checks, and structure cloning.

**Parameters:**
- `course_identifier`: Course code or ID
- `include_unpublished` (optional): Include unpublished modules/items (default: true)

**Example:**
```
"Show me the full structure of BADM 350"
"Get the module tree for my course"
```

**Returns:** JSON with `course_id`, `modules` array (each with nested `items`), and `summary` object with counts for total modules, items, unpublished items, empty modules, and item type breakdown.

---

#### `list_modules`
List all modules in a course.

**Parameters:**
- `course_identifier`: Course code or ID
- `include_items` (optional): Include item summary for each module (default: false)
- `search_term` (optional): Filter modules by name

**Example:**
```
"Show me all modules in BADM 350"
"List modules with their items"
```

---

#### `list_module_items`
List the items within a specific module, including pages.

**Parameters:**
- `course_identifier`: Course code or ID
- `module_id`: The module ID
- `include_content_details` (optional): Include additional content details (default: true)

**Example:**
```
"What's inside the 'Week 2' module?"
```

**Returns:** Items in the module with types, titles, and IDs.

---

#### `create_module`
Create a new module in a course.

**Parameters:**
- `course_identifier`: Course code or ID
- `name`: Module name (required)
- `position` (optional): Position in module list (1-indexed)
- `unlock_at` (optional): Date/time when module unlocks (ISO 8601)
- `require_sequential_progress` (optional): Students must complete items in order
- `prerequisite_module_ids` (optional): Comma-separated IDs of prerequisite modules
- `published` (optional): Whether module is published (default: true)

**Example:**
```
"Create a module called 'Week 1: Introduction' in BADM 350"
"Add a new module 'Final Project' at position 10"
```

---

#### `update_module`
Update an existing module's settings.

**Parameters:**
- `course_identifier`: Course code or ID
- `module_id`: Module ID to update
- `name` (optional): New name
- `position` (optional): New position
- `unlock_at` (optional): New unlock date, or empty string to remove
- `require_sequential_progress` (optional): Sequential progress requirement
- `prerequisite_module_ids` (optional): New prerequisites, or empty to clear
- `published` (optional): Published status

**Example:**
```
"Rename module 12345 to 'Unit 2: Advanced Topics'"
"Unpublish module 67890"
```

---

#### `delete_module`
Delete a module from a course.

**Parameters:**
- `course_identifier`: Course code or ID
- `module_id`: Module ID to delete

**Note:** This removes the module organization only. The actual content (pages, assignments, etc.) is NOT deleted.

**Example:**
```
"Delete module 12345 from BADM 350"
```

---

#### `add_module_item`
Add an item to a module.

**Parameters:**
- `course_identifier`: Course code or ID
- `module_id`: Module ID to add item to
- `item_type`: One of: File, Page, Discussion, Assignment, Quiz, SubHeader, ExternalUrl, ExternalTool
- `content_id` (optional): Canvas ID of content (required for File, Discussion, Assignment, Quiz, ExternalTool)
- `title` (optional): Title for the item (required for SubHeader, ExternalUrl)
- `position` (optional): Position within the module
- `indent` (optional): Indentation level (0-4)
- `page_url` (optional): Page URL slug (required for Page type)
- `external_url` (optional): URL (required for ExternalUrl type)
- `new_tab` (optional): Open external links in new tab
- `completion_requirement_type` (optional): must_view, must_submit, must_contribute, min_score, must_mark_done
- `completion_requirement_min_score` (optional): Minimum score (for min_score type)

**Example:**
```
"Add assignment 123 to module 456"
"Add a subheader 'Required Readings' to module 789"
"Add the syllabus page to the first module"
```

---

#### `update_module_item`
Update an existing module item.

**Parameters:**
- `course_identifier`: Course code or ID
- `module_id`: Module ID containing the item
- `item_id`: Item ID to update
- `title` (optional): New title
- `position` (optional): New position
- `indent` (optional): New indent level (0-4)
- `external_url` (optional): New URL (ExternalUrl items)
- `new_tab` (optional): Open in new tab
- `completion_requirement_type` (optional): New completion type, or empty to remove
- `completion_requirement_min_score` (optional): New min score
- `published` (optional): Published status
- `move_to_module_id` (optional): Move item to different module

**Example:**
```
"Move item 111 to module 222"
"Set completion requirement to 'must_view' for item 333"
```

---

#### `delete_module_item`
Remove an item from a module.

**Parameters:**
- `course_identifier`: Course code or ID
- `module_id`: Module ID containing the item
- `item_id`: Item ID to remove

**Note:** This only removes the item from the module. The actual content is NOT deleted.

**Example:**
```
"Remove item 12345 from module 67890"
```

---

### Page Settings

#### `update_page_settings`
Update page settings without changing content (publish/unpublish, front page, editing roles).

**Parameters:**
- `course_identifier`: Course code or ID
- `page_url_or_id`: Page URL slug or ID
- `published` (optional): True to publish, False to unpublish
- `front_page` (optional): True to set as course front page
- `editing_roles` (optional): Who can edit - teachers, students, members, or public
- `notify_of_update` (optional): True to notify users of the update

**Example:**
```
"Unpublish the Week 10 page in BADM 350"
"Set the syllabus page as the front page"
"Allow students to edit the collaborative notes page"
```

**Note:** The front page cannot be unpublished. To unpublish it, first set another page as the front page.

---

#### `bulk_update_pages`
Update settings for multiple pages at once.

**Parameters:**
- `course_identifier`: Course code or ID
- `page_urls`: Comma-separated list of page URL slugs
- `published` (optional): True to publish all, False to unpublish all
- `editing_roles` (optional): Who can edit
- `notify_of_update` (optional): True to notify users

**Example:**
```
"Unpublish all the draft pages: draft-1, draft-2, draft-3"
"Publish pages week-1, week-2, week-3 in my course"
```

**Note:** front_page is not supported in bulk updates (only one page can be front page).

---

### Files

For uploading files (educator-only), see [File Management](#file-management) under Educator Tools.

#### `list_course_files`
List files in a course with optional search.

**Parameters:**
- `course_identifier`: Course code or ID
- `search_term` (optional): Filter files by name
- `sort` (optional): Sort field: `name`, `size`, `created_at`, `updated_at`, `content_type` (default: updated_at)
- `order` (optional): `asc` or `desc` (default: desc)

**Example:**
```
"List the PDF files in this course"
```

**Returns:** Course files with IDs, names, sizes, and folders.

---

#### `download_course_file`
Download a course file to the local filesystem of the machine running the MCP server.

> **Local (stdio) servers only.** The write lands on the *server's* filesystem,
> which a remote caller cannot read anyway, so the tool refuses over HTTP and
> points at `read_course_file` instead. It also never overwrites: the
> destination is created exclusively, so a Canvas file named e.g. `.zshrc`
> cannot clobber a real file in the chosen directory.

**Parameters:**
- `course_identifier`: Course code or ID
- `file_id`: Canvas file ID (find it with `list_course_files` or `list_module_items`)
- `save_directory` (optional): Local directory to save to (default: system temp dir, must exist)

**Example:**
```
"Download the syllabus PDF from the course files"
```

**Returns:** Local path of the downloaded file with size and content type. Errors
if the destination already exists rather than overwriting it.

---

#### `read_course_file`
Read a course file and return its content directly in the response as base64. Unlike `download_course_file`, nothing is written to the server's filesystem, so this works when the MCP server runs on a different machine than the client.

**Parameters:**
- `course_identifier`: Course code or ID
- `file_id`: Canvas file ID (find it with `list_course_files` or `list_module_items`)
- `max_size_mb` (optional): Maximum file size in MB to read (default: 25). Clamped server-side to `READ_FILE_MAX_SIZE_MB` (default 100); larger files are rejected to avoid excessive memory usage.

**Example:**
```
"Read the rubric spreadsheet from course files"
```

**Returns:** File content as base64 with name, size, and content type.

---

### Conversations (Inbox)

#### `list_conversations`
List Canvas inbox conversations for the current user.

**Parameters:**
- `scope` (optional): `unread` (default), `starred`, `sent`, `archived`, or `all`
- `filter_ids` (optional): Conversation IDs to filter by
- `filter_mode` (optional): `and` (default) or `or` for `filter_ids`
- `include_participants` (optional): Include participant info (default: true)
- `include_all_ids` (optional): Include all participant IDs (default: false)

**Example:**
```
"Show my Canvas inbox"
```

**Returns:** Conversations with participants, subjects, and read state.

---

#### `get_conversation_details`
Get a full conversation thread with its messages.

**Parameters:**
- `conversation_id`: Conversation ID
- `auto_mark_read` (optional): Mark as read when viewed (default: true)
- `include_messages` (optional): Include all messages (default: true)

**Example:**
```
"Show me the full thread of conversation 555"
```

---

#### `get_unread_count`
Get the number of unread conversations.

**Parameters:** none

**Example:**
```
"How many unread Canvas messages do I have?"
```

---

#### `mark_conversations_read`
Mark multiple conversations as read.

**Parameters:**
- `conversation_ids`: List of conversation IDs to mark as read

**Example:**
```
"Mark conversations 12, 13, and 14 as read"
```

**Returns:** Per-conversation success/failure summary.

---

### Announcements

#### `list_announcements`
View course announcements.

**Parameters:**
- `course_identifier`: Course code or ID

**Example:**
```
"Show me recent announcements"
"What are the latest announcements in BADM 350?"
```

---

### Discussions

#### `list_discussion_topics`
View discussion forums in a course. Returns discussion topics only — announcements
are a separate Canvas collection and are excluded unless you opt in.

**Parameters:**
- `course_identifier`: Course code or ID
- `include_announcements` (optional, default `false`): Also list the course's
  announcements alongside its discussion topics. Each entry is labelled
  `Type: Announcement` or `Type: Discussion`. To list announcements on their
  own, use [`list_announcements`](#list_announcements) instead.

**Example:**
```
"What discussions are active in my course?"
"Show me discussion topics for ENGL 101"
```

---

#### `get_discussion_topic_details`
Get details about a specific discussion.

**Parameters:**
- `course_identifier`: Course code or ID
- `topic_id`: Discussion topic ID

---

#### `list_discussion_entries`
View posts in a discussion.

**Parameters:**
- `course_identifier`: Course code or ID
- `topic_id`: Discussion topic ID

**Example:**
```
"Show me posts in the Week 5 discussion"
```

---

#### `get_discussion_with_replies`
Get all discussion entries with nested replies in one call.

**Parameters:**
- `course_identifier`: Course code or ID
- `topic_id`: Discussion topic ID
- `include_replies` (optional): Fetch detailed replies for all entries (default: false)

**Example:**
```
"Get the whole Week 3 discussion including replies"
```

---

#### `get_discussion_entry_details`
Read a specific discussion post.

**Parameters:**
- `course_identifier`: Course code or ID
- `topic_id`: Discussion topic ID
- `entry_id`: Post ID

**Example:**
```
"Show me the first post in the introduction discussion"
```

---

#### `post_discussion_entry`
Create a new discussion post.

**Parameters:**
- `course_identifier`: Course code or ID
- `topic_id`: Discussion topic ID
- `message`: Post content

---

## Developer Tools

These tools help developers discover, explore, and execute Canvas code execution API operations.

### Tool Discovery

#### `search_canvas_tools`
Search and discover available Canvas tools by keyword — both the registered
MCP tools (the ~99 Python tools like `list_peer_reviews`,
`create_assignment`, called directly) and the TypeScript code execution API
operations (used from `execute_typescript`). Matches against tool name and
description.

**Parameters:**
- `query` (optional): Search term to filter tools. Empty string returns all tools. Examples: "peer review", "grading", "assignment", "discussion", "bulk"
- `detail_level` (optional): How much information to return. Default: "signatures"
  - `"names"`: Just tool names / file paths (most efficient for quick lookups)
  - `"signatures"`: Names/paths + short descriptions + function signatures (recommended)
  - `"full"`: Fuller descriptions for MCP tools (capped length) and code API file content capped at 2,000 characters per match

**Example:**
```
"Search for peer review tools"
"Search for grading tools in the code API"
"What bulk operations are available?"
"Show me all code API tools"
"Find discussion-related operations"
```

**Returns:** Response schema version `2`. A successful search returns JSON with
`schema_version`, `query`, `detail_level`, `count`, and two labeled sections —
`mcp_tools` (registered MCP tools) and `code_execution_api` (TypeScript code API
modules) — each with its own `count` and `tools` array. The pre-v1.10 flat
top-level `tools` key no longer exists; scripted clients should branch on
`schema_version`. A no-match response still includes `schema_version: 2` and
reports the message plus `mcp_tools_searched` instead of empty result sections.

**Usage Tips:**
- Use empty query (`""`) to list all available tools
- Use `"signatures"` detail level for most tasks (default)
- Use `"names"` when you just need a quick overview
- Use `"full"` only when you need to see complete implementation details

**Example Direct Usage:**
```typescript
// Search for peer-review tools across both MCP tools and the code API
search_canvas_tools("peer review", "signatures")

// Search for grading-related tools with signatures
search_canvas_tools("grading", "signatures")

// List all available tools (names only)
search_canvas_tools("", "names")

// Get full implementation details for bulk operations
search_canvas_tools("bulk", "full")
```

---

#### `list_code_api_modules`
List all available TypeScript modules in the code execution API.

**Parameters:** None

**Example:**
```
"What TypeScript modules are available?"
"List all code API modules"
"Show me the available code execution operations"
```

**Returns:** Formatted list of all TypeScript files organized by category (grading, assignments, courses, discussions, etc.) with import paths.

**Usage Tips:**
- Use this for a quick overview of all available operations
- Results show the exact import paths to use in `execute_typescript`
- Organized by category for easy navigation

---

### Code Execution

#### `execute_typescript`
Execute TypeScript code in a Node.js environment with access to Canvas API credentials.

This tool can reduce model-context use by processing bulk items locally and returning only selected output. Actual savings depend on the workload and AI client.

**Parameters:**
- `code`: TypeScript code to execute. Can import from './canvas/*' modules.
- `timeout` (optional): Maximum execution time in seconds (default: 120)

**Example:**
```
"Grade all 90 Jupyter notebook submissions using bulk grading"
"Send reminders to all students who haven't submitted"
"Analyze discussion participation across all students"
```

**Example Code:**
```typescript
import { bulkGrade } from './canvas/grading/bulkGrade.js';

await bulkGrade({
  courseIdentifier: "60366",
  assignmentId: "123",
  gradingFunction: (submission) => {
    // This runs locally - no token cost!
    const notebook = submission.attachments?.find(
      f => f.filename.endsWith('.ipynb')
    );

    if (!notebook) return null;

    return {
      points: 100,
      rubricAssessment: { "_8027": { points: 100 } },
      comment: "Great work!"
    };
  }
});
```

**Returns:** Combined stdout and stderr from execution, or error message if failed.

**Platform Support:**
- **macOS/Linux**: Uses `npx tsx` directly
- **Windows**: Automatically locates the tsx CLI entry point via `shutil.which` or `%APPDATA%\npm\node_modules\tsx\dist\cli.mjs`, then invokes it via `node` to avoid `.cmd` batch wrapper limitations

**Security:**
- Code runs in a temporary file that is deleted after execution
- Inherits Canvas API credentials from server environment
- Timeout enforced to prevent runaway processes
- Local sandbox controls are best-effort, not a complete security boundary; code can access resources allowed to the server process, and strict egress control requires external isolation (see [issue #157](https://github.com/vishalsachdev/canvas-mcp/issues/157))

**Token Efficiency:**
- **Traditional approach**: Tool-by-tool processing may return each submission to the model
- **Code execution approach**: Per-item work runs locally and only selected output returns

**Usage Tips:**
- First use `search_canvas_tools` or `list_code_api_modules` to discover available operations
- Import operations from './canvas/*' paths (e.g., './canvas/grading/bulkGrade.js')
- Processing happens locally - only results flow back to Claude's context
- Best for bulk operations, large datasets, and complex analysis
- Traditional tools still best for simple queries and small datasets

---

## Tool Usage Guidelines

### For Students

1. **Be specific**: Use course codes when possible (e.g., "BADM 350" instead of "my business class")
2. **Combine queries**: "Show me my grades and what's due this week"
3. **Check regularly**: Use for daily planning and weekly organization
4. **No setup needed**: Student tools access only your data - no special configuration required

### For Educators

1. **Enable anonymization**: Set `ENABLE_DATA_ANONYMIZATION=true` in `.env` for FERPA-conscious data handling; this control does not by itself establish compliance
2. **Use course codes**: Be specific about which course (e.g., "badm_350_120251_246794")
3. **Leverage automation**: Use messaging and reminder tools for routine communications
4. **Combine analytics**: Request multiple analytics in one query for comprehensive insights
5. **Protect mapping files**: Keep `local_maps/` folder secure - never commit to version control

### General Best Practices

- **Ask follow-up questions**: Claude remembers context within a conversation
- **Request summaries**: "Summarize..." for quick overviews
- **Be conversational**: Natural language works better than rigid commands
- **Check tool output**: Review the data Claude retrieves before taking action

---

## Known API Limitations

Some Canvas API endpoints have bugs or design issues that prevent certain operations from working correctly.

### Rubric API Issues

| Tool | Status | Issue | Reference |
|------|--------|-------|-----------|
| `update_rubric` | Removed | API does full replacement instead of PATCH (causes data loss) | Internal testing |

**Workaround for Rubric Editing:**
1. **Edit rubrics** in Canvas web UI: Assignments → Edit → Rubric
2. **Copy rubrics** between courses: Use "Find a Rubric" in the rubric editor

**Working Rubric Tools:**
- `create_rubric` - Create a new rubric with defined criteria and ratings
- `create_rubric_from_csv` - Create a rubric using a CSV file upload
- `list_rubrics` - List rubrics in a course
- `get_rubric` - View rubric criteria and points (by rubric_id or assignment_id)
- `get_rubric_assessment` - View a student's rubric assessment
- `associate_rubric` - Link rubric to assignment
- `grade_with_rubric` - Grade single submission
- `bulk_grade_submissions` - Efficient batch grading

---

## Need Help?

- **Student Guide**: https://canvas-mcp.illinihunt.org/student-guide.html
- **Educator Guide**: https://canvas-mcp.illinihunt.org/educator-guide.html
- **Main README**: [README.md](../README.md)
- **Development Guide**: [CLAUDE.md](../CLAUDE.md)
- **GitHub Issues**: [Report issues](https://github.com/vishalsachdev/canvas-mcp/issues)
