/**
 * Four frozen courses for the reliability suite. Pure Canvas-shaped payloads.
 */
const TENANT = "cu-boulder";
const TZ = "America/Denver";
const FETCHED = "2026-09-21T18:00:00.000Z";

function courseBase(id, code, name, extra = {}) {
  return {
    id,
    name,
    course_code: code,
    enrollment_term_id: 1,
    time_zone: TZ,
    start_at: "2026-08-24T06:00:00Z",
    end_at: "2026-12-18T07:00:00Z",
    syllabus_body: extra.syllabus_body ?? `<p>${code} syllabus.</p>`,
    enrollments: [
      {
        type: "student",
        computed_current_score: extra.score ?? 88,
        computed_current_grade: extra.grade ?? "B+",
      },
    ],
    term: { id: 1, name: "Fall 2026", start_at: "2026-08-24T06:00:00Z", end_at: "2026-12-18T07:00:00Z" },
    ...extra,
  };
}

export function wellStructured() {
  const assignments = [
    {
      id: 101,
      name: "Homework 1",
      due_at: "2026-09-22T16:00:00Z",
      points_possible: 10,
      assignment_group_id: 1,
      published: true,
      grading_type: "points",
      html_url: "https://canvas.example/courses/1300/assignments/101",
      submission_types: ["online_upload"],
      all_dates: [{ base: true, due_at: "2026-09-22T16:00:00Z" }],
      submission: { workflow_state: "graded", score: 9, grade: "9", submitted_at: "2026-09-21T12:00:00Z", posted_at: "2026-09-21T13:00:00Z" },
    },
    {
      id: 102,
      name: "Homework 2",
      due_at: "2026-10-01T16:00:00Z",
      points_possible: 10,
      assignment_group_id: 1,
      published: true,
      grading_type: "points",
      html_url: "https://canvas.example/courses/1300/assignments/102",
      submission_types: ["online_upload"],
      all_dates: [{ base: true, due_at: "2026-10-01T16:00:00Z" }],
      submission: { workflow_state: "unsubmitted", score: null, submitted_at: null },
    },
    {
      id: 201,
      name: "Midterm 1",
      due_at: "2026-10-15T16:00:00Z",
      points_possible: 100,
      assignment_group_id: 2,
      published: true,
      grading_type: "points",
      html_url: "https://canvas.example/courses/1300/assignments/201",
      submission_types: ["on_paper"],
      all_dates: [{ base: true, due_at: "2026-10-15T16:00:00Z" }],
      submission: { workflow_state: "unsubmitted" },
    },
  ];
  return {
    id: "well-structured",
    course: courseBase(1300, "MATH 1300", "Calculus 1"),
    assignmentGroups: [
      { id: 1, name: "Homework", group_weight: 20, rules: { drop_lowest: 0, drop_highest: 0, never_drop: [] } },
      { id: 2, name: "Exams", group_weight: 80, rules: { drop_lowest: 0, drop_highest: 0, never_drop: [] } },
    ],
    assignments,
    submissions: assignments.map((a) => ({ ...a.submission, assignment_id: a.id, id: a.id * 10 })),
    modules: [
      {
        id: 9,
        name: "Week 1",
        position: 1,
        published: true,
        items: [
          { id: 91, title: "Start here", type: "Page", position: 1, indent: 0, published: true, html_url: "https://canvas.example/courses/1300/pages/start", content_id: 5, completion_requirement: null },
          { id: 92, title: "Homework 1", type: "Assignment", content_id: 101, position: 2, indent: 0, published: true, html_url: "https://canvas.example/courses/1300/assignments/101" },
        ],
      },
    ],
    discussions: [],
    quizzes: [{ id: 55, title: "Quiz 1", due_at: "2026-09-26T16:00:00Z", points_possible: 15, assignment_id: null, html_url: "https://canvas.example/courses/1300/quizzes/55" }],
    planner: [
      { plannable_id: 101, plannable_type: "assignment", course_id: 1300, context_code: "course_1300", plannable_date: "2026-09-22T16:00:00Z", html_url: "https://canvas.example/courses/1300/assignments/101", plannable: { id: 101, title: "Homework 1" } },
    ],
    todo: [{ assignment: { id: 102, name: "Homework 2", due_at: "2026-10-01T16:00:00Z", course_id: 1300, html_url: "https://canvas.example/courses/1300/assignments/102", points_possible: 10 } }],
    calendar: [
      { id: 7001, title: "Homework 1", start_at: "2026-09-22T16:00:00Z", assignment: { id: 101 }, context_code: "course_1300", html_url: "https://canvas.example/courses/1300/assignments/101" },
    ],
    pages: [{ page_id: 5, url: "start", title: "Start here", front_page: true, body: "<p>Read chapter 1.</p>" }],
  };
}

