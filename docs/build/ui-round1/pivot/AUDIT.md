# UI round 1 — front-end AUDIT

Walked in code + Vitest on a synthetic fixture (not a live Tauri window).

## Controls

| Surface | Control | Does | Notes |
|---|---|---|---|
| Onboarding 1 | School | Sets CU vs waitlist | Waitlist never enters the app |
| | View terms | Sheet with full draft | Scrolls in the sheet only |
| | Accept terms | Toggle, filled when on | Continue disabled until on |
| | Continue | Next | |
| Onboarding 2 | Sign in / Try again | SSO; stay on failure | No Skip; no browser-only proceed |
| Onboarding 3 | Sync cards | Per-course progress | Partial still `onDone` with loaded courses |
| Home | Range radios | Persist `pn_semester_range` | Default 1 month |
| | Tick | Hover bubble, click popup | 12px hit, arrows along row |
| | Open in Canvas | `open_external_url` | |
| | View plan | Exam Prep | Quizzes/exams only |
| Exam Prep | Redo | Seed++ reshuffle | Honest draft copy |
| | Let’s test | Study tab + preselect | Empty copy if no practice |
| Calendar | Commitment | Existing IPC | One batched surface read |
| | Add to calendar | Local jsonl | No GCal write |
| | Suggested Add/Dismiss | Local only | Producer pending |
| Settings | Themes / Canvas / Canvas data | Inspect-only sources | Import CTAs hidden in inspect mode |
| Study | Unchanged session | Empty-state → Canvas data | |

## Perf

**Before:** Plan tab six daemon hops (`readDueReviews` + five others), ~1s class of delay.  
**After:** Calendar tab one `read_calendar_surface`. Vitest asserts that IPC is called once on mount. Live &lt;300ms not measured in-app this session.

## Bugs fixed

- Accept filled state (toggle button `aria-pressed` + `.filled`)
- Settings/workspace background painted `var(--bg)` so scroll is not transparent-window white
- Settings type scale aligned to 15px / display h1
- Plan tab “doesn’t work”: slow/erroring six-read mount replaced; tab keyboard handler unchanged and still switches

## Remaining

- Screenshot pass in Paper/Night
- Stubbed SSO end-to-end in the .app
- Hover bubble + popup both visible at once (click keeps hover); minor, not blocking
- `Onboarding.tsx` still a Settings embed (not first-run)
- Global button restyle not done (out of scope)
