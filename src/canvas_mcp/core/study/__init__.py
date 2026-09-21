"""Study sessions: source-backed practice with honest, delayed evidence.

Single state-transition authority for study items (DECISIONS D-03). Legacy
``learn_loop`` claims are a separate surface and never earn delayed credit here.

Layout:
    model      typed records, vocabularies, boundary validation
    clock      zone-aware calendar arithmetic, exam cutoffs, clock trust
    store      append-only JSONL event log + rebuildable projection cache
    checkers   bounded deterministic graders (abstain outside scope)
    packets    source/item packets (import, hash, spoiler separation)
    reducer    pure fold: events -> projection (eligibility, evidence, schedule)
    select     next offer without mutating history
    service    the commands the app calls; the only writer
    cli        ``python -m canvas_mcp.core.study --json <cmd>``
"""
