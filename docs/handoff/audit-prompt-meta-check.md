# Meta-audit prompt: check the auditors

Hand this whole file to an agent as its task prompt **after** one or more audit-and-fix passes have run under [`audit-prompt-next.md`](./audit-prompt-next.md) (line-level truth audit and/or macro architecture audit) and produced updated briefs. This prompt does not audit the codebase directly — it audits the audits.

---

## Why this pass exists

Every audit pass so far in this repo has been run by an agent grading its own homework: it ran commands, decided they passed, and wrote a brief saying so. `architect-brief.md` itself is the second generation of that pattern — it exists because a first pass's claims didn't hold up. There is no reason to assume the most recent pass is any more reliable by default. Someone has to check the checker, and that someone gets no credit for trusting the paperwork.

**You are not allowed to accept any prior brief's word for anything.** Every "Done," "Shipped," "97 passed," "removed," or "consolidated" in `architect-brief.md`, any `architecture-audit-*.md`, `deferred.md`, `oauth-smoke.md`, or `packaging-notes.md` is a claim made by an agent that was graded on making the codebase look good in that moment. Your job is to independently re-derive whether each claim is true, and to treat contradictions, unverifiable claims, and cosmetic-only "fixes" as findings in their own right — against the *auditors*, not the code.

### Ground rules

1. **Reproduce, don't read.** For every command a brief claims to have run and every output it quotes, run it yourself, right now, and diff the real output against the quoted one. A brief that quotes a command output you cannot reproduce is a false claim until proven otherwise.
2. **Check the diff, not the narrative.** For every "consolidated X and Y" or "removed dead code Z" claim, look at the actual git history (`git log`, `git show`, `git diff <range>`) for the commits that pass produced. If the described merge/removal isn't in the diff, the claim is false regardless of how convincing the prose is.
3. **Check for refactor theater retroactively.** If a prior pass claims to have fixed a structural/macro finding, confirm the fix actually removed duplication or clarified ownership — not just renamed files, added a wrapper, or moved code sideways. Re-read both "before" and "after" if you can reconstruct "before" from git history.
4. **Check that fixes didn't break what they touched.** Run the full test suite now:
   ```bash
   uv run python -m pytest tests/ -q
   ```
   and, if changed in the audited range, the Tauri build:
   ```bash
   source "$HOME/.cargo/env"
   cd app/src-tauri && CARGO_TARGET_DIR=/tmp/productname-tauri-target cargo check
   ```
   Compare against whatever counts the audited briefs claimed. Any regression is a finding against that pass, full stop — "the refactor was structurally right but broke three tests" is not a pass.
5. **Check for scope violations.** Did any prior pass touch something on its own Escalate-only list instead of leaving it for a human? Did it restore anything from the permanently-out-of-scope list in `CLAUDE.md` (educator tools, hosted Azure, quiz-taking automation), even partially, even as scaffolding? That's a severity-max finding regardless of how it's framed in the brief.
6. **Check for doc sprawl and self-contradiction.** List every file under `docs/handoff/` and `docs/design/` and check whether they agree with each other and with the current code. If two docs make incompatible claims about the same subsystem, that's a finding — someone has to be right and you need to determine which, not average them.
7. **Check that "escalated" items were genuinely un-doable, not just avoided.** For anything a prior pass punted to "Escalate," verify it actually required a credential/decision/second device you don't have — if it was actually fixable within the agent's own authority and it dodged it, that's a finding (a soft failure to be ruthless, dressed up as appropriate caution).
8. **Fix what you can fix in this pass too.** If you find a genuinely false "Done" claim and the underlying gap is small and within your authority, close it now rather than just flagging it — you are still bound by the same ruthless-fix mandate as the passes you're checking, applied to whatever they missed.
9. **No credit for volume.** A brief with a long "Shipped" table and confident tone is not evidence of a good pass. A short brief with real receipts and honest "not verified" markers is worth more than a long one with none. Judge accordingly.

### What "false claim" means here, concretely

