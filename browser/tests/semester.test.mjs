import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  COURSE_PALETTE,
  assignCourseColors,
  buildItems,
  classifyKind,
  computeWeightShares,
  courseColorIndex,
  inferTerm,
} from "../scripts/lib/semester.mjs";
import { courseRecord } from "../scripts/lib/study-sources.mjs";
import { buildFixture } from "./fixtures/canvas-semester/build.mjs";
import { writeSyntheticProfile } from "../scripts/make-synthetic-profile.mjs";

test("kind classification: exams outrank quizzes, discussions and ungraded items are distinct", () => {
  assert.equal(classifyKind({ name: "Final Exam", submission_types: ["online_quiz"] }), "exam");
  assert.equal(classifyKind({ name: "Midterm 1", submission_types: ["on_paper"] }), "exam");
  assert.equal(classifyKind({ name: "Unit test 2" }), "exam");
  assert.equal(classifyKind({ name: "Quiz 3", submission_types: ["online_quiz"] }), "quiz");
  assert.equal(classifyKind({ name: "Reading check", is_quiz_assignment: true }), "quiz");
  assert.equal(classifyKind({ name: "Week 2 discussion", submission_types: ["discussion_topic"], points_possible: 5 }), "discussion");
  assert.equal(classifyKind({ name: "Syllabus acknowledgement", submission_types: ["none"], points_possible: 0 }), "other");
  assert.equal(classifyKind({ name: "Homework 4", submission_types: ["online_upload"], points_possible: 20 }), "assignment");
});

