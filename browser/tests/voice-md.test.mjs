import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { appendBlock, appendToSection, extractSection, setUpdated } from "../scripts/lib/voice/md.mjs";

const DOC = `# Title

Updated: 2026-09-01

## Class notes

Preamble line.

- **2026-09-01** — first

## Other

body
`;

describe("extractSection", () => {
  it("returns the trimmed body up to the next same-level heading", () => {
    assert.equal(extractSection(DOC, "Class notes"), "Preamble line.\n\n- **2026-09-01** — first");
  });

  it("returns null when the section is absent", () => {
    assert.equal(extractSection(DOC, "Nope"), null);
  });

  it("includes deeper headings and stops at a shallower one", () => {
    const md = "## A\n### sub\nx\n## B\ny\n";
    assert.equal(extractSection(md, "A"), "### sub\nx");
  });

  it("ignores headings inside fenced code", () => {
    const md = "## A\n```\n## not a heading\n```\nstill A\n## B\n";
    assert.match(extractSection(md, "A"), /still A/);
  });
});

describe("appendToSection", () => {
  it("appends after the last non-blank line and keeps the gap before the next heading", () => {
    const out = appendToSection(DOC, "Class notes", 2, "- **2026-09-02** — second");
    assert.match(out, /first\n- \*\*2026-09-02\*\* — second\n\n## Other/);
  });

  it("targets the requested heading level", () => {
    const md = "## A\n### Mastery\n- a\n### Next\nz\n";
    const out = appendToSection(md, "Mastery", 3, "- b");
    assert.equal(out, "## A\n### Mastery\n- a\n- b\n### Next\nz\n");
  });

  it("fills an empty section", () => {
    const out = appendToSection("## A\n\n## B\n", "A", 2, "- x");
    assert.equal(out, "## A\n\n- x\n\n## B\n");
  });

  it("returns null when the section is absent", () => {
    assert.equal(appendToSection(DOC, "Nope", 2, "- x"), null);
  });
});

describe("appendBlock / setUpdated", () => {
  it("separates the block with one blank line and ends with a newline", () => {
    assert.equal(appendBlock("a\n\n\n", "## B\n\nx\n\n"), "a\n\n## B\n\nx\n");
  });

  it("refreshes Updated: only when present", () => {
    assert.match(setUpdated(DOC, "2026-09-30"), /^Updated: 2026-09-30$/m);
    assert.equal(setUpdated("no header", "2026-09-30"), "no header");
  });
});
