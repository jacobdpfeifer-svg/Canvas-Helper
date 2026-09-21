import test from "node:test";
import assert from "node:assert/strict";
import {
  COURSE_PALETTE,
  applyWeightShares,
  classifyItem,
  courseColor,
  courseLabel,
  courseRecord,
  examCandidates,
  inferTerm,
  pageSource,
} from "../scripts/lib/study-sources.mjs";
import { uiRound1CourseRecords } from "../scripts/lib/ui-round1-fixtures.mjs";

test("course record strips html, clips long text, and infers exam candidates", () => {
  const course = { id: 42, name: "Calculus 1", course_code: "MATH 1300", syllabus_body: "<p>Chain rule &amp; product rule</p>" };
  const pages = [{ page_id: 7, url: "chain-rule", title: "Chain rule", body: "<h2>Rule</h2><p>y' = f'(g(x))g'(x)</p>", updated_at: "2026-09-01T00:00:00Z" }];
  const assignments = [
    { id: 1, name: "Midterm 1", due_at: "2026-09-28T15:00:00Z", description: "<p>Covers chain rule</p>", points_possible: 100 },
    { id: 2, name: "Homework 3", due_at: "2026-09-20T05:59:00Z", description: "" },
  ];
  const quizzes = [{ id: 9, title: "Quiz 2", due_at: "2026-09-22T05:59:00Z", quiz_type: "assignment" }];
  const record = courseRecord({ course, pages, assignments, quizzes, fetchedAt: "2026-09-18T00:00:00Z" });
  assert.equal(record.schema, 2);
  assert.equal(record.course.label, "MATH 1300 — Calculus 1");
  assert.ok(COURSE_PALETTE.includes(record.course.color));
  assert.deepEqual(record.sources.map((s) => s.kind), ["syllabus", "page", "assignment"]);
  assert.equal(record.sources[0].text, "Chain rule & product rule");
  assert.match(record.sources[1].text, /y' = f'\(g\(x\)\)g'\(x\)/);
  assert.equal(record.sources[2].id, "assignment-1");
  assert.deepEqual(record.exams.map((e) => e.label), ["Midterm 1", "Quiz 2"]);
  assert.ok(record.exams.every((e) => e.inferred));
  const midterm = record.items.find((i) => i.title === "Midterm 1");
  assert.equal(midterm.kind, "exam");
  const quiz = record.items.find((i) => i.title === "Quiz 2");
  assert.equal(quiz.kind, "quiz");
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

test("kind classification: low-point quiz is still a quiz; exams vs discussion", () => {
  assert.equal(classifyItem({ name: "Quiz 0.5", points_possible: 1, is_quiz_assignment: true }), "quiz");
  assert.equal(classifyItem({ name: "Final exam", points_possible: 5 }), "exam");
  assert.equal(classifyItem({ name: "Week 2 thread", submission_types: ["discussion_topic"] }), "discussion");
  assert.equal(classifyItem({ name: "Homework 3", points_possible: 10 }), "assignment");
});

test("group-weighted share uses group_weight × points / group total", () => {
  const items = applyWeightShares(
    [
      { title: "HW1", points_possible: 10, assignment_group_id: "hw", group_weight: 20 },
      { title: "HW2", points_possible: 10, assignment_group_id: "hw", group_weight: 20 },
      { title: "Exam", points_possible: 100, assignment_group_id: "ex", group_weight: 80 },
    ],
    { useGroupWeights: true },
  );
  const hw = items.find((i) => i.title === "HW1");
  const exam = items.find((i) => i.title === "Exam");
  assert.equal(hw.weight_share, 0.2 * (10 / 20));
  assert.equal(exam.weight_share, 0.8);
});

test("unweighted share is points / course total; zero-point items get 0", () => {
  const items = applyWeightShares([
    { title: "A", points_possible: 10, group_weight: null },
    { title: "B", points_possible: 30, group_weight: null },
    { title: "C", points_possible: 0, group_weight: null },
  ]);
  assert.equal(items[0].weight_share, 0.25);
  assert.equal(items[1].weight_share, 0.75);
  assert.equal(items[2].weight_share, 0);
});

test("term inference falls back to first/last due ± 7 days", () => {
  const inferred = inferTerm({}, [
    { due_at: "2026-09-10T00:00:00Z" },
    { due_at: "2026-10-10T00:00:00Z" },
  ]);
  assert.equal(inferred.source, "inferred");
  assert.equal(inferred.start_at, "2026-09-03T00:00:00.000Z");
  assert.equal(inferred.end_at, "2026-10-17T00:00:00.000Z");
  const canvas = inferTerm({ start_at: "2026-08-24T00:00:00Z", end_at: "2026-12-18T00:00:00Z" }, []);
  assert.equal(canvas.source, "canvas");
});

test("course color is deterministic and from the palette", () => {
  assert.equal(courseColor("1300"), courseColor("1300"));
  assert.notEqual(courseColor("1300"), courseColor("1110"));
  assert.ok(COURSE_PALETTE.includes(courseColor("1300")));
});

test("ui-round1 fixture: 4 courses, 40 assignments, 6 quizzes, 3 exams, term variants", () => {
  const records = uiRound1CourseRecords();
  assert.equal(records.length, 4);
  const items = records.flatMap((r) => r.items);
  const assignments = items.filter((i) => i.kind === "assignment");
  const quizzes = items.filter((i) => i.kind === "quiz");
  const exams = items.filter((i) => i.kind === "exam");
  assert.ok(assignments.length >= 40);
  assert.equal(quizzes.length, 6);
  assert.equal(exams.length, 3);
  const phys = records.find((r) => r.course.id === "1110");
  assert.equal(phys.term.source, "inferred");
  const math = records.find((r) => r.course.id === "1300");
  assert.equal(math.term.source, "canvas");
  const examShare = math.items.find((i) => i.kind === "exam").weight_share;
  const hwShare = math.items.find((i) => i.title === "Homework 1").weight_share;
  assert.ok(examShare > hwShare);
  const engl = records.find((r) => r.course.id === "1001");
  assert.ok(engl.items.some((i) => i.group_weight === 70));
});
