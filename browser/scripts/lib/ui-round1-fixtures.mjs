/**
 * Synthetic Canvas payloads for UI round 1: 4 courses, 40 assignments,
 * 6 quizzes, 3 exams; one course without term dates; one with group weights
 * and one without. Pure — no network.
 */
import { courseRecord } from "./study-sources.mjs";

function iso(day) {
  return `2026-${day}T16:00:00Z`;
}

function hw(id, name, due, pts, group, extra = {}) {
  return {
    id,
    name,
    due_at: due,
    points_possible: pts,
    assignment_group_id: group,
    html_url: `https://canvas.example/courses/x/assignments/${id}`,
    submission_types: ["online_upload"],
    description: `<p>${name} practice set.</p>`,
    ...extra,
  };
}

function quiz(id, title, due, pts) {
  return {
    id,
    title,
    due_at: due,
    points_possible: pts,
    quiz_type: "assignment",
    html_url: `https://canvas.example/courses/x/quizzes/${id}`,
    description: `<p>${title} covers recent modules.</p>`,
  };
}

/** 12 homework + 2 quizzes + 1 exam; Canvas term; assignment-group weights. */
function mathCourse() {
  const groups = [
    { id: 1, name: "Homework", group_weight: 20 },
    { id: 2, name: "Quizzes", group_weight: 20 },
    { id: 3, name: "Exams", group_weight: 60 },
  ];
  const assignments = [];
  for (let i = 1; i <= 12; i++) {
    assignments.push(hw(1000 + i, `Homework ${i}`, iso(`08-${String(10 + i).padStart(2, "0")}`), 10, 1));
  }
  assignments.push({
    id: 1101,
    name: "Midterm 1",
    due_at: iso("10-15"),
    points_possible: 100,
    assignment_group_id: 3,
    html_url: "https://canvas.example/courses/1300/assignments/1101",
    submission_types: ["on_paper"],
    description: "<p>Midterm 1 covers chain rule, product rule and related rates.</p>",
  });
  const quizzes = [quiz(2101, "Quiz 1", iso("09-12"), 15), quiz(2102, "Quiz 2", iso("09-26"), 15)];
  return courseRecord({
    course: {
      id: 1300,
      name: "Calculus 1",
      course_code: "MATH 1300",
      start_at: "2026-08-24T06:00:00Z",
      end_at: "2026-12-18T06:00:00Z",
      syllabus_body: "<p>Two midterms and a homework sequence.</p>",
    },
    pages: [{ page_id: 1, url: "chain", title: "Chain rule", body: "<p>y' = f'(g(x)) g'(x)</p>" }],
    assignments,
    quizzes,
    assignmentGroups: groups,
    fetchedAt: "2026-09-20T12:00:00Z",
  });
}

/** 12 homework + 2 quizzes + 1 exam; no term dates (inferred); no group weights. */
function physCourse() {
  const assignments = [];
  for (let i = 1; i <= 12; i++) {
    assignments.push(hw(2000 + i, `Lab writeup ${i}`, iso(`09-${String(Math.min(28, i + 1)).padStart(2, "0")}`), 20, null));
  }
  assignments.push({
    id: 2201,
    name: "Final exam",
    due_at: iso("12-10"),
    points_possible: 200,
    html_url: "https://canvas.example/courses/1110/assignments/2201",
    submission_types: ["on_paper"],
    description: "<p>Cumulative mechanics final: kinematics, forces, energy.</p>",
  });
  const quizzes = [quiz(2301, "Quiz A", iso("10-02"), 10), quiz(2302, "Quiz B", iso("11-06"), 10)];
  return courseRecord({
    course: {
      id: 1110,
      name: "General Physics 1",
      course_code: "PHYS 1110",
      syllabus_body: "<p>Labs plus a cumulative final.</p>",
    },
    pages: [],
    assignments,
    quizzes,
    assignmentGroups: [],
    fetchedAt: "2026-09-20T12:00:00Z",
  });
}

/** 10 homework + 1 quiz + 1 exam; term dates; unweighted. */
function csciCourse() {
  const assignments = [];
  for (let i = 1; i <= 10; i++) {
    assignments.push(hw(3000 + i, `Programming ${i}`, iso(`09-${String(Math.min(28, 4 + i)).padStart(2, "0")}`), 50, null));
  }
  assignments.push({
    id: 3301,
    name: "Exam 1",
    due_at: iso("10-22"),
    points_possible: 100,
    html_url: "https://canvas.example/courses/1300b/assignments/3301",
    submission_types: ["online_quiz"],
    is_quiz_assignment: false,
    description: "<p>Exam 1 covers loops, lists, and file I/O.</p>",
  });
  return courseRecord({
    course: {
      id: 2400,
      name: "Intro to Computing",
      course_code: "CSCI 1300",
      start_at: "2026-08-24T06:00:00Z",
      end_at: "2026-12-18T06:00:00Z",
      syllabus_body: "<p>Weekly programs and one exam.</p>",
    },
    pages: [{ page_id: 9, url: "loops", title: "Loops", body: "<p>for and while</p>" }],
    assignments,
    quizzes: [quiz(3401, "Quiz: strings", iso("09-18"), 5)],
    assignmentGroups: [{ id: 9, name: "All", group_weight: 0 }],
    fetchedAt: "2026-09-20T12:00:00Z",
  });
}

/** 6 homework + 1 quiz; term + group weights; no exam. */
function englCourse() {
  const groups = [
    { id: 4, name: "Writing", group_weight: 70 },
    { id: 5, name: "Quizzes", group_weight: 30 },
  ];
  const assignments = [];
  for (let i = 1; i <= 6; i++) {
    assignments.push(hw(4000 + i, `Essay ${i}`, iso(`10-${String(Math.min(28, i * 4)).padStart(2, "0")}`), 100, 4));
  }
  assignments.push({
    id: 4099,
    name: "Discussion: week 3",
    due_at: iso("09-08"),
    points_possible: 0,
    assignment_group_id: 4,
    html_url: "https://canvas.example/courses/1001/assignments/4099",
    submission_types: ["discussion_topic"],
    description: "",
  });
  return courseRecord({
    course: {
      id: 1001,
      name: "First-Year Writing",
      course_code: "ENGL 1001",
      start_at: "2026-08-24T06:00:00Z",
      end_at: "2026-12-18T06:00:00Z",
      syllabus_body: "<p>Six essays.</p>",
    },
    pages: [],
    assignments,
    quizzes: [quiz(4101, "Quiz: citations", iso("09-20"), 10)],
    assignmentGroups: groups,
    fetchedAt: "2026-09-20T12:00:00Z",
  });
}

export function uiRound1CourseRecords() {
  return [mathCourse(), physCourse(), csciCourse(), englCourse()];
}

/** Study remains schema-2. Reliability UI reads inbox/canvas/projections when present. */
export const UI_ROUND1_STUDY_CONTRACT = 2;
