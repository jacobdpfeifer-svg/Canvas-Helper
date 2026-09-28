# APPM1235 — WebAssign agent playbook

**Course:** APPM 1235 Pre-Calculus for Engineers (Stewart/Redlin/Watson via Cengage WebAssign)  
**Canvas:** https://canvas.colorado.edu/courses/141255  
**Parent catalog:** [`APPM1235.md`](APPM1235.md)

Use this file **every time** an agent works WebAssign for precalc. It documents the exact automation built in this repo (Sep 2026, WA 8 pilot) and when a different approach is better.

---

## Default vs full-auto

| Mode | When | Who submits |
|------|------|-------------|
| **Process help (default)** | Normal homework unless Jacob explicitly asks for automation | Jacob in WebAssign UI; agent drafts steps/answers in chat |
| **Full-auto (this playbook)** | Jacob says “complete WebAssign”, “run webassign”, or overrides handoff for a specific assignment | Playwright script fills + submits per question |

**Hard stops (always):** exams, proctored work, quizzes meant to be closed-book without Jacob’s explicit override. Never store IdentiKey passwords or commit `browser/.auth*` profiles.

---

## Architecture

```text
Jacob triage ← APPM1235.md / inbox/week.md
     ↑
inbox/courses/_raw/webassign-*.json  (run logs)
     ↑
npm run webassign  →  scrape → solve → fill → submit
     ↑
Persistent Chrome (CDP :9224, profile browser/.auth-webassign)
     ↑
WebAssign student UI  (direct URL or Cengage SSO once per session)
```

**Why persistent CDP (not a new browser every command):**  
Early runs relaunched Playwright → Canvas SSO → WebAssign on **every** `npm run webassign` call (~1–8 min). The current design keeps one Chrome window open and reconnects via CDP in ~3 s.

**Separate profile:** `browser/.auth-webassign` (not `browser/.auth` used by `npm run sync`). Avoids lock conflicts with Canvas sync.

---

## One-time / session setup

```bash
cd browser
npm run open-webassign
```

1. A **dedicated Chrome** opens (CDP port **9224**, overridable with `WEBASSIGN_CDP_PORT`).
2. If prompted: complete **Cengage / CU SSO** in that window.
3. **Leave Chrome open** for the whole homework session.

Session state is cached in `browser/.webassign-session.json` (`waUrl`, assignment title, etc.).

---

## Commands (agent order)

### 1. Preflight — inventory only

```bash
cd browser && npm run webassign -- --list
```

Expect: `Reusing open WebAssign tab: …` in a few seconds (not a full Canvas login loop).

Read score + `OPEN` vs `DONE` per question. Cross-check due time in [`inbox/week.md`](../week.md) (America/Denver).

### 2. Complete open questions

```bash
cd browser && npm run webassign -- --all-open
```

Optional flags:

| Flag | Purpose |
|------|---------|
| `--assignment <canvas-url>` | Canvas LTI entry (default: current WA in script) |
| `--wa-url <webassign-url>` | Direct assignment URL (`…/Assignment-Responses/last?dep=…`) — **preferred after first login** |
| `--title 'WA 9'` | Regex on assignment title |
| `--limit N` | Cap how many incomplete questions to attempt |
| `--close` | Kill Chrome when done (default: **keep open**) |

### 3. Verify + log

- Final score printed to stdout.
- JSON log: `inbox/courses/_raw/webassign-<slug>-<timestamp>.json`
- Script appends a one-line note to `APPM1235.md` → `## Class notes`.

---

## Code map

| Path | Role |
|------|------|
| `browser/scripts/open-webassign.mjs` | Launch / attach persistent Chrome |
| `browser/scripts/webassign-complete.mjs` | CLI orchestrator |
| `browser/scripts/lib/webassign/browser-session.mjs` | CDP connect, reuse tab, session file |
| `browser/scripts/lib/webassign/session.mjs` | Cengage login helpers, leave autosave submit page |
| `browser/scripts/lib/webassign/scrape.mjs` | Question inventory, MathML text, scores |
| `browser/scripts/lib/webassign/fill.mjs` | MathType / text / radio fill + submit |
| `browser/scripts/lib/webassign/solver.mjs` | Problem-ID rules + optional `OPENAI_API_KEY` |
| `browser/scripts/lib/webassign/session-log.mjs` | `_raw` JSON logs |

