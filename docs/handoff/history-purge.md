# History purge — Jacob-private corpus

## Status — completed 2026-09-12

`git filter-repo` removed `dev/`, `.jacob/`, and repo `inbox/` from all history on this machine. Verification:

```bash
git show 37f38b3:dev/JACOB.md
# → fatal: invalid object name '37f38b3'
```

Local `pre-purge-backup` tag was deleted earlier the same day. Do **not** recreate or push any backup tag containing that corpus.

Force-push of `phase1-productname-pivot` to origin completed as part of this purge (required for remote history to match).

Anyone with an old clone may still have blobs until they re-fetch/reclone. Do not merge unre-written forks into a public default branch.

## Original finding (2026-09-06)

Deleting those paths from the working tree did not remove blobs from branch history until this rewrite.
