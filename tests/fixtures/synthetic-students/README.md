# Synthetic students

Fictional student personas for audit and harness runs. These are the committed
sources. Run-time user roots are built from them under `var/audit-user-roots/`
(gitignored).

The persona directories never contain a path segment named `inbox/`, because
`.gitignore` has `**/inbox/` and a file there would silently drop out of git.
The factory maps persona files into the standard user-root layout.

| Persona | Shape | Purpose |
|---|---|---|
| `avery-chen/` | AES sophomore, catalog year 2025-2026 (student-stated), four courses | Dense week: a problem set due within 48 h, a WebAssign lab (Bucket B), a writing draft, a discussion that must not be posted, and an exam moved Oct 12 → Oct 14 |
| `blake-okonkwo/` | First-year, undeclared, `USER.md` only | Isolation: an empty inbox must stay empty |

Course facts and their limits are listed in `avery-chen/SOURCES.md`. No real
IdentiKey, Canvas course ID, or feed URL appears anywhere here.

## Files → user root

| Persona file | User-root path |
|---|---|
| `USER.md` | `USER.md` |
| `week.md` / `week-stale.md` / `week-dense.md` (one, by `--week`) | `inbox/week.md` |
| `courses/*.md` | `inbox/courses/*.md` |
| `grades.yaml` | `inbox/grades.yaml` |
| `degree-audit.md` (skip with `--no-audit`) | `inbox/degree-audit.md` |
| `credit-hours.yaml` | `calibration/credit-hours.yaml` |
| `study-packet.json` | `fixture-packets/study-packet.json` (import with `python -m canvas_mcp.core.study import --path …`) |
| `USER.md` `School slug:` value | `school_slug` (the file Rust onboarding writes; `habit` reads it) |

The weeks differ as follows:

- `normal`: `Updated: 2026-10-05`, deadlines spread over the week.
- `stale`: the same rows, `Updated: 2026-09-30`. That is more than 2 days old on 2026-10-05, the `_SESSION.md` rule.
- `dense`: `Updated: 2026-10-05`, with five deadlines inside 48 h of Monday 2026-10-05.

Due cells use the same display format sync writes (`formatDueForDisplay`, for example `Oct 6, 11:59 PM MDT`), so parsers are tested against real input.

## Build a root

```bash
uv run python tests/fixtures/synthetic-students/make_root.py avery-chen --week dense
uv run python tests/fixtures/synthetic-students/make_root.py blake-okonkwo
export DEV_USER_ROOT="$PWD/var/audit-user-roots/avery-chen"
```

The factory works as follows:

- It wipes and rebuilds the target, then creates `canvas_mcp.core.user_root.USER_SUBDIRS` and an empty `ledger.jsonl`.
- It refuses any `--out` under the OS app-support root.
- It prints the root path.

## Add a persona

1. Create `<first-last>/USER.md` from `templates/USER.md`. Keep every section heading.
2. Add any of the optional files above. If course facts come from a public page, record the URL in `SOURCES.md`.
3. `make_root.py` discovers the persona automatically, because any directory with a `USER.md` counts.
