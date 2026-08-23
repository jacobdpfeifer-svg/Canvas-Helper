import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateInstructorProfile } from "../scripts/lib/validate-profiles.mjs";

describe("validateInstructorProfile", () => {
  it("flags profile updated without syllabus hash", () => {
    const md = `# TEST — Test

Syllabus hash: (pending sync)

## Instructor profile

Profile updated: 2026-08-22

### Grading and weights

- Weight (inferred)

### AI and academic integrity

- No AI (inferred)

## Syllabus / agent policy notes

-
`;
    const { issues } = validateInstructorProfile(md, "TEST");
    assert.ok(issues.some((i) => i.includes("Syllabus hash")));
    assert.ok(issues.some((i) => i.includes("(syllabus)-tagged")));
  });

  it("flags AI profile conflict with synced allow", () => {
    const md = `# TEST — Test

Syllabus hash: abc123

## Instructor profile

Profile updated: 2026-08-22

### AI and academic integrity

- No AI on written work (syllabus)

## Syllabus / agent policy notes

agent_writes: allow (synced 2026-08-22)
`;
    const { issues } = validateInstructorProfile(md, "TEST");
    assert.ok(issues.some((i) => i.includes("conflicts")));
  });
});
