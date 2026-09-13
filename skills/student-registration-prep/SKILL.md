---
name: student-registration-prep
description: Registration readiness checklist, GPA floors reminder, and advisor-meeting prep. Use for "registration", "holds", "preregistration", "prep for advising", scholarship GPA floor checklists.
schema_version: 1
category: canvas_read
model_tier: fast
requires_cloud: false
---

# Registration prep (process help)

Help the student clear **admin blockers** before they register. You do **not** register, add/drop, clear holds, or decide scholarship eligibility — they act in Buff Portal / official offices.

## Instructions

### 1. Read context

- `USER.md` — Program, Academic floors, Advising notes
- Optional: `python -m canvas_mcp.core.gpa --school <slug>` for a local estimate vs floors
- School `policy_links` from `schools/{slug}.yaml` (cite URLs; do not scrape Buff Portal)

### 2. Emit checklist

```markdown
## Registration readiness (process help — you act in Buff Portal)

### Checklist
- [ ] Preregistration / contact info / tuition acknowledgment
- [ ] Holds / to-dos reviewed in Buff Portal
- [ ] Advising appointment if an advising hold applies
- [ ] Cart built with 2–3 backup sections for closed classes
- [ ] Full-time floor (usually ≥12 credits) if aid/scholarship/housing requires it — student verifies terms

### GPA vs your floors (estimate)
…local estimate + USER.md floors only. Never claim scholarship/SAP eligibility.
Confirm with Scholarship Services / Financial Aid / Buff Portal.

### Questions to bring your advisor
…from USER.md Advising notes + this term’s risks (load, timeline, major gates)

### Official links
…from schools/{slug}.yaml policy_links (degree_audit, holds, preregistration, sap, scholarships, advising)
```

### 3. Rules

- No Buff Portal login, scrape, or registration execution
- Scholarship/SAP: student-supplied floors + referral links only
- Point remaining-requirements questions at Buff Portal degree audit (or dated `inbox/degree-audit.md` if present)

## Context

1. Follow [`../_SESSION.md`](../_SESSION.md)
2. `USER.md` Program / Academic floors / Advising notes
3. `schools/{slug}.yaml` `policy_links`

## Tools available

Read only. Optional GPA CLI. No write tools.

## Triggers

- registration
- preregistration
- registration holds
- prep for advising
- advisor meeting
- scholarship GPA
- am I ready to register
