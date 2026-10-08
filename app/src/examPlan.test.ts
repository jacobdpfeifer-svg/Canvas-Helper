import { describe, expect, it } from "vitest";
import { buildExamPlan } from "./examPlan";
import { tickHeightPx, clusterTicks } from "./semesterTicks";

describe("buildExamPlan", () => {
  it("is deterministic for a seed and reshuffles when the seed changes", () => {
    const exam = { id: "ex", title: "Midterm 1", due_at: "2026-09-27T00:00:00Z", course_label: "MATH" };
    const sources = [{ title: "Exam 1 study guide", scope_topics: ["Chain", "Product", "Related rates"], exam_relevant: true }];
    const today = new Date("2026-09-20T00:00:00Z");
    const a = buildExamPlan(exam, sources, today, 1);
    const b = buildExamPlan(exam, sources, today, 1);
    const c = buildExamPlan(exam, sources, today, 2);
    expect(a.days).toEqual(b.days);
    expect(a.days.at(-1)?.mode).toBe("review");
    expect(c.days.map((d) => d.topics.join())).not.toEqual(a.days.map((d) => d.topics.join()));
  });

  it("uses the local timezone and stops before the exam start", () => {
    const plan = buildExamPlan(
      { id: "ex", title: "Exam 2", starts_at: "2026-10-08T00:45:00Z", ends_at: "2026-10-08T02:15:00Z", timezone: "America/Denver", confidence: "high" },
      [{ title: "Exam Information", exam_relevant: true, scope_topics: ["Integration"] }],
      new Date("2026-10-07T18:00:00Z"),
      1,
      "America/Denver",
    );
    expect(plan.days.map((d) => d.date)).toEqual(["2026-10-07"]);
    expect(plan.cutoffAt).toBe("2026-10-08T00:45:00Z");
    expect(plan.scopeConfidence).toBe("high");
  });
});

describe("tick heights", () => {
  it("maps weight monotonically with a floor and exam bonus", () => {
    const small = tickHeightPx({ kind: "assignment", weight_share: 0.01 });
    const big = tickHeightPx({ kind: "assignment", weight_share: 0.4 });
    const exam = tickHeightPx({ kind: "exam", weight_share: 0.01 });
    expect(small).toBeGreaterThanOrEqual(12);
    expect(big).toBeGreaterThan(small);
    expect(exam).toBeGreaterThan(small);
  });

  it("clusters overlapping small ticks", () => {
    const ticks = [
      { id: "a", due_at: "2026-09-21T00:00:00Z", kind: "assignment", weight_share: 0.01 },
      { id: "b", due_at: "2026-09-21T01:00:00Z", kind: "assignment", weight_share: 0.01 },
    ];
    const clusters = clusterTicks(ticks as never, "2026-09-20T00:00:00Z", "2026-10-20T00:00:00Z", 400, 40);
    expect(clusters.length).toBe(1);
    expect(clusters[0].ticks.length).toBe(2);
  });
});
