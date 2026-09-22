# Portable Canvas export

ProductName exports the last atomically committed canonical Canvas generation;
it does not start a second Canvas fetch. The desktop action is Settings → Canvas
→ **Export my Canvas data**.

The export is a timestamped directory plus ZIP under the active profile's
`inbox/export/` folder. Markdown and JSON are the agent-oriented formats:

- Markdown preserves Canvas module and item order and is intended for NotebookLM
  or another source-reading agent.
- JSON preserves source IDs, Canvas URLs, `updated_at`, fetch/sync timestamps,
  submission workflow state, and data-quality labels.
- A simple PDF overview is included only as a human-readable convenience copy;
  it is not the source of truth.

Grades are excluded by default and included only after the student checks the
explicit opt-in. Submission data is reduced to workflow state; comments,
answers, scores, and submission files are not exported. External/LTI/proctored
items remain Canvas links with an `unavailable` limitation instead of being
represented as copied course content.

Quality labels are `complete`, `partial`, `stale`, `inferred`, and
`unavailable`. A point-in-time export is never presented as a live connection.
