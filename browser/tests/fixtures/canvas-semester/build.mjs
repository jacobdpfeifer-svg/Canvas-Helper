/**
 * Synthetic Canvas payloads for the semester line (no real student data).
 * Four Fall-2026 courses: weighted groups (CSCI 2270), unweighted points
 * (MATH 2300), a course with no term dates (PHYS 1110 → inferred window), and
 * a small writing course (WRTG 3030) with discussions. Totals: ~40
 * assignments, 6 quizzes, 3 exams. Deterministic — safe to snapshot.
 */
const TERM = { id: 1, name: "Fall 2026", start_at: "2026-08-24T06:00:00Z", end_at: "2026-12-18T06:59:59Z" };
const BASE = "https://canvas.example.edu";

function due(month, day, hour = 5, minute = 59) {
  return new Date(Date.UTC(2026, month - 1, day, hour, minute)).toISOString();
}

let nextId = 1000;
function assignment(courseId, groupId, name, dueAt, points, extra = {}) {
  const id = nextId++;
  return {
    id,
    name,
    due_at: dueAt,
    points_possible: points,
    assignment_group_id: groupId,
    html_url: `${BASE}/courses/${courseId}/assignments/${id}`,
    submission_types: extra.submission_types || ["online_upload"],
    description: extra.description || "",
    published: true,
    ...extra,
  };
}

function quiz(courseId, title, dueAt, points, quizType = "assignment", extra = {}) {
  const id = nextId++;
  return { id, title, due_at: dueAt, points_possible: points, quiz_type: quizType, html_url: `${BASE}/courses/${courseId}/quizzes/${id}`, published: true, ...extra };
}

