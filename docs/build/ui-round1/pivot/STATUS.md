# UI round 1 — STATUS (`phase1-productname-pivot`)

Re-entry: this checkout, not a competing candidate worktree.

## Done

- Schema 2 study-sources (kind, weights, term, color) + assignment-group fetch + progress.json / stdout events
- `read_semester`, `read_calendar_surface`, local `calendar.jsonl`, suggestions reader
- Home semester line (range, ticks, glass hover/click, exam → Exam Prep)
- Onboarding: School + Accept toggle + terms sheet → mandatory Canvas → Syncing cards
- Calendar tab (commitment + add sheet + suggestions); Plan six-hop load removed from this tab
- Tabs Home / Study / Calendar / Settings; Sources inspection under Settings → Canvas data
- Beta draft terms/privacy; `legal.ts` loads markdown
- Tests: browser 98, app Vitest 27, Rust 11 (via `scripts/native-mirror.sh cargo test --locked`), frontend `npm run build`

## Not done / blocked

- Live Tauri onboarding against stubbed SSO on a fresh synthetic profile (needs `DEV_USER_ROOT` + `PRODUCTNAME_STUB_CANVAS=1` and copying `tests/fixtures/study/ui-round1/*.json`)
- Screenshots under `screens/` (no GUI capture this session)
- Gmail suggestion **producer** (contract + fixture only)
- Google Calendar writes (seam only)
- Adaptive “test your knowledge” (routes to existing Study or empty state)

## How to run

```bash
export PATH="/opt/homebrew/bin:$PATH"
export DEV_USER_ROOT=/tmp/pn-ui-round1
export PRODUCTNAME_STUB_CANVAS=1
mkdir -p "$DEV_USER_ROOT/inbox/study-sources"
cp tests/fixtures/study/ui-round1/*.json "$DEV_USER_ROOT/inbox/study-sources/"
cp tests/fixtures/study/ui-round1/calendar-suggestions.jsonl "$DEV_USER_ROOT/inbox/"
cd browser && npm test
cd ../app && npm test && npm run build
scripts/native-mirror.sh cargo test --locked
```

## Owner questions (proceeded)

Q1 Calendar / Exam Prep naming — used.  
Q2 Commitment on Calendar — used.  
Q3 Gmail producer pending.  
Q4 Cluster small ticks within 8px — used.

Must-ship subset (data model, Home line, onboarding, Calendar IPC slowness) is in.
