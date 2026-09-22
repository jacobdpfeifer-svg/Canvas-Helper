import type { SemesterSurface, SyncHealth } from "../ipc";

/**
 * Browser-only preview data. Active only in a Vite DEV build, outside Tauri,
 * when the page URL carries `?fixture=1`. Never reachable from the shipped app.
 */
export function fixtureEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("fixture");
}

const TODAY = "2026-09-22T16:00:00Z";

function iso(daysFromToday: number, hour = 16): string {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function fixtureSemester(range: string): SemesterSurface {
  const spanDays = range === "full" ? 120 : range === "3m" ? 90 : range === "2m" ? 60 : 30;
  const tick = (
    id: string,
    course_id: string,
    course_label: string,
    color: string,
    title: string,
    kind: string,
    day: number,
    points: number,
    weight: number,
    completed = false
  ) => ({
    id,
    course_id,
    course_label,
    color,
    title,
    kind,
    due_at: iso(day),
    points_possible: points,
    weight_share: weight,
    html_url: `https://canvas.example/${id}`,
    completed,
    description: `${title} — covers the last two weeks of lecture.`,
  });
  const term = { start_at: iso(-30), end_at: iso(90), source: "canvas" };
  return {
    range,
    window_start: iso(-7),
    window_end: iso(spanDays - 7),
    today: TODAY,
    courses: [
      {
        id: "1300",
        label: "MATH 1300",
        code: "MATH 1300",
        name: "Calculus 1",
        color: "#2E86AB",
        term,
        counts: { assignments: 3, quizzes: 1, exams: 1 },
        ticks: [
          tick("m-hw3", "1300", "MATH 1300", "#2E86AB", "Homework 3", "assignment", -3, 10, 0.03, true),
          tick("m-hw4", "1300", "MATH 1300", "#2E86AB", "Homework 4 — chain rule", "assignment", 2, 10, 0.03),
          tick("m-q2", "1300", "MATH 1300", "#2E86AB", "Quiz 2", "quiz", 6, 20, 0.05),
          tick("m-mid", "1300", "MATH 1300", "#2E86AB", "Midterm 1", "exam", 23, 100, 0.25),
        ],
      },
      {
        id: "1300c",
        label: "CSCI 1300",
        code: "CSCI 1300",
        name: "Starting Computing",
        color: "#E1AD49",
        term,
        counts: { assignments: 2, quizzes: 0, exams: 1 },
        ticks: [
          tick("c-p2", "1300c", "CSCI 1300", "#E1AD49", "Project 2 — recursion", "assignment", 4, 50, 0.1),
          tick("c-lab", "1300c", "CSCI 1300", "#E1AD49", "Lab 5", "assignment", 9, 10, 0.02),
          tick("c-ex", "1300c", "CSCI 1300", "#E1AD49", "Exam 1", "exam", 30, 100, 0.2),
        ],
      },
      {
        id: "1010",
        label: "WRTG 1150",
        code: "WRTG 1150",
        name: "First-Year Writing",
        color: "#FF604D",
        term: { ...term, source: "inferred" },
        counts: { assignments: 1, quizzes: 0, exams: 0 },
        ticks: [tick("w-d1", "1010", "WRTG 1150", "#FF604D", "Draft 1 — position essay", "assignment", 12, 100, 0.2)],
      },
    ],
  };
}

export function fixtureHealth(): SyncHealth {
  return { state: "fresh_complete", surfaces_enabled: true, sync_id: "fixture", as_of: TODAY };
}
