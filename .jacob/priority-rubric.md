# Priority rubric (Jacob IBE)

Single source of scoring rules for [`jacob-task-brief`](../skills/jacob-task-brief/SKILL.md). Scores are computed on demand from `inbox/week.md` + [`JACOB.md`](../JACOB.md) — sync never writes P-levels.

## Levels

| Level | Meaning |
|-------|---------|
| **P0** | Do now / blocks the week (due &lt;24h, overdue, or unlocks later work today) |
| **P1** | This window, high value (due &lt;72h, high stakes, or strong goal fit) |
| **P2** | Schedule this week (medium stakes / due later in window) |
| **P3** | Batch, agent-draft, or defer (low stakes, far out, mechanical) |

## Factors

| Factor | Signal | Effect |
|--------|--------|--------|
| **Urgency** | Due in &lt;24h / &lt;72h / this week / undated | Pushes toward P0–P1 when soon; undated stays low unless unlock |
| **Stakes** | Points, quiz/exam, proctored | High stakes → Jacob deep time (Worth), never agent-submit |
| **Goal fit** | Career rank + course defaults in `JACOB.md` (CSCI default Worth; APPM exams Jacob; BCOR presentations Jacob; entrepreneurship lens) | Boost career-aligned work within same urgency band |
| **Friction** | WebAssign / ZyBooks / PlayPosit / other LTI | Schedule Jacob-in-tool block; never auto-submit |
| **Unlock** | Pre-reading before lab, signup before event, access setup | Raise priority even if low points |
| **Agency** | Mechanical native Canvas busywork | Lower Jacob deep time; agent drafts when calibrated |

## Scoring guidance (apply in order)

1. Overdue or due &lt;24h → at least **P0** (unless already complete).
2. Due &lt;72h **or** quiz/exam/proctored **or** unlocks same-week work → at least **P1**.
3. Strong goal fit (esp. CSCI build / pitch / team) in this week → prefer **P1** over **P2** when urgency is comparable.
4. Same-platform LTI cluster due same day → keep as **P1/P2** but **batch** in one sitting (see time rules).
5. Tiny points, mechanical, native, far due → **P3** (agent draft when policy allows).
6. When unsure between two adjacent levels → **ask Jacob**, do not invent stakes.

## Time optimization (fixed)

- Protect deep blocks for **P0–P1 Worth** items (CSCI build, exams, judgment writing).
- Batch same-platform LTI (all PlayPosit, then WebAssign, then ZyBooks) into one sitting.
- Prefer short mechanical clears when energy is low; never steal exam/CSCI prep for busywork.
- When two items collide, pick higher goal-fit unless the other is &lt;24h due or unlocks later work.
- Calendar/signup items: do early if they bind a time slot; otherwise P2/P3.

## Mode (not the same as P-level)

| Mode | Meaning |
|------|---------|
| **Worth** | Jacob deep attention |
| **LTI (you in tool)** | Process help only; Jacob operates the tool UI |
| **Agent draft** | Agent prepares text/files; Jacob reviews / pastes |
| **Ask** | Ambiguous outcome or first submit in uncalibrated course |
