# Voice sessions — spoken context intake

Side door into `{user_root}/inbox/` memory. **Not** Canvas truth — see `inbox/week.md` for due dates.

Filled by the local voice interviewer (`cd browser && npm run voice`); reviewed by [`student-voice-intake`](../../../skills/student-voice-intake/SKILL.md). Design + setup: [`docs/VOICE.md`](../../../docs/VOICE.md).

## Layout

```
inbox/voice/
  README.md        # this file
  sessions/        # raw transcripts, one {id}.md per session
inbox/goals.md     # Raw captures (tool-written) + Distilled (agent-maintained)
inbox/courses/CODE.md → ## Class notes   # voice bullets tagged (voice: {id})
```

## What is tracked vs local

| Durable memory | Review-only |
|---------------------|---------------------------|
| `inbox/goals.md` captures + distilled goals | `inbox/voice/sessions/*.md` raw speech-to-text |
| Class-note bullets in `inbox/courses/CODE.md` | Audio is never written to disk |

All of it lives under `{user_root}` on the student's machine, never in the repo.

Session ids: `YYYYMMDD-HHMMSS-hex4` (America/Denver).

## Session file

Frontmatter (`id`, `mode`, `course`, `started`, `ended`, `captures`, `status`, `model`), then alternating `**Student:**` / `**Interviewer:**` turns with `_saved goal …_` lines where the interviewer wrote to memory. `status: raw` until `student-voice-intake` sets `distilled`.
