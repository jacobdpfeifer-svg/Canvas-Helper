---
name: jacob-calendar-sync
description: Sync curated CU school schedule to Google Calendar (CU Fall 2026 subcalendar). Use for "add to my calendar", "sync school schedule", "put BCOR on my calendar".
---

# Jacob calendar sync

Curated school events → dedicated Google Calendar subcalendar **CU Fall 2026**. Canvas/inbox remains source of truth; Google Calendar is a downstream mirror.

Policy: [`.jacob/calendar-policy.md`](../../.jacob/calendar-policy.md)

## Scope (curated)

**Include:** recurring classes, timed exams/presentations, confirmed club RSVPs, manual queue entries.

**Exclude:** nightly 11:59 PM homework, full dinner slot catalogs, Canvas announcements.

## Auth

1. **Writes (primary):** Composio `googlecalendar` OAuth via `COMPOSIO_MANAGE_CONNECTIONS`. CLI `--apply` also needs `COMPOSIO_API_KEY` in `.env`.
2. **Verification (optional):** Playwright CDP + dedicated Chrome profile (`browser/.auth-google`) — not for bulk writes.

## Agent workflow

### Add something Jacob mentions in chat

1. Append a row to [`inbox/calendar-queue.md`](../../inbox/calendar-queue.md).
2. Rebuild manifest + dry-run:
   ```bash
   cd browser && npm run sync-calendar -- --dry-run
   ```
3. Show diff from `inbox/calendar-sync-diff.md`; ask Jacob to confirm.
4. Apply:
   ```bash
   cd browser && npm run sync-calendar -- --apply
   ```

### Full school schedule sync

```bash
cd browser && npm run open-canvas          # if Canvas session expired
cd browser && npm run sync-calendar        # rebuild manifest + dry-run
cd browser && npm run sync-calendar -- --apply   # after Jacob confirms
```

First-time setup:

```bash
# 1. Connect Composio googlecalendar (OAuth in chat)
# 2. Create subcalendar + save calendar_id to policy
cd browser && npm run sync-calendar -- --setup-calendar
```

Optional Google visual check:

```bash
cd browser && npm run open-google-calendar
```

## Sources merged into manifest

| Source | Path |
|--------|------|
| Canvas section meetings | `/api/v1/calendar_events` type=event (term window) |
| Course overrides | BCOR/APPM times from `inbox/courses/*.md` |
| Timed checkpoints | `## Checkpoints` in course MD (non-11:59pm) |
| Confirmed clubs | `.jacob/signup-preferences.md` |
| Manual | `inbox/calendar-queue.md` |

Output: [`inbox/calendar-manifest.json`](../../inbox/calendar-manifest.json)

Sync state: `inbox/courses/_raw/google-calendar-sync-state.json` (`cu_id` → Google `event_id`).

## After CampusGroups RSVP

When `rsvp-dinner` or `rsvp-ai-lab` succeeds, offer to run `sync-calendar` so the confirmed slot appears on **CU Fall 2026**.

## Hard rules

- Never write to `primary` unless Jacob explicitly asks.
- Never delete Google events without `--prune` (future) and `cu_id` tag match.
- Dry-run by default; `--apply` only after Jacob confirms diff.
