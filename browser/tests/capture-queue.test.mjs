import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendCaptureQueueRow,
  parseCaptureQueue,
  updateCaptureQueueRow,
} from "../scripts/lib/capture-queue.mjs";

const SAMPLE = `# Capture queue

Updated: 2026-08-22

| id | captured_at | course_guess | confidence | kind | assignment_match | action | status | local_path | notes |
|----|-------------|--------------|------------|------|------------------|--------|--------|------------|-------|
| 20260822-143052-a3f2 | 2026-08-22T14:30 MT | CSCI1200 | low | whiteboard | Lab 1 | update_course_md | done | inbox/20260822-143052-a3f2.jpg | OCR: loops |
`;

describe("parseCaptureQueue", () => {
  it("parses table rows", () => {
    const rows = parseCaptureQueue(SAMPLE);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, "20260822-143052-a3f2");
    assert.equal(rows[0].course_guess, "CSCI1200");
    assert.equal(rows[0].notes, "OCR: loops");
  });
});

describe("updateCaptureQueueRow", () => {
  it("updates status by id", () => {
    const { content, found } = updateCaptureQueueRow(SAMPLE, "20260822-143052-a3f2", {
      status: "uploaded",
    });
    assert.equal(found, true);
    assert.match(content, /uploaded/);
    assert.doesNotMatch(content, /\| done \| inbox/);
  });
});

describe("appendCaptureQueueRow", () => {
  it("appends a new row", () => {
    const out = appendCaptureQueueRow(SAMPLE, {
      id: "20260822-190015-b7c1",
      captured_at: "2026-08-22T19:00 MT",
      course_guess: "COEN1500",
      confidence: "med",
      kind: "event_selfie",
      assignment_match: "Major Dinner",
      action: "canvas_upload",
      status: "pending_mac",
      local_path: "inbox/20260822-190015-b7c1.jpg",
      notes: "selfie",
    });
    assert.equal(parseCaptureQueue(out).length, 2);
  });
});
