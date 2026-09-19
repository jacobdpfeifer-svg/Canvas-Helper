import { describe, expect, it } from "vitest";
import semester from "../test/fixtures/semester-1m.json";
import type { CourseRow, Tick } from "../ipc";
import { CLUSTER_PX, KIND_FLOOR, TICK_MAX_H, TICK_MIN_H, groupTicks, placeTicks, tickHeight, xFraction } from "./ticks";

describe("tick geometry", () => {
  it("height is monotonic in grade share, floored per kind and capped", () => {
    expect(tickHeight("assignment", 0)).toBe(TICK_MIN_H);
    expect(tickHeight("assignment", 0.01)).toBeGreaterThan(TICK_MIN_H);
    expect(tickHeight("assignment", 0.05)).toBeGreaterThan(tickHeight("assignment", 0.01));
    expect(tickHeight("exam", 0.3)).toBe(TICK_MAX_H);
    expect(tickHeight("exam", 0.9)).toBe(TICK_MAX_H);
    // A 0-point quiz still reads as a quiz; a tiny exam still reads as an exam.
    expect(tickHeight("quiz", 0)).toBe(KIND_FLOOR.quiz);
    expect(tickHeight("exam", 0.001)).toBe(KIND_FLOOR.exam);
    expect(KIND_FLOOR.exam).toBeGreaterThan(KIND_FLOOR.quiz);
  });

  it("maps due instants into the window", () => {
    expect(xFraction("2026-09-11T12:00:00", "2026-09-11", "2026-10-18")).toBeCloseTo(0.013, 2);
    expect(xFraction("2026-10-18T20:00:00", "2026-09-11", "2026-10-18")).toBeCloseTo(0.996, 2);
    expect(xFraction("2020-01-01T00:00:00Z", "2026-09-11", "2026-10-18")).toBe(0);
  });

  it("clusters only small ticks that overlap at the current zoom; exams and quizzes stay separate", () => {
    const course = (semester as { courses: CourseRow[] }).courses.find((c) => c.code === "CSCI 2270")!;
    const wide = groupTicks(placeTicks(course, semester.window.start, semester.window.end, 1400));
    const narrow = groupTicks(placeTicks(course, semester.window.start, semester.window.end, 120));
    expect(wide.filter((g) => g.kind === "cluster").length).toBeLessThanOrEqual(narrow.filter((g) => g.kind === "cluster").length);
    expect(narrow.some((g) => g.kind === "cluster")).toBe(true);
    for (const g of narrow) {
      if (g.kind === "cluster") expect(g.ticks.every((t) => t.kind !== "exam" && t.kind !== "quiz")).toBe(true);
    }
    // Every tick is drawn exactly once.
    const drawn = narrow.flatMap((g) => g.ticks.map((t) => t.id)).sort();
    expect(drawn).toEqual(course.ticks.map((t: Tick) => t.id).sort());
    // Two homework ticks 3px apart cluster; 20px apart do not.
    const mk = (id: string, due: string): Tick => ({ id, course_id: "x", kind: "assignment", title: id, due_at: due, points_possible: 10, weight_share: 0.02, group_name: null, html_url: null, submitted: null, graded: null, score: null, past: false, has_description: false });
    const row: CourseRow = { ...course, ticks: [mk("a", "2026-09-20T00:00:00Z"), mk("b", "2026-09-20T12:00:00Z"), mk("c", "2026-10-01T00:00:00Z")] };
    // 38-day window: half a day is 400/76 ≈ 5.3px (< CLUSTER_PX); 11 days is far.
    const px = 400;
    expect(px / 76).toBeLessThan(CLUSTER_PX);
    const g = groupTicks(placeTicks(row, "2026-09-11", "2026-10-18", px));
    expect(g[0].kind).toBe("cluster");
    expect(g[0].ticks.map((t) => t.id)).toEqual(["a", "b"]);
    expect(g[1].kind).toBe("single");
  });
});
