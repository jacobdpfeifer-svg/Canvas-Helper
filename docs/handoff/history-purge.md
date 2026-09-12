# History purge — Jacob-private corpus (escalate)

**Finding (2026-09-06 audit):** Deleting `dev/`, `.jacob/`, and repo `inbox/` from the working tree (commit `122df01`) does **not** remove blobs from `phase1-productname-pivot` history. They remain recoverable:

```bash
git show 37f38b3:dev/JACOB.md   # starts with "Jacob Pfeifer — Canvas agent profile"
git rev-list --objects phase1-productname-pivot -- 'dev/' '.jacob/' 'inbox/'
```

**2026-09-12:** Local tag `pre-purge-backup` (which held the corpus) was **deleted** on this machine. Do **not** recreate or push any backup tag that contains `dev/JACOB.md`.

**2026-09-12 verification (post-tag-deletion):** confirmed `37f38b3` is **not** an ancestor of `phase1-productname-pivot` (`git merge-base --is-ancestor 37f38b3 phase1-productname-pivot` fails), and `git log --full-history --oneline phase1-productname-pivot -- dev/ .jacob/ inbox/` returns nothing — the branch's real reachable history is clean. Checked all 17 `origin/*` branches with `git merge-base --is-ancestor 37f38b3 <branch>`: none contain it, so it was never pushed. `git show 37f38b3:dev/JACOB.md` still resolves only because the commit object is dangling (unreachable garbage) in the local `.git` object store, not because it's part of any live history; `git gc --prune=now` was run to clean this up. **The purge is complete — no rewrite/force-push is needed.** Leave the rewrite recipe below only as a reference in case a *new* leak reintroduces these paths.

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

## Separate finding: `main` branch (out of scope for this doc, recorded for the audit trail)

This doc only ever scoped `phase1-productname-pivot`. Checked 2026-09-12: `origin/main` on the public repo `jacobdpfeifer-svg/Canvas-Helper` currently has `.jacob/auto-submit-log.md`, `calibrated-courses.md`, `capture-calibration.md`, `priority-rubric.md`, `signup-preferences.md` in its **live tracked tree** (not just history) — by design, per the `main`-branch commit message "Jacob material remains on main." Jacob reviewed this 2026-09-12 and chose to leave the repo public as-is. No agent action taken; recorded here so a future pass doesn't re-discover it as new.