Mark a prior claim **false** (not "unverified," "false") when any of these hold:
- The quoted command output doesn't match what you get running it now, and the discrepancy isn't explained by legitimate subsequent changes.
- The described file/function/hardcode is still present after a "removed" claim.
- The described merge/consolidation left both original implementations in place, or left callers pointing at the old one.
- A "wired in and tested" claim has no test actually exercising the new wiring, or the test exists but doesn't assert the behavior claimed.
- A "Phase 2 / out of scope" classification is being used to avoid a fix that was actually in-scope and doable.

Mark it **unverifiable** when you genuinely cannot reproduce the check (e.g., it required a live OAuth consent flow) — don't call these false, but don't credit them either; note exactly what would be needed to verify.

---

## Audit surface

### 1. Inventory every audit artifact

```bash
ls docs/handoff/ docs/design/
git log --oneline --all -- docs/handoff/
```

Build a table: file, date/commit it was produced by, what pass produced it, what it claims to supersede or be superseded by. Flag any file nobody has touched despite the system underneath it having changed since.

### 2. Re-run every receipt in `architect-brief.md`

Go section by section through the "How to verify locally" commands and every inline command in the brief. For each: run it, record real output, mark match / mismatch / unverifiable.

### 3. Re-run every receipt in any `architecture-audit-*.md`

Same treatment. Pay special attention to claimed consolidations (section-1-style findings from the macro prompt) — these are the highest-value ones to fake convincingly with a rename, so scrutinize them hardest.

### 4. Cross-check `deferred.md` against reality

For each deferred item, confirm it's still actually deferred (not silently half-built since), and confirm nothing landed in the codebase without being reflected there.

### 5. Cross-check `oauth-smoke.md` and `packaging-notes.md` against the code

Has anyone actually run the OAuth live smoke checklist, or is it still an unexecuted checklist being treated as done in some other doc? Has the packaging deferral date/rationale in `packaging-notes.md` gone stale relative to what's now built (per §4 of `audit-prompt-next.md`, W1/W2 may now be further along than "not worth installing yet")?

### 6. Git-archaeology check on any "removed from history" claims

Any claim that personal/private data or secrets were "removed" must be checked against full history on this branch, not just working tree:
```bash
git log --all --full-history -- <path>
git log -p --all -- <path> | grep -i "<sensitive pattern>"
```
A working-tree deletion with the content still reachable in this branch's history is a **false** "removed" claim, not a true one — say so plainly, and if it's within your authority, resolve it (this is a case where escalation may be warranted if history rewriting is needed on a shared branch — flag that specifically rather than force-pushing on your own judgment).

### 7. Check the checkers' self-restraint

Both prior prompts told the executing agent "if you found nothing to fix, assume you didn't look hard enough." Check whether that instruction was honored or gamed — did a pass manufacture a trivial finding just to have something in the "fixed" column, while missing an obvious real one? Real vs. performative effort should be distinguishable by whether the fixes found actually matter.

---

## Deliverable

A new dated file `docs/handoff/meta-audit-<date>.md`:

1. **Claim ledger** — every material claim from every audited doc, with a verdict: `confirmed` / `false` / `unverifiable`, and the command/diff that proves it.
2. **Findings against the audits themselves** — patterns of weak verification, refactor theater, scope-dodging, or doc self-contradiction, named specifically (which pass, which claim).
3. **Fixes applied in this pass** — anything you closed yourself because a prior pass missed or faked it, with before/after test output.
4. **Trust verdict per prior document** — for each audited file, one line: trustworthy / partially trustworthy (list the false parts) / not trustworthy.
5. **Standing recommendation** — should the next real audit pass keep using `audit-prompt-next.md` as-is, or does this meta-check reveal a hole in that prompt itself (a check it should have demanded but didn't) that needs to be added to it?

If your claim ledger comes back with zero `false` entries across every prior document, treat that as suspicious rather than reassuring — go back and re-run section 6 and section 3 with more skepticism before concluding every prior pass was fully honest.
