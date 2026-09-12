# History purge — Jacob-private corpus (escalate)

**Finding (2026-09-06 audit):** Deleting `dev/`, `.jacob/`, and repo `inbox/` from the working tree (commit `122df01`) does **not** remove blobs from `phase1-productname-pivot` history. They remain recoverable:

```bash
git show 37f38b3:dev/JACOB.md   # starts with "Jacob Pfeifer — Canvas agent profile"
git rev-list --objects phase1-productname-pivot -- 'dev/' '.jacob/' 'inbox/'
```

**2026-09-12:** Local tag `pre-purge-backup` (which held the corpus) was **deleted** on this machine. Do **not** recreate or push any backup tag that contains `dev/JACOB.md`. Tip/origin path counts may already be clean for those paths; **history blobs on the branch tip ancestry can still exist** — verify with the commands above before any public mirror.

## Required human action

Force-pushing a rewritten branch needs explicit approval (rewrites shared history on `origin/phase1-productname-pivot`).

Suggested local rewrite (after stashing / committing WIP):

```bash
# Requires git-filter-repo
git filter-repo --force \
  --path dev/ --path .jacob/ --path inbox/ --invert-paths \
  --refs refs/heads/phase1-productname-pivot

git push --force-with-lease origin phase1-productname-pivot
```

Verify after rewrite:

```bash
git log --all --full-history --oneline -- 'dev/' '.jacob/' 'inbox/'
# expect empty on this branch tip ancestry for those paths' blobs
git show 37f38b3:dev/JACOB.md   # should fail after rewrite
```

Do **not** merge the unre-written tip into any public default branch until this completes.