export function buildFixture() {
  // --- CSCI 2270: weighted groups ---------------------------------------
  const csci = {
    id: 3101,
    name: "Data Structures",
    course_code: "CSCI 2270",
    term: TERM,
    start_at: null,
    end_at: null,
    syllabus_body: "<h2>Data Structures</h2><p>Weekly homework 30%, labs 10%, two midterms 30%, final 30%. Topics: arrays and linked lists, stacks and queues, trees, hashing, graphs.</p>",
  };
  const csciGroups = [
    { id: 11, name: "Homework", group_weight: 30 },
    { id: 12, name: "Labs", group_weight: 10 },
    { id: 13, name: "Midterms", group_weight: 30 },
    { id: 14, name: "Final", group_weight: 30 },
    { id: 15, name: "Participation", group_weight: 0 },
  ];
  const csciAssignments = [];
  for (let w = 1; w <= 10; w++) {
    csciAssignments.push(assignment(3101, 11, `Homework ${w}`, due(w <= 6 ? 9 : 10, w <= 6 ? 4 + (w - 1) * 7 : 9 + (w - 7) * 7), 20, { description: w === 3 ? "<p>Implement a linked list with insert, delete and reverse.</p>" : "" }));
  }
  for (let l = 1; l <= 8; l++) {
    csciAssignments.push(assignment(3101, 12, `Lab ${l}`, due(l <= 5 ? 9 : 10, l <= 5 ? 8 + (l - 1) * 7 : 13 + (l - 6) * 7), 5));
  }
  csciAssignments.push(
    assignment(3101, 13, "Midterm 1", due(10, 2, 15, 0), 100, { submission_types: ["on_paper"], description: "<p>Covers arrays, linked lists, stacks, queues and recursion (Weeks 1–5).</p>" }),
    assignment(3101, 13, "Midterm 2", due(11, 6, 15, 0), 100, { submission_types: ["on_paper"], description: "<p>Covers trees, BSTs, heaps and hashing.</p>" }),
    assignment(3101, 14, "Final Exam", due(12, 15, 16, 0), 150, { submission_types: ["on_paper"], description: "<p>Cumulative; graphs weighted heavily.</p>" }),
    assignment(3101, 15, "Syllabus acknowledgement", due(8, 28), 0, { submission_types: ["none"] })
  );
  const csciQuizzes = [quiz(3101, "Recursion warm-up quiz", due(9, 12), 10, "practice_quiz"), quiz(3101, "Quiz 1: Big-O", due(9, 19), 15)];
  const csciPages = [
    { page_id: 501, url: "week-3-linked-lists", title: "Week 3 — Linked lists", body: "<p>Singly vs doubly linked lists; sentinel nodes; O(1) insert at head.</p>", html_url: `${BASE}/courses/3101/pages/week-3-linked-lists`, updated_at: "2026-09-10T00:00:00Z" },
    { page_id: 502, url: "week-5-recursion", title: "Week 5 — Recursion", body: "<p>Base case, recursive case, call stack depth.</p>", html_url: `${BASE}/courses/3101/pages/week-5-recursion`, updated_at: "2026-09-16T00:00:00Z" },
    { page_id: 503, url: "week-7-trees", title: "Week 7 — Trees", body: "<p>Binary trees, traversal orders, BST invariants.</p>", html_url: `${BASE}/courses/3101/pages/week-7-trees`, updated_at: "2026-09-17T00:00:00Z" },
  ];

  // --- MATH 2300: unweighted (total points) ------------------------------
  const math = {
    id: 3102,
    name: "Calculus 2",
    course_code: "MATH 2300",
    term: TERM,
    start_at: "2026-08-24T06:00:00Z",
    end_at: "2026-12-11T06:59:59Z",
    syllabus_body: "<p>Integration techniques, sequences and series, Taylor polynomials, parametric equations.</p>",
  };
  const mathGroups = [{ id: 21, name: "Assignments", group_weight: 0 }];
  const mathAssignments = [];
  for (let w = 1; w <= 12; w++) {
    mathAssignments.push(assignment(3102, 21, `WebAssign set ${w}`, due(w <= 5 ? 9 : w <= 9 ? 10 : 11, w <= 5 ? 6 + (w - 1) * 7 : w <= 9 ? 4 + (w - 6) * 7 : 1 + (w - 10) * 7), 10, { submission_types: ["external_tool"] }));
  }
  mathAssignments.push(
    assignment(3102, 21, "Exam 1", due(9, 30, 1, 0), 100, { submission_types: ["on_paper"], description: "<p>Integration by parts, trig substitution, partial fractions.</p>" }),
    assignment(3102, 21, "Exam 2", due(11, 4, 1, 0), 100, { submission_types: ["on_paper"] })
  );
  const mathQuizzes = [quiz(3102, "Quiz 3", due(9, 25), 20), quiz(3102, "Quiz 4", due(10, 16), 20), quiz(3102, "Quiz 5", due(11, 13), 20)];

  // --- PHYS 1110: no term dates at all -----------------------------------
  const phys = { id: 3103, name: "General Physics 1", course_code: "PHYS 1110", term: { id: 2, name: "Default Term", start_at: null, end_at: null }, start_at: null, end_at: null, syllabus_body: "" };
  const physGroups = [
    { id: 31, name: "Homework", group_weight: 40 },
    { id: 32, name: "Exams", group_weight: 60 },
  ];
  const physAssignments = [];
  for (let w = 1; w <= 6; w++) {
    physAssignments.push(assignment(3103, 31, `Problem set ${w}`, due(w <= 3 ? 9 : 10, w <= 3 ? 10 + (w - 1) * 14 : 8 + (w - 4) * 14), 25, { submission_types: ["online_upload"], submission: w <= 1 ? { submitted_at: "2026-09-09T20:00:00Z", workflow_state: "graded", score: 23 } : null }));
  }
  physAssignments.push(assignment(3103, 32, "Midterm", due(10, 21, 14, 0), 100, { submission_types: ["on_paper"] }));
  const physQuizzes = [quiz(3103, "Kinematics check", due(9, 22), 5)];

  // --- WRTG 3030: discussions + one ungraded item -------------------------
  const wrtg = { id: 3104, name: "Writing on Science and Society", course_code: "WRTG 3030", term: TERM, start_at: null, end_at: null, syllabus_body: "<p>Weekly discussions, two essays, portfolio.</p>" };
  const wrtgGroups = [{ id: 41, name: "Coursework", group_weight: 0 }];
  const wrtgAssignments = [];
  for (let w = 1; w <= 8; w++) {
    wrtgAssignments.push(assignment(3104, 41, `Discussion ${w}`, due(w <= 4 ? 9 : 10, w <= 4 ? 5 + (w - 1) * 7 : 3 + (w - 5) * 7), 5, { submission_types: ["discussion_topic"] }));
  }
  wrtgAssignments.push(
    assignment(3104, 41, "Essay 1", due(10, 10), 100, { submission_types: ["online_text_entry"] }),
    assignment(3104, 41, "Essay 2", due(11, 20), 100, { submission_types: ["online_text_entry"] }),
    assignment(3104, 41, "Peer review sign-up", due(9, 24), 0, { submission_types: ["none"] })
  );

  return [
    { course: csci, groups: csciGroups, assignments: csciAssignments, quizzes: csciQuizzes, pages: csciPages },
    { course: math, groups: mathGroups, assignments: mathAssignments, quizzes: mathQuizzes, pages: [] },
    { course: phys, groups: physGroups, assignments: physAssignments, quizzes: physQuizzes, pages: [] },
    { course: wrtg, groups: wrtgGroups, assignments: wrtgAssignments, quizzes: [], pages: [] },
  ];
}
