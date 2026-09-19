import test from "node:test";
import assert from "node:assert/strict";
import { courseLabel, courseRecord, examCandidates, pageSource } from "../scripts/lib/study-sources.mjs";

test("course record strips html, clips long text, and infers exam candidates", () => {
  const course = { id: 42, name: "Calculus 1", course_code: "MATH 1300", syllabus_body: "<p>Chain rule &amp; product rule</p>" };
  const pages = [{ page_id: 7, url: "chain-rule", title: "Chain rule", body: "<h2>Rule</h2><p>y' = f'(g(x))g'(x)</p>", updated_at: "2026-09-01T00:00:00Z" }];
  const assignments = [
    { id: 1, name: "Midterm 1", due_at: "2026-09-28T15:00:00Z", description: "<p>Covers chain rule</p>", points_possible: 100 },
    { id: 2, name: "Homework 3", due_at: "2026-09-20T05:59:00Z", description: "" },
  ];
  const quizzes = [{ id: 9, title: "Quiz 2", due_at: "2026-09-22T05:59:00Z", quiz_type: "assignment" }];
  const record = courseRecord({ course, pages, assignments, quizzes, fetchedAt: "2026-09-18T00:00:00Z" });
  assert.equal(record.course.label, "MATH 1300 — Calculus 1");
  assert.deepEqual(record.sources.map((s) => s.kind), ["syllabus", "page", "assignment"]);
  assert.equal(record.sources[0].text, "Chain rule & product rule");
  assert.match(record.sources[1].text, /y' = f'\(g\(x\)\)g'\(x\)/);
  assert.equal(record.sources[2].id, "assignment-1");
  assert.deepEqual(record.exams.map((e) => e.label), ["Midterm 1", "Quiz 2"]);
  assert.ok(record.exams.every((e) => e.inferred));
});

test("empty bodies produce no source and long bodies are clipped", () => {
  assert.equal(pageSource(1, { page_id: 1, url: "x", body: "<p>  </p>" }), null);
  const long = pageSource(1, { page_id: 2, url: "y", body: "a".repeat(70_000) });
  assert.equal(long.text.length, 60_000);
  assert.equal(long.truncated, true);
});

test("exam inference ignores ordinary homework and dedupes quiz rows", () => {
  const rows = examCandidates(3, [{ id: 1, name: "Reading response", due_at: null }], [{ id: 2, title: "Practice quiz", quiz_type: "practice_quiz", due_at: null }]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, "quiz");
  assert.equal(courseLabel({ id: 5 }), "course-5");
});
