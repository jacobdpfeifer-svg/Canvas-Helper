# Photo captures — class intake memory

Side door into [`inbox/`](../README.md) memory. **Not** Canvas truth — see `inbox/week.md` for due dates.

Filled by **Cursor iOS Cloud Agent** + [`jacob-photo-intake`](../../skills/jacob-photo-intake/SKILL.md). Mac completion for Canvas uploads: `cd browser && npm run process-capture-queue`.

Architecture: [`docs/HYBRID.md`](../../docs/HYBRID.md)

## Layout

```
inbox/captures/
  README.md           # this file (tracked)
  queue.md            # intake log — one row per capture (tracked)
  _templates/         # row schema (tracked)
  inbox/              # gitignored — raw photos (AirDrop from phone at Mac)
  processed/          # gitignored — archived after upload / review
```

## Remote workspace (Cloud Agent)

When you launch a Cloud Agent on this repo, Cursor checks out the repo on a Linux VM. Attached photos exist in **chat context** until the agent writes them to disk.

| Tracked (committed) | Gitignored (never commit) |
|---------------------|---------------------------|
| `queue.md` row | Original `.jpg` / `.heic` / `.png` |
| Extracted notes in `inbox/courses/CODE.md` → `## Lecture captures` | Cloud VM copy (ephemeral) |
| | Mac `inbox/` + `processed/` folders |

**Ephemeral cloud rule:** the agent must **extract OCR / summary into course MD immediately**. For `pending_mac` Canvas uploads, keep the original on your phone camera roll and AirDrop to `inbox/captures/inbox/{id}.jpg` when at your Mac.

## Phone workflow

1. Take photo (Camera app).
2. Cursor iOS → repo `canvas-mcp` → **Cloud Agent**.
3. Attach photo; optional voice/text: *“CSCI — intake this whiteboard”*.
4. Agent appends `queue.md`, updates course MD (or flags `needs_review`).

## Mac workflow (Canvas uploads)

```bash
cd browser && npm run open-canvas   # if session expired
# AirDrop photo to inbox/captures/inbox/{capture-id}.jpg
npm run process-capture-queue       # dry-run: --dry-run
```

Uploads require Jacob confirmation per [`jacob-assignment-triage`](../../skills/jacob-assignment-triage/SKILL.md). Never auto-submit quizzes, LTI, proctored work, or voice/judgment assignments.

## Calibration

Course detection is placeholder until calibrated — see [`.jacob/capture-calibration.md`](../../.jacob/capture-calibration.md).
