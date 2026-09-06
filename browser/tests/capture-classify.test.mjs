import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  actionForKind,
  classifyCapture,
  classifyCourseFromOcr,
  detectCaptureKind,
  formatLectureCaptureBullet,
  formatQueueRow,
  makeCaptureId,
  parseUserCourseOverride,
} from "../scripts/lib/capture-classify.mjs";

describe("parseUserCourseOverride", () => {
  it("maps voice shorthand to course codes", () => {
    assert.equal(parseUserCourseOverride("CSCI — intake this whiteboard"), "CSCI1200");
    assert.equal(parseUserCourseOverride("BCOR whiteboard"), "BCOR1030");
    assert.equal(parseUserCourseOverride("COEN major dinner selfie"), "COEN1500");
  });

  it("returns null when no hint", () => {
    assert.equal(parseUserCourseOverride("intake this photo"), null);
  });
});

describe("classifyCourseFromOcr", () => {
  it("reads course codes from OCR text", () => {
    const hit = classifyCourseFromOcr("CSCI 1200 Lab 1 — for loops");
    assert.ok(hit);
    assert.equal(hit.code, "CSCI1200");
    assert.equal(hit.confidence, "high");
  });

  it("uses keyword hints at med confidence", () => {
    const hit = classifyCourseFromOcr("Advocate round 1 peer review");
    assert.ok(hit);
    assert.equal(hit.code, "BCOR1030");
    assert.equal(hit.confidence, "med");
  });
});

describe("detectCaptureKind", () => {
  it("detects common kinds", () => {
    assert.equal(detectCaptureKind("whiteboard notes on loops"), "whiteboard");
    assert.equal(detectCaptureKind("major dinner selfie with table"), "event_selfie");
    assert.equal(detectCaptureKind("Quiz 2 section 800"), "quiz");
  });
});

describe("classifyCapture", () => {
  it("user override wins over OCR", () => {
    const r = classifyCapture({
      userText: "BCOR — handout",
      ocrText: "CSCI 1200 worksheet page 2",
    });
    assert.equal(r.courseGuess, "BCOR1030");
    assert.equal(r.confidence, "high");
    assert.equal(r.kind, "handout");
    assert.equal(r.action, "update_course_md");
    assert.equal(r.status, "done");
  });

  it("unknown course forces needs_review", () => {
    const r = classifyCapture({ ocrText: "random hallway flyer" });
    assert.equal(r.courseGuess, "UNKNOWN");
    assert.equal(r.status, "needs_review");
  });

  it("event selfie routes to pending_mac", () => {
    const r = classifyCapture({
      userText: "COEN dinner selfie",
      ocrText: "engineering connections dinner",
    });
    assert.equal(r.kind, "event_selfie");
    assert.equal(r.action, "canvas_upload");
    assert.equal(r.status, "pending_mac");
    assert.match(r.assignmentMatch, /Major Dinner/i);
  });

  it("caps OCR high confidence when allowHighConfidence false", () => {
    const r = classifyCapture({
      ocrText: "CSCI 1200 Lab 1",
      allowHighConfidence: false,
    });
    assert.equal(r.courseGuess, "CSCI1200");
    assert.equal(r.confidence, "med");
  });
});

describe("formatters", () => {
  it("makeCaptureId matches pattern", () => {
    const id = makeCaptureId(new Date("2026-08-22T20:30:52Z"));
    assert.match(id, /^20260822-\d{6}-[0-9a-f]{4}$/);
  });

  it("formatQueueRow escapes pipes", () => {
    const row = formatQueueRow({
      id: "20260822-143052-a3f2",
      capturedAt: "2026-08-22T14:30 MT",
      courseGuess: "CSCI1200",
      confidence: "low",
      kind: "whiteboard",
      assignmentMatch: "Lab 1",
      action: "update_course_md",
      status: "done",
      localPath: "inbox/20260822-143052-a3f2.jpg",
      notes: "a | b",
    });
    assert.match(row, /a \\| b/);
  });

  it("formatLectureCaptureBullet includes capture id", () => {
    const line = formatLectureCaptureBullet({
      date: "2026-08-22",
      summary: "for-loop syntax",
      captureId: "20260822-143052-a3f2",
    });
    assert.match(line, /capture id: 20260822-143052-a3f2/);
  });
});

describe("actionForKind", () => {
  it("maps quiz to needs_review", () => {
    assert.equal(actionForKind("quiz"), "needs_review");
    assert.equal(actionForKind("whiteboard"), "update_course_md");
  });
});