test("weighted courses: share = group weight × item share of group points; zero-weight groups contribute nothing", () => {
  const groups = [
    { id: 1, name: "Homework", group_weight: 40 },
    { id: 2, name: "Exams", group_weight: 60 },
    { id: 3, name: "Participation", group_weight: 0 },
  ];
  const items = [
    { id: "hw1", points_possible: 10, assignment_group_id: "1" },
    { id: "hw2", points_possible: 30, assignment_group_id: "1" },
    { id: "ex1", points_possible: 100, assignment_group_id: "2" },
    { id: "attend", points_possible: 50, assignment_group_id: "3" },
    { id: "none", points_possible: 0, assignment_group_id: "1" },
  ];
  const { uses_group_weights, shares } = computeWeightShares(items, groups);
  assert.equal(uses_group_weights, true);
  assert.ok(Math.abs(shares.get("hw1") - 0.1) < 1e-9); // 0.4 × 10/40
  assert.ok(Math.abs(shares.get("hw2") - 0.3) < 1e-9);
  assert.ok(Math.abs(shares.get("ex1") - 0.6) < 1e-9);
  assert.equal(shares.get("attend"), 0);
  assert.equal(shares.get("none"), 0);
  // Shares of the graded items sum to the whole course grade.
  const sum = [...shares.values()].reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("weighted courses renormalise when a weighted group has no pointed items yet", () => {
  const groups = [
    { id: 1, name: "Homework", group_weight: 50 },
    { id: 2, name: "Final", group_weight: 50 },
  ];
  const items = [{ id: "hw1", points_possible: 10, assignment_group_id: "1" }];
  const { shares } = computeWeightShares(items, groups);
  // The only visible graded item is the whole visible grade.
  assert.ok(Math.abs(shares.get("hw1") - 1) < 1e-9);
});

test("unweighted courses: share = points / total points; ungraded → 0", () => {
  const items = [
    { id: "a", points_possible: 25 },
    { id: "b", points_possible: 75 },
    { id: "c", points_possible: null },
  ];
  const { uses_group_weights, shares, total_points } = computeWeightShares(items, [{ id: 9, group_weight: 0 }]);
  assert.equal(uses_group_weights, false);
  assert.equal(total_points, 100);
  assert.equal(shares.get("a"), 0.25);
  assert.equal(shares.get("b"), 0.75);
  assert.equal(shares.get("c"), 0);
});

test("term inference: Canvas dates win, else due-date window ± 7 days, else none", () => {
  const canvas = inferTerm({ term: { start_at: "2026-08-24T06:00:00Z", end_at: "2026-12-18T06:59:59Z" } }, [{ due_at: "2026-09-01T00:00:00Z" }]);
  assert.equal(canvas.source, "canvas");
  assert.equal(canvas.end_at, "2026-12-18T06:59:59.000Z");
  const override = inferTerm({ end_at: "2026-12-11T06:59:59Z", term: { start_at: "2026-08-24T06:00:00Z", end_at: "2026-12-18T06:59:59Z" } }, []);
  assert.equal(override.end_at, "2026-12-11T06:59:59.000Z");
  const inferred = inferTerm({ term: { start_at: null, end_at: null } }, [{ due_at: "2026-09-10T05:59:00Z" }, { due_at: "2026-11-12T05:59:00Z" }, { due_at: null }]);
  assert.equal(inferred.source, "inferred");
  assert.equal(inferred.start_at, "2026-09-03T05:59:00.000Z");
  assert.equal(inferred.end_at, "2026-11-19T05:59:00.000Z");
  const none = inferTerm({}, [{ due_at: null }]);
  assert.equal(none.source, "none");
  assert.equal(none.start_at, null);
  assert.equal(none.end_at, null);
});

test("course colors are deterministic, distinct across a sync, and drawn from the validated palette", () => {
  assert.equal(courseColorIndex("3101"), courseColorIndex("3101"));
  const map = assignCourseColors(["3104", "3101", "3103", "3102"]);
  const indices = [...map.values()];
  assert.equal(new Set(indices).size, 4);
  for (const idx of indices) assert.ok(idx >= 0 && idx < COURSE_PALETTE.length);
  // Order of input does not change the assignment.
  assert.deepEqual([...assignCourseColors(["3101", "3102", "3103", "3104"]).entries()].sort(), [...map.entries()].sort());
  assert.equal(COURSE_PALETTE.length, 8);
});

test("buildItems copies submission state only when Canvas returned it, and dedupes quiz mirrors", () => {
  const assignments = [
    { id: 1, name: "HW 1", due_at: "2026-09-04T05:59:00Z", points_possible: 20, assignment_group_id: 11, html_url: "https://c/1", submission_types: ["online_upload"], submission: { submitted_at: "2026-09-03T00:00:00Z", workflow_state: "graded", score: 18 } },
    { id: 2, name: "Quiz 1", due_at: "2026-09-05T05:59:00Z", points_possible: 10, assignment_group_id: 11, quiz_id: 77, submission_types: ["online_quiz"] },
    { id: 3, name: "HW 2", due_at: null, points_possible: 20, assignment_group_id: 11 },
  ];
  const quizzes = [
    { id: 77, title: "Quiz 1", due_at: "2026-09-05T05:59:00Z", points_possible: 10, assignment_id: 2 },
    { id: 78, title: "Practice quiz", due_at: "2026-09-02T05:59:00Z", points_possible: 0, quiz_type: "practice_quiz" },
  ];
  const { items } = buildItems(3101, assignments, quizzes, [{ id: 11, name: "All", group_weight: 0 }]);
  assert.deepEqual(items.map((i) => i.id), ["q78", "a1", "a2", "a3"]); // sorted by due; null due last
  const hw1 = items.find((i) => i.id === "a1");
  assert.equal(hw1.submitted, true);
  assert.equal(hw1.graded, true);
  assert.equal(hw1.score, 18);
  const hw2 = items.find((i) => i.id === "a3");
  assert.equal(hw2.submitted, null);
  assert.equal(hw2.graded, null);
  assert.equal(items.filter((i) => i.title === "Quiz 1").length, 1);
  assert.equal(items.find((i) => i.id === "q78").weight_share, 0);
});

test("fixture profile covers the round-1 brief: 4 courses, ≈40 assignments, 6 quizzes, 3 exams, one no-term course, weighted and unweighted", () => {
  const fixture = buildFixture();
  const records = fixture.map((f) => courseRecord({ ...f, syllabus: f.course.syllabus_body, fetchedAt: "2026-09-18T12:00:00Z" }));
  assert.equal(records.length, 4);
  const all = records.flatMap((r) => r.items);
  const count = (kind) => all.filter((i) => i.kind === kind).length;
  assert.ok(count("assignment") >= 36 && count("assignment") <= 44, `assignments=${count("assignment")}`);
  assert.equal(count("quiz"), 6);
  assert.equal(count("exam"), 6); // 3 full exams + 3 midterms all read as "exam" kind
  assert.equal(records.filter((r) => r.term.source === "inferred").length, 1);
  assert.equal(records.filter((r) => r.grading.uses_group_weights).length, 2);
  assert.equal(records.filter((r) => !r.grading.uses_group_weights).length, 2);
  for (const r of records) {
    assert.equal(r.schema, 2);
    assert.ok(r.course.color.light.startsWith("#"));
    const sum = r.items.reduce((a, i) => a + i.weight_share, 0);
    assert.ok(Math.abs(sum - 1) < 1e-4, `${r.course.label} shares sum ${sum}`);
  }
  // Exams are the heaviest ticks in every course that has one.
  for (const r of records) {
    const exams = r.items.filter((i) => i.kind === "exam");
    if (!exams.length) continue;
    const maxExam = Math.max(...exams.map((i) => i.weight_share));
    const maxOther = Math.max(...r.items.filter((i) => i.kind !== "exam").map((i) => i.weight_share));
    assert.ok(maxExam > maxOther, r.course.label);
  }
});

test("writeSyntheticProfile writes schema-2 records, status.json and a suggestions fixture", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pn-synth-"));
  const rows = writeSyntheticProfile(root);
  assert.equal(rows.length, 4);
  const status = JSON.parse(fs.readFileSync(path.join(root, "inbox", "study-sources", "status.json"), "utf8"));
  assert.equal(status.ok, true);
  assert.equal(status.courses.length, 4);
  const lines = fs.readFileSync(path.join(root, "inbox", "calendar-suggestions.jsonl"), "utf8").trim().split("\n");
  assert.equal(lines.length, 2);
  for (const line of lines) {
    const row = JSON.parse(line);
    for (const key of ["source_message_id", "title", "start", "end", "confidence", "why"]) assert.ok(key in row, key);
  }
  fs.rmSync(root, { recursive: true, force: true });
});
