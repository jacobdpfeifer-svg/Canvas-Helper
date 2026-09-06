# Calendar policy (Jacob)

Agent reads this before creating or syncing Google Calendar events.

## Target calendar

- **Name:** CU Fall 2026
- **calendar_id:** `19882ce72ae557eede2e297236d08c2b3b2b19fa40525614c75d8d0ebc7eef77@group.calendar.google.com`
- **Timezone:** America/Denver
- **Never write to:** `primary` (unless Jacob explicitly overrides in chat)

## Scope (curated)

| Include | Exclude |
|---------|---------|
| Recurring class meetings | Nightly 11:59 PM homework due blocks |
| Timed exams, quizzes, finals (non-11:59pm) | Undated catalog shells |
| In-class presentations (Advocate, etc.) | Reading quizzes due 11:59 PM |
| Confirmed club/RSVP events (Major Dinner, AI Lab) | Full dinner/workshop slot catalogs |
| Manual queue (`inbox/calendar-queue.md`) | Canvas announcements |

## Composio connection

1. Agent or Jacob completes OAuth: [Connect googlecalendar](https://connect.composio.dev/) via Composio MCP `COMPOSIO_MANAGE_CONNECTIONS`.
2. Optional CLI apply: set `COMPOSIO_API_KEY` in repo `.env` (never commit).
3. After OAuth: `cd browser && npm run sync-calendar -- --setup-calendar` creates/lists the subcalendar and writes `calendar_id` above.

## Event tagging

All synced events carry `extendedProperties.private.cu_id` for idempotent create/update. Format: `canvas:cal_123`, `course:BCOR1030:class`, `club:385793`, `manual:slug`.

## Colors (optional)

| Kind | Google colorId |
|------|----------------|
| class | 9 (blue) |
| exam | 11 (red) |
| presentation | 5 (yellow) |
| club | 10 (green) |
| manual | 7 (cyan) |