export function fragmented() {
  return {
    id: "fragmented",
    course: courseBase(1400, "PHYS 1110", "Physics 1", { syllabus_body: "<p>No modules this term.</p>", score: 72, grade: "C" }),
    assignmentGroups: [],
    assignments: [
      {
        id: 301,
        name: "Lab 1 (WebAssign)",
        due_at: "2026-09-23T16:00:00Z",
        points_possible: 20,
        published: true,
        submission_types: ["external_tool"],
        html_url: "https://canvas.example/courses/1400/assignments/301",
        all_dates: [
          { base: true, due_at: "2026-09-20T16:00:00Z", lock_at: "2026-09-24T16:00:00Z" },
          { base: false, due_at: "2026-09-23T16:00:00Z", id: 88, set_type: "ADHOC" },
        ],
        submission: { workflow_state: "unsubmitted" },
        is_quiz_lti_assignment: true,
        external_tool_tag_attributes: { url: "https://www.webassign.net/login.html" },
      },
      {
        id: 302,
        name: "Untitled drop",
        due_at: null,
        points_possible: 0,
        published: false,
        html_url: "https://canvas.example/courses/1400/assignments/302",
        submission: { workflow_state: "unsubmitted" },
      },
    ],
    submissions: [],
    modules: [
      { id: 1, name: "Unpublished dump", position: 1, published: false, items: [] },
      { id: 2, name: "Also empty", position: 2, published: true, items: [] },
    ],
    discussions: [{ id: 9, title: "Intro", assignment_id: null, html_url: "https://canvas.example/courses/1400/discussion_topics/9" }],
    quizzes: [],
    planner: [
      { plannable_id: 301, plannable_type: "assignment", course_id: 1400, plannable_date: "2026-09-20T16:00:00Z", html_url: "https://canvas.example/courses/1400/assignments/301", plannable: { id: 301, title: "Lab 1 (WebAssign)" } },
      { plannable_id: 301, plannable_type: "assignment", course_id: 1400, plannable_date: "2026-09-23T16:00:00Z", html_url: "https://canvas.example/courses/1400/assignments/301", plannable: { id: 301, title: "Lab 1 (WebAssign)" } },
    ],
    todo: [],
    calendar: [
      { id: 8001, title: "Lab 1 (WebAssign)", start_at: "2026-09-24T16:00:00Z", assignment: { id: 301 }, context_code: "course_1400" },
    ],
    pages: [],
    unkeyed: [{ name: "Mystery flyer", title: "Mystery flyer" }],
  };
}

export function weightedDrops() {
  const assignments = [
    { id: 401, name: "Quiz 1", due_at: "2026-09-10T16:00:00Z", points_possible: 10, assignment_group_id: 11, published: true, grading_type: "points", html_url: "https://canvas.example/courses/1500/assignments/401", submission: { workflow_state: "graded", score: 4, posted_at: "2026-09-11T12:00:00Z" } },
    { id: 402, name: "Quiz 2", due_at: "2026-09-17T16:00:00Z", points_possible: 10, assignment_group_id: 11, published: true, grading_type: "points", html_url: "https://canvas.example/courses/1500/assignments/402", submission: { workflow_state: "graded", score: 10, posted_at: "2026-09-18T12:00:00Z" } },
    { id: 403, name: "Quiz 3 (never drop)", due_at: "2026-09-24T16:00:00Z", points_possible: 10, assignment_group_id: 11, published: true, grading_type: "points", html_url: "https://canvas.example/courses/1500/assignments/403", submission: { workflow_state: "graded", score: 2, posted_at: "2026-09-25T12:00:00Z" } },
    { id: 404, name: "Quiz 4", due_at: "2026-10-01T16:00:00Z", points_possible: 10, assignment_group_id: 11, published: true, grading_type: "points", html_url: "https://canvas.example/courses/1500/assignments/404", submission: { workflow_state: "unsubmitted" } },
    { id: 410, name: "Practice (0 pts)", due_at: "2026-09-12T16:00:00Z", points_possible: 0, assignment_group_id: 11, published: true, grading_type: "not_graded", html_url: "https://canvas.example/courses/1500/assignments/410", submission: { workflow_state: "graded", score: 0 } },
    { id: 501, name: "Essay", due_at: "2026-09-20T16:00:00Z", points_possible: 100, assignment_group_id: 12, published: true, grading_type: "points", html_url: "https://canvas.example/courses/1500/assignments/501", submission: { workflow_state: "graded", score: 90, posted_at: "2026-09-21T12:00:00Z" } },
    { id: 502, name: "Hidden midterm", due_at: "2026-09-15T16:00:00Z", points_possible: 100, assignment_group_id: 12, published: true, grading_type: "points", html_url: "https://canvas.example/courses/1500/assignments/502", submission: { workflow_state: "graded", score: 50, posted_at: null } },
  ];
  return {
    id: "weighted-drops",
    course: courseBase(1500, "WRTG 1150", "First-Year Writing", { score: 91, grade: "A-", syllabus_body: "<p>Weighted quizzes drop lowest except never-drop.</p>" }),
    assignmentGroups: [
      { id: 11, name: "Quizzes", group_weight: 40, rules: { drop_lowest: 1, drop_highest: 0, never_drop: [403] } },
      { id: 12, name: "Papers", group_weight: 70, rules: { drop_lowest: 0, drop_highest: 0, never_drop: [] } },
    ],
    assignments,
    submissions: assignments.map((a) => ({ ...a.submission, assignment_id: a.id, id: a.id })),
    modules: [
      { id: 3, name: "Unit 1", position: 1, published: true, items: [{ id: 31, title: "Essay", type: "Assignment", content_id: 501, position: 1, published: true }] },
    ],
    discussions: [],
    quizzes: [],
    planner: [],
    todo: [],
    calendar: [],
    pages: [],
    closed_grading_period: false,
  };
}

