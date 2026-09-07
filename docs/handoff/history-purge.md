# History purge — Jacob-private corpus (escalate)

**Finding (2026-09-06 audit):** Deleting `dev/`, `.jacob/`, and repo `inbox/` from the working tree (commit `122df01`) does **not** remove blobs from `phase1-productname-pivot` history. They remain recoverable:

```bash
git show 37f38b3:dev/JACOB.md   # starts with "Jacob Pfeifer — Canvas agent profile"
git rev-list --objects phase1-productname-pivot -- 'dev/' '.jacob/' 'inbox/'
```

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
```

Do **not** merge the unre-written tip into any public default branch until this completes.
