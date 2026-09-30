# Voice intake — talk it through

**One sentence:** a local web page streams your mic to Gemini Live, an interviewer model draws out your goals and how school is going, and it writes short captures into `{user_root}/inbox/` while a local transcript is kept for review.

This is a **capture** channel, not a voice remote for the harness. The text agent (`USER.md` triage, skills) stays the brain; voice adds the context you'd never type. Architecture context: [`architecture.md`](architecture.md).

```text
browser page (mic, speaker)          localhost server (browser/)             Gemini Live API
  16 kHz PCM16 frames  ──WebSocket──▶  VoiceSession  ──────────────────────▶  speech-to-speech model
  24 kHz PCM16 audio   ◀─────────────                ◀── audio, transcripts, tool calls
                                        │ tools (2 only)
                                        ├─ save_goal          → {user_root}/inbox/goals.md  ## Raw captures
                                        ├─ append_class_note  → {user_root}/inbox/courses/CODE.md  ## Class notes
                                        └─ transcript         → {user_root}/inbox/voice/sessions/{id}.md (local)
student-voice-intake (later, text agent) → verifies captures, fills goals.md ## Distilled
```

## Quick start

1. Get a Gemini API key (<https://aistudio.google.com/apikey>) and put `GEMINI_API_KEY=...` in the repo-root `.env` (gitignored; see `env.template`). Requires Node ≥ 20.12.
2. `cd browser && npm install`
3. `npm run voice-models` — lists Live-capable models for your key. Set `GEMINI_LIVE_MODEL` in `.env` to the one you want. **The built-in default is only the id from the SDK docs and may be retired.**
4. `npm run voice`, open the printed `http://localhost:8787`, allow the mic, wear headphones, press **Start**.
5. Talk. **End session** saves the transcript. Later, ask the text agent to run `student-voice-intake`.

## Session types

| Type | For | Interviewer focuses on |
|------|-----|------------------------|
| Goals & priorities | open conversation | after-graduation picture, ideas you keep returning to, what you're optimizing for, constraints, mentors; *why* behind your career ranking |
| Weekly check-in | how the week is going | what's weighing on you, what you're avoiding; uses `week.md` as conversation prompts only |
| Class reflection | one course | what clicked / didn't, confidence; saves class notes + mastery gaps |

Each session's system prompt is built from `USER.md` (identity + ranked careers), `inbox/goals.md`, `inbox/week.md` (fenced as untrusted Canvas data) and the course list, so it builds on what's known instead of re-asking.

## Safety model

- **Two tools, both local markdown appends.** No Canvas access, no submits, no file reads. Anything else you ask for is recorded as a `request` for the text agent, never executed — a misheard "yes" can't submit anything.
- **Key stays server-side.** The page never sees `GEMINI_API_KEY`.
- **Local only.** Server binds `127.0.0.1`; `Host` and `Origin` are checked so other websites in your browser can't open the mic bridge. One session at a time.
- **Raw speech stays local** (`{user_root}/inbox/voice/sessions/`, outside the repo). Audio is never written to disk; only text is.
- Tool writes go through temp-file + rename, and spoken text is whitespace-collapsed so it can't inject markdown structure.

## Privacy

Your audio is streamed to Google to be processed. Check Google's current terms for the API tier you use (free tiers have historically allowed use of data to improve products; paid tiers have not) before talking about anything sensitive.

## Tuning

| Env var | Default | Effect |
|---------|---------|--------|
| `GEMINI_LIVE_MODEL` | SDK-doc example | Live model id (`npm run voice-models`) |
| `VOICE_SILENCE_MS` | `1500` | silence that ends your turn; raise if it cuts you off mid-thought |
| `VOICE_NAME` | model default | prebuilt voice name |
| `VOICE_PORT` | `8787` | local port |

End-of-speech sensitivity is set to low (Live's default cuts turns quickly, which is wrong for reflective talk). Long sessions use context-window compression and session resumption; on a server `goAway` the bridge reconnects with the saved handle.

## Swapping the model

`browser/scripts/lib/voice/live.mjs` is the only file that imports the Google SDK; everything else takes an injected `connectLive({ config, callbacks })`. To try OpenAI Realtime or an STT → Claude → TTS pipeline, implement that seam and the two tool declarations; the server, prompt, tools, transcript, and skill don't change.

## Status

- **Tested:** unit + integration tests (`cd browser && node --test tests/voice-*.test.mjs`) against a fake Live connection, including the full WebSocket path; the page was also driven end to end in headless Chromium with a fake microphone against the real server, with Gemini stubbed.
- **Reached the real Live endpoint, but never with a valid key.** The build session had no API key and couldn't read Google's docs, so wire behavior was taken from the `@google/genai` type definitions. A bogus-key run through the real SDK confirmed the transport works and that a rejected key surfaces as a clear error within a second (the SDK's `connect()` never settles in that case; the bridge handles it). Your config, model id, and tools were not validated by Google yet. First real run to check: the model speaks first, tool calls land in `goals.md`, transcript fragments join with correct spacing, and a 15+ minute session survives resume.
- **Desktop browser only.** Mic access needs `localhost` (a secure context), so the phone can't reach it; a phone path would need hosting, which is out of scope (`CLAUDE.md`).
- Cost is small at personal volumes (roughly single-digit to low tens of dollars a month for a few hours of talking, per third-party price lists as of 2026-09 — verify).