**Finding `dep=` for a new assignment:** open the assignment in WebAssign once; URL contains `dep=39902xxx`. Pass via `--wa-url` or update default in `webassign-complete.mjs` / session file.

---

## Per-question agent loop (what the script does)

For each **incomplete** question:

1. **Navigate** — ensure full assignment view (`…/last?dep=…`), not autosave `/submit?tags=autosave` (script calls `ensureAssignmentPage` before/after each submit).
2. **Scrape** — `scrapeQuestionDetail`: problem text, MathML, text inputs, radio groups, `SPreCalc8 x.y.zzz` problem ID.
3. **Solve** — `solver.mjs`: match `problemId` → answer pack (`mathPads`, `textInputs`, `radio`). Fallback: OpenAI if `OPENAI_API_KEY` set.
4. **Fill** — scoped to `.waQBox` for that question’s `submit_<id>` (never global “Press Space…” pads).
5. **Submit** — click question Submit; wait ~5 s; scrape partial score.
6. **Retry once** if partial credit and solver has higher-confidence alternate (limited today — extend in `solver.mjs` as needed).

---

## MathType fill rules (learned on WA 8)

These matter more than raw math correctness.

### Commit pattern

- **Works:** click pad → type → **Enter** → click question Submit area to blur (~700 ms).
- **Fails:** Tab-only exit (hidden `RA_*` fields stay empty → WebAssign shows `– / n Points` ungraded).

### Hidden fields

- Use `input[id^="RA_"]:not([id$="_settings"])`.
- Including `_settings` rows **offsets pad indices** and fills the wrong slot.

### Expression types

| Type | Method |
|------|--------|
| Simple numeric / polynomial | Keyboard + Enter + blur |
| `sqrt(…)` | Prefer MathML inject with `<msqrt>` (typing `sqrt` becomes letters) |
| `undefined` | MathML `<mtext>undefined</mtext>` or keyboard; verify hidden field non-empty |
| Piecewise / table | Plain `textInputs` (not MathType) |
| Graph choice | Radio by `name` + `value` |
| **Interval / union domain** | Prefer **keyboard** typing (e.g. `(-infinity,-7)U(-7,infinity)`). Inject-only often **does not grade**; clicking pad after inject can **wipe** the value |
| Fractions | `29/5` via keyboard usually OK; inject `<mfrac>` for stubborn pads |

### Read the function from MathML, not layout

Example WA8 Q7: vertical text looked like `7/x² + 1` but MathML was `7x² + 1`. Always scrape `<math>` for `f(x)=` before solving.

### Order of operations in fill

For answers like `4x+1/x`, typing `1/x+4x` can parse as `1/(x+4x)`. Use explicit MathML or `4x+1/x` ordering.

---

## Solver maintenance

Add/update cases in `browser/scripts/lib/webassign/solver.mjs` by **WebAssign problem ID** (e.g. `SPreCalc8 2.1.021.`).

After a hard question:

1. Dump text: run scrape or save to `inbox/courses/_raw/webassign-wa*-all-text.json`.
2. Add rule or `EXACT_MML` entry in `fill.mjs`.
3. Re-run `--limit 1` on that question number (may need `--all-open` + manual filter — or temporary `--limit` on first incomplete).

**Optional:** set `OPENAI_API_KEY` + `WEBASSIGN_OPENAI_MODEL` (default `gpt-4o-mini`) for one-off questions without a rule.

---

## Known failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Every command redoing Cengage login | Chrome closed or CDP dead | `npm run open-webassign`; leave window open |
| `Reusing open WebAssign tab` missing | New Playwright window instead of CDP | Use only `npm run webassign`, not old one-shot scripts |
| `– / n Points` (ungraded) | MathType not committed | Enter + blur; check hidden `RA_*` length |
| Score stuck after “fill” | On autosave submit page | Script should goto `last?dep=`; if stuck, navigate manually once |
| `Target page … closed` | Jacob closed Chrome mid-run | Re-open; rerun `--list` |
| Domain union always 0 | Inject without keyboard | Type interval in MathType; confirm stored MathML before submit |
| Partial credit, answers “look right” | WebAssign wants different form (expanded vs factored, bracket type) | Compare to **PREVIOUS ANSWERS** in UI; adjust solver |

