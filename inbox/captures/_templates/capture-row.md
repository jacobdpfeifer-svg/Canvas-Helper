# Capture queue row

Append one pipe row to [`../queue.md`](../queue.md). Escape `|` in notes as `\|`.

| Field | Values |
|-------|--------|
| `id` | `YYYYMMDD-HHMMSS-hex4` (America/Denver) |
| `captured_at` | `YYYY-MM-DDTHH:MM MT` |
| `course_guess` | `CSCI1200`, `BCOR1030`, … or `UNKNOWN` |
| `confidence` | `high`, `med`, `low` |
| `kind` | `whiteboard`, `slide`, `handout`, `syllabus_delta`, `homework_problem`, `event_selfie`, `graded_work`, `quiz`, `unknown` |
| `assignment_match` | Catalog name or `-` |
| `action` | `update_course_md`, `canvas_upload`, `needs_review` |
| `status` | `processing`, `done`, `pending_mac`, `needs_review`, `uploaded`, `failed` |
| `local_path` | `inbox/{id}.jpg` (gitignored) |
| `notes` | OCR summary; for `pending_mac`: “Original on phone camera roll; AirDrop when at Mac.” |

Example:

```
| 20260822-143052-a3f2 | 2026-08-22T14:30 MT | CSCI1200 | low | whiteboard | Lab 1: Python Introduction | update_course_md | done | inbox/20260822-143052-a3f2.jpg | OCR: for loop syntax |
```
