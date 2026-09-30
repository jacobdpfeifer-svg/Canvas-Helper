import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendClassNote, appendGoalCapture, clean, goalsTemplate } from "../scripts/lib/voice/notes.mjs";

const CTX = { day: "2026-09-30", sessionId: "20260930-143052-a3f2" };

describe("clean", () => {
  it("collapses whitespace and newlines so speech can't open a markdown block", () => {
    assert.equal(clean("  a\n\n## b\t c  ", 100), "a ## b c");
  });

  it("caps length with an ellipsis", () => {
    assert.equal(clean("abcdef", 4), "abc…");
  });

  it("tolerates non-strings", () => {
    assert.equal(clean(undefined, 10), "");
  });
});

describe("appendGoalCapture", () => {
  it("starts from the template when there is no file yet", () => {
    const md = appendGoalCapture("", { category: "career", statement: "I want to start a company" }, CTX);
    assert.match(md, /^# Goals & priorities/);
    assert.match(md, /Updated: 2026-09-30/);
    assert.match(
      md,
      /## Raw captures[\s\S]*- \*\*2026-09-30\*\* \[career\] I want to start a company _\(voice 20260930-143052-a3f2\)_/,
    );
  });

  it("appends newest last inside Raw captures, before ## Distilled", () => {
    let md = goalsTemplate("2026-09-01");
    md = appendGoalCapture(md, { category: "career", statement: "first" }, CTX);
    md = appendGoalCapture(
      md,
      { category: "value", statement: "second", why: "freedom", horizon: "career" },
      CTX,
    );
    const raw = md.slice(md.indexOf("## Raw captures"), md.indexOf("## Distilled"));
    assert.ok(raw.indexOf("first") < raw.indexOf("second"));
    assert.match(raw, /\[value · career\] second — why: freedom/);
    assert.doesNotMatch(md.slice(md.indexOf("## Distilled")), /second/);
  });

  it("omits the horizon tag when unspecified", () => {
    const md = appendGoalCapture("", { category: "skill", statement: "x", horizon: "unspecified" }, CTX);
    assert.match(md, /\[skill\] x/);
  });

  it("creates Raw captures if the student removed the section", () => {
    const md = appendGoalCapture("# Goals\n\nUpdated: 2026-09-01\n", { category: "career", statement: "x" }, CTX);
    assert.match(md, /## Raw captures\n\n- \*\*2026-09-30\*\* \[career\] x/);
  });
});

describe("appendClassNote", () => {
  const COURSE = `# CSCI1200

## Class notes

Agent-written from chat study notes (not Canvas truth).

- **2026-09-09** — lists

## Instructor profile

### Mastery (self-reported)

- **2026-09-01** — old gap

### Policy pages (synced)

- none
`;

  it("appends into Class notes before the next section", () => {
    const { md } = appendClassNote(COURSE, { note: "loops click now" }, CTX);
    assert.match(md, /lists\n- \*\*2026-09-30\*\* — loops click now \(voice: 20260930-143052-a3f2\)\n\n## Instructor profile/);
  });

  it("adds a mastery gap under the self-reported heading", () => {
    const { md, masteryAdded } = appendClassNote(COURSE, { note: "n", gap: "slicing" }, CTX);
    assert.equal(masteryAdded, true);
    assert.match(md, /old gap\n- \*\*2026-09-30\*\* — slicing\n\n### Policy pages/);
  });

  it("keeps the gap inside the note when the course has no mastery section", () => {
    const { md, masteryAdded } = appendClassNote("# X\n\n## Class notes\n\n- a\n", { note: "n", gap: "recursion" }, CTX);
    assert.equal(masteryAdded, false);
    assert.match(md, /n Mastery gap: recursion/);
  });

  it("creates a Class notes section when missing", () => {
    const { md } = appendClassNote("# X\n\nbody\n", { note: "n" }, CTX);
    assert.match(md, /## Class notes\n\nAgent-written[^\n]*\n\n- \*\*2026-09-30\*\* — n/);
  });
});