---

## Alternative methods (use when better)

### A. Process help + Jacob submits (**default policy**)

**Better when:** learning-focused homework, new section, Jacob wants to practice MathType, or automation is flaky.

Flow: [`skills/jacob-canvas-browser`](../../skills/jacob-canvas-browser/SKILL.md) § D — open LTI in browser, agent drafts, Jacob clicks Submit.

### B. Persistent CDP automation (**this playbook**)

**Better when:** Jacob explicitly wants bulk completion, many repetitive precalc questions, session already logged in, due soon.

### C. One-shot Playwright on `browser/.auth` (legacy)

**Better when:** CDP port conflict (9224 taken), or debugging without persistent session.

Old pattern: `launchCanvasContext` → Canvas assignment → popup WebAssign → close context at end. **Do not use for multi-command runs** — each invocation repeats SSO. Scripts like `_tmp-wa5-q1.mjs` follow this.

### D. Cursor IDE browser (escape hatch)

**Better when:** quick visual check, MFA Jacob must complete, or agent needs to see “Show Details” / “Previous Answers” feedback.

**Not scriptable** for bulk fill; no SSO assumption.

### E. OpenAI solver fallback

**Better when:** problem ID not in `solver.mjs`, scrape text is complete, and rule maintenance isn’t worth it for one question.

Set `OPENAI_API_KEY`. Review JSON log before Jacob considers homework done.

### F. Jacob manual MathType

**Better when:** WebAssign rejects correct MathML (special products, ± notation, graph picks) — documented on WA 3 Q9–Q10 in [`APPM1235.md`](APPM1235.md) class notes.

Agent: give exact keystrokes / expected MathType structure; Jacob enters once and confirms score.

---

## WA 8 reference run (Sep 2026)

Pilot assignment: **WebAssign 8 (2.1) + Pre-Class 2.2** — due Sun Sep 20, 2026 11:59 PM MT.

| Milestone | Score | Notes |
|-----------|-------|-------|
| Start | 12/70 | Q1–4 manual |
| After MathType fixes + CDP session | 42/70 | |
| After Q6–Q11, Q18 fixes | 57/70 | |
| Paused | **65/70** | Remaining: domain Q19–Q20, Q23–Q25 (interval notation) |

Logs: `inbox/courses/_raw/webassign-wa8-*.json`.

---

## Agent checklist (copy each session)

- [ ] Read [`APPM1235.md`](APPM1235.md) + this file.
- [ ] Confirm Jacob asked for **automation** (not just help).
- [ ] `npm run open-webassign` if Chrome/CDP not up.
- [ ] `npm run webassign -- --list` — note OPEN questions + due (MT from `inbox/week.md`).
- [ ] Set `--wa-url` / `--title` for the correct assignment if not WA 8.
- [ ] Run `--all-open` or `--limit N`; **do not close Chrome** between runs.
- [ ] Confirm final score; point Jacob to log in `_raw/`.
- [ ] Append study gaps to `APPM1235.md` → `## Class notes` if Jacob shared learning (not auto-submit noise).

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `WEBASSIGN_CDP_PORT` | `9224` | Chrome remote debugging (avoid 9223 IDE browser) |
| `WEBASSIGN_AUTH_DIR` | `browser/.auth-webassign` | Chrome profile path |
| `WEBASSIGN_SESSION_FILE` | `browser/.webassign-session.json` | Last WA URL / title |
| `OPENAI_API_KEY` | — | Optional solver fallback |
| `WEBASSIGN_OPENAI_MODEL` | `gpt-4o-mini` | Model for fallback |

---

## Related docs

- [`docs/HYBRID.md`](../../docs/HYBRID.md) — SSO → API → inbox truth path  
- [`docs/CU_BROWSER.md`](../../docs/CU_BROWSER.md) — Playwright vs IDE browser  
- [`skills/jacob-canvas-browser/SKILL.md`](../../skills/jacob-canvas-browser/SKILL.md) — sync + LTI escape hatch  
- [`APPM1235-precalc-study-set.md`](APPM1235-precalc-study-set.md) — manual study patterns  

**Maintainers:** extend `solver.mjs` + `fill.mjs` from real WebAssign feedback; update the “Known failure modes” and WA reference table when a new assignment is fully calibrated.
