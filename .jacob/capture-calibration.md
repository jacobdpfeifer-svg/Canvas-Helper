# Capture calibration checklist

Course detection from photos is **placeholder** until Jacob confirms guesses per course.

## Status

| Course code | Confirmed captures | Notes |
|-------------|-------------------|-------|
| APPM1235 | 0 | |
| BCOR1030 | 0 | |
| CSCI1200 | 0 | |
| COEN1500 | 0 | event_selfie flow tested separately |
| ECON2010 | 0 | |
| CALCREADY | 0 | |
| ONLINEEXP | 0 | |

## Rules

- Agent must not set `confidence: high` from OCR alone until this table shows ≥2 confirmed captures for that course.
- User text/voice in the same message (`“BCOR whiteboard”`) always overrides.
- When ambiguous → `course_guess: UNKNOWN`, `status: needs_review`.

## How to confirm

After a correct intake, increment the count and add a one-line note (date + capture id from `inbox/captures/queue.md`).
