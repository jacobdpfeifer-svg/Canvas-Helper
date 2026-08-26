import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findAgentPastedAiRestrictions,
  validateCourseMd,
  validateInstructorProfile,
} from "../scripts/lib/validate-profiles.mjs";

describe("validateInstructorProfile", () => {
  it("flags profile updated without syllabus hash", () => {
    const md = `# TEST — Test

Syllabus hash: (pending sync)

## Instructor profile

Profile updated: 2026-08-22

### Grading and weights

- Weight (inferred)

### Academic integrity

- Honor code (inferred)

### AI policy (Jacob only)

(Jacob fills — agents must not paste syllabus AI rules here)

## Syllabus / agent policy notes

-
`;
    const { issues } = validateInstructorProfile(md, "TEST");
    assert.ok(issues.some((i) => i.includes("Syllabus hash")));
    assert.ok(issues.some((i) => i.includes("(syllabus)-tagged")));
  });

  it("flags (syllabus)-tagged AI restrictions pasted by agent", () => {
    const md = `# TEST — Test

Syllabus hash: abc123

## Instructor profile

Profile updated: 2026-08-22

### Grading and weights

- Weights (syllabus)

### AI policy (Jacob only)

- **Prohibited AI**: generating solutions (syllabus)

## Syllabus / agent policy notes

agent_writes: allow (synced 2026-08-22)
`;
    const { issues } = validateInstructorProfile(md, "TEST");
    assert.ok(issues.some((i) => i.includes("must not paste AI restrictions")));
  });

  it("flags legacy AI and academic integrity with syllabus AI bans", () => {
    const section = `
### AI and academic integrity

- No AI on written work (syllabus)
`;
    const found = findAgentPastedAiRestrictions(section, "TEST");
    assert.ok(found.some((i) => i.includes("AI and academic integrity")));
  });

  it("allows Jacob-filled AI policy without (syllabus) tags", () => {
    const section = `
### AI policy (Jacob only)

- No ChatGPT for APPM written HW — Jacob decision
`;
    assert.deepEqual(findAgentPastedAiRestrictions(section, "TEST"), []);
  });
});

describe("validateCourseMd", () => {
  it("flags inferred Theme when non-stub raw exists for APPM1235", () => {
    // APPM1235 has a real _raw file in the repo — Theme (inferred) should issue
    const md = `# APPM1235 — Test

Syllabus hash: abc

## Theme

(inferred) Something from catalog.

## Instructor profile

Profile updated: 2026-08-22

### Grading and weights

- x (syllabus)

### Confidence and gaps

- Low: need syllabus sync
`;
    const { issues, warnings } = validateCourseMd(md, "APPM1235");
    assert.ok(issues.some((i) => i.includes("Theme is (inferred)")));
    assert.ok(warnings.some((w) => w.includes("Syllabus sources")));
    assert.ok(warnings.some((w) => w.includes("need syllabus")));
  });
});
