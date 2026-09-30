import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { TranscriptRecorder } from "../scripts/lib/voice/transcript.mjs";

const meta = { id: "20260930-143052-a3f2", mode: "goals", model: "m", startedAt: new Date("2026-09-30T20:30:00Z") };

describe("TranscriptRecorder", () => {
  it("joins fragments per speaker and orders Jacob before the interviewer", () => {
    const r = new TranscriptRecorder(meta);
    // model fragments can arrive interleaved with (or before) the user's
    r.addText("model", "So why ");
    r.addText("user", "I want to ");
    r.addText("model", "does that matter?");
    r.addText("user", "start a company.");
    r.flushAll();
    assert.deepEqual(
      r.entries.map((e) => [e.role, e.text]),
      [
        ["user", "I want to start a company."],
        ["model", "So why does that matter?"],
      ],
    );
  });

  it("puts a tool event after the words that triggered it and counts successful captures", () => {
    const r = new TranscriptRecorder(meta);
    r.addText("user", "I care about freedom");
    r.addEvent("saved goal [value]: I care about freedom", { capture: true });
    r.addEvent("tool save_goal failed: nope");
    assert.equal(r.captures, 1);
    assert.deepEqual(
      r.entries.map((e) => e.kind),
      ["turn", "event", "event"],
    );
  });

  it("renders frontmatter, speaker labels, and italic events", () => {
    const r = new TranscriptRecorder({ ...meta, course: "" });
    r.addText("user", "hello");
    r.addEvent("saved goal [career]: x", { capture: true });
    r.addText("model", "hi Jacob");
    const md = r.toMarkdown({ endedAt: new Date("2026-09-30T21:00:00Z") });
    assert.match(md, /^---\nid: 20260930-143052-a3f2\nmode: goals/);
    assert.match(md, /started: 2026-09-30T14:30 MT/);
    assert.match(md, /ended: 2026-09-30T15:00 MT/);
    assert.match(md, /captures: 1\nstatus: raw/);
    assert.match(md, /\*\*Jacob:\*\* hello\n\n_saved goal \[career\]: x_\n\n\*\*Interviewer:\*\* hi Jacob/);
  });

  it("says so when nothing was captured", () => {
    assert.match(new TranscriptRecorder(meta).toMarkdown(), /no speech captured/);
  });

  it("saves atomically to {dir}/{id}.md", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-tr-"));
    try {
      const r = new TranscriptRecorder(meta);
      r.addText("user", "hello");
      const file = r.save(path.join(dir, "sessions"));
      assert.equal(path.basename(file), "20260930-143052-a3f2.md");
      assert.match(fs.readFileSync(file, "utf8"), /\*\*Jacob:\*\* hello/);
      assert.deepEqual(fs.readdirSync(path.join(dir, "sessions")), ["20260930-143052-a3f2.md"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