export function partialOutage() {
  return {
    id: "partial-outage",
    course: courseBase(1600, "CSCI 1300", "Intro Programming", { score: null, grade: null }),
    assignmentGroups: [{ id: 21, name: "Work", group_weight: 100, rules: {} }],
    assignments: [
      { id: 601, name: "Project 1", due_at: "2026-09-25T16:00:00Z", points_possible: 50, assignment_group_id: 21, published: true, html_url: "https://canvas.example/courses/1600/assignments/601", submission: { workflow_state: "submitted", submitted_at: "2026-09-20T12:00:00Z", score: null } },
    ],
    submissions: [{ assignment_id: 601, workflow_state: "submitted", submitted_at: "2026-09-20T12:00:00Z" }],
    modules: [],
    discussions: [],
    quizzes: [],
    planner: [],
    todo: [],
    calendar: [],
    pages: [],
    endpointFailures: {
      modules: { ok: false, status: 500, items: [] },
      quizzes: { ok: true, status: 200, items: [], truncated: false },
    },
    truncated: ["assignments"],
  };
}

export function completeFixtureCourses() {
  return [wellStructured(), fragmented(), weightedDrops()];
}

export function allFixtureCourses() {
  return [...completeFixtureCourses(), partialOutage()];
}

export function fixtureGeneration({
  sync_id = "sync-fixture-1",
  complete = true,
  profile_id = "dev",
  finished_at = FETCHED,
  courses = completeFixtureCourses(),
  failed_endpoints = [],
  truncated = [],
} = {}) {
  const mapped = courses.map((c) => ({
    course: c.course,
    assignments: c.assignments,
    "assignment-groups": c.assignmentGroups,
    submissions: c.submissions,
    modules: c.modules,
    discussions: c.discussions,
    quizzes: c.quizzes,
    pages: c.pages,
    endpointFailures: c.endpointFailures || {},
    unkeyed: c.unkeyed || [],
  }));
  const planner = courses.flatMap((c) => c.planner || []);
  const todo = courses.flatMap((c) => c.todo || []);
  const calendar = courses.flatMap((c) => c.calendar || []);
  const named_courses_failed = [];
  for (const c of courses) {
    if (c.endpointFailures && Object.values(c.endpointFailures).some((e) => e && e.ok === false)) {
      named_courses_failed.push(String(c.course.id));
    }
  }
  const pagination = [];
  for (const name of truncated) pagination.push({ endpoint: name, truncated: true });
  const isComplete = complete && !failed_endpoints.length && !named_courses_failed.length && !truncated.length;
  return {
    manifest: {
      schema_version: 1,
      sync_id,
      tenant_id: TENANT,
      profile_id_hash: profile_id,
      started_at: "2026-09-21T17:59:00.000Z",
      finished_at,
      timezone: TZ,
      requested_endpoints: ["courses", "planner", "todo", "calendar", "assignments", "assignment_groups", "modules", "discussions", "quizzes", "submissions"],
      completed_endpoints: ["courses", "planner", "todo", "calendar", "assignments", "assignment_groups", "discussions", "quizzes", "submissions"],
      failed_endpoints,
      named_courses_failed,
      pagination,
      file_hashes: {},
      complete: isComplete,
      usable_partial: !isComplete && mapped.length > 0,
      calendar_window: null,
    },
    courses: mapped,
    global: { planner, todo, "calendar-events": calendar },
    fetched_at: FETCHED,
    timezone: TZ,
    tenant_id: TENANT,
  };
}
