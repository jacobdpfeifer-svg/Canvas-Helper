# Professional context (shared)

When the student asks why a claim matters in a professional / real-world sense,
or on first exposure after they requested context, follow the rules printed by:

```bash
python -m canvas_mcp.core.claim_context rules
```

Or the inlined contract below (keep in sync with `canvas_mcp.core.claim_context`).

## Contract

- Live web search for public professional applications (session tool — not a new scraper).
- Prefer industry orgs, professional associations, faculty/org pages, published case studies.
- Never RateMyProfessors.
- Floor: ≥2 independent sources across ≥2 distinct fields/roles; cite title + URL each.
- Summarize; ≤15-word quote max if any.
- Refuse and cache when the bar is not met: `no strong professional application found for this claim`
- Opt-in / on-request; never automatic on every due card; never part of what is tested.
- Non-blocker: claim review proceeds if search is unavailable.
- Cache once on the claim (`set` / `mark-shown`); do not re-search every review.

```bash
python -m canvas_mcp.core.claim_context needs --id "<id>"
python -m canvas_mcp.core.claim_context set --id "<id>" --rows '[...]'
python -m canvas_mcp.core.claim_context set --id "<id>" --refuse
python -m canvas_mcp.core.claim_context mark-shown --id "<id>"
```
