# Voice sessions — spoken context intake

Side door into [`inbox/`](../README.md) memory, next to [`captures/`](../captures/README.md). **Not** Canvas truth — see `inbox/week.md` for due dates.

Filled by the local voice interviewer (`cd browser && npm run voice`); reviewed by [`jacob-voice-intake`](../../skills/jacob-voice-intake/SKILL.md). Design + setup: [`docs/VOICE.md`](../../docs/VOICE.md).

## Layout

```
inbox/voice/
  README.md        # this file (tracked)
  sessions/        # gitignored — raw transcripts, one {id}.md per session
inbox/goals.md     # tracked — Raw captures (tool-written) + Distilled (agent-maintained)
inbox/courses/CODE.md → ## Class notes   # tracked — voice bullets tagged (voice: {id})
```

## What is tracked vs local

| Tracked (committed) | Gitignored (never commit) |
|---------------------|---------------------------|
| `inbox/goals.md` captures + distilled goals | `inbox/voice/sessions/*.md` raw speech-to-text |
| Class-note bullets in `inbox/courses/CODE.md` | Audio (the app never records audio to disk) |

Session ids match capture ids: `YYYYMMDD-HHMMSS-hex4` (America/Denver).

## Session file

Frontmatter (`id`, `mode`, `course`, `started`, `ended`, `captures`, `status`, `model`), then alternating `**Jacob:**` / `**Interviewer:**` turns with `_saved goal …_` lines where the interviewer wrote to memory. `status: raw` until `jacob-voice-intake` sets `distilled`.
