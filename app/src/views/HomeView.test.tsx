import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeView } from "./HomeView";
import type { SemesterSurface } from "../ipc";

const surface: SemesterSurface = {
  range: "1m",
  window_start: "2026-09-20T00:00:00Z",
  window_end: "2026-10-20T00:00:00Z",
  today: "2026-09-20T00:00:00Z",
  courses: [
    {
      id: "1300",
      label: "MATH 1300",
      code: "MATH 1300",
      name: "Calc",
      color: "#2E86AB",
      term: { start_at: "2026-08-24T00:00:00Z", end_at: "2026-12-18T00:00:00Z", source: "canvas" },
      counts: { assignments: 1, quizzes: 1, exams: 1 },
      ticks: [
        {
          id: "hw",
          course_id: "1300",
          course_label: "MATH 1300",
          color: "#2E86AB",
          title: "Homework 1",
          kind: "assignment",
          due_at: "2026-09-22T16:00:00Z",
          points_possible: 10,
          weight_share: 0.05,
          html_url: "https://canvas.example/hw",
          completed: false,
          description: "hw",
        },
        {
          id: "ex",
          course_id: "1300",
          course_label: "MATH 1300",
          color: "#2E86AB",
          title: "Midterm 1",
          kind: "exam",
          due_at: "2026-10-15T16:00:00Z",
          points_possible: 100,
          weight_share: 0.6,
          html_url: "https://canvas.example/ex",
          completed: false,
          description: "chain rule",
        },
      ],
    },
  ],
};

describe("HomeView", () => {
  it("renders a row per course and taller exam ticks", () => {
    render(<HomeView surface={surface} onExamPrep={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("MATH 1300")).toBeInTheDocument();
    const ticks = screen.getAllByRole("option");
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    const exam = ticks.find((t) => t.getAttribute("aria-label") === "Midterm 1") as HTMLElement;
    const hw = ticks.find((t) => t.getAttribute("aria-label") === "Homework 1") as HTMLElement;
    expect(parseFloat(exam.style.height)).toBeGreaterThan(parseFloat(hw.style.height));
  });

  it("shows hover bubble content and Open in Canvas", async () => {
    const user = userEvent.setup();
    render(<HomeView surface={surface} onExamPrep={() => undefined} />);
    await user.click(screen.getByRole("option", { name: "Homework 1" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Homework 1");
    expect(dialog).toHaveTextContent("MATH 1300");
    expect(within(dialog).getByRole("button", { name: "Open in Canvas" })).toBeInTheDocument();
  });

  it("opens exam prep from the exam popup", async () => {
    const onExamPrep = vi.fn();
    const user = userEvent.setup();
    render(<HomeView surface={surface} onExamPrep={onExamPrep} />);
    await user.click(screen.getByRole("option", { name: "Midterm 1" }));
    await user.click(screen.getByRole("button", { name: "View plan" }));
    expect(onExamPrep).toHaveBeenCalled();
  });

  it("persists the range selector", async () => {
    const user = userEvent.setup();
    render(<HomeView surface={surface} onExamPrep={() => undefined} />);
    await user.click(screen.getByLabelText("Full semester"));
    expect(localStorage.getItem("pn_semester_range")).toBe("full");
  });

  it("shows empty_unverified as a warning, not a quiet empty week", () => {
    render(
      <HomeView
        surface={{ ...surface, courses: [] }}
        health={{ state: "empty_unverified", surfaces_enabled: false, sync_id: null }}
        onExamPrep={() => undefined}
      />
    );
    expect(screen.getByRole("status")).toHaveTextContent(/not an empty week/i);
  });

  it("renders Start here / Learn / Do / Check and grade lead copy", () => {
    render(
      <HomeView
        surface={surface}
        health={{ state: "fresh_complete", surfaces_enabled: true, sync_id: "sync-a", as_of: "2026-09-21T18:00:00Z" }}
        map={{
          fallback_reason: "No published modules found; organized from assignments and syllabus.",
          course: { id: "1300", html_url: "https://canvas.example/courses/1300" },
          start_here: [{ kind: "syllabus", title: "Syllabus", html_url: "https://canvas.example/syllabus" }],
          learn: [],
          do: [{ id: "1", course_id: "1300", canvas_id: "101", title: "Homework 1", submission_state: "unsubmitted" }],
        }}
        grades={{
          lead: {
            canvas_says: 88,
            canvas_letter: "B+",
            unsubmitted_due_count: 2,
            risk: 70,
            why: "Canvas calculates from graded work; risk-adjusted treats currently due unsubmitted items as zero.",
          },
        }}
        onExamPrep={() => undefined}
      />
    );
    expect(screen.getByRole("heading", { name: "Start here" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Learn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Do" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Check" })).toBeInTheDocument();
    expect(screen.getByText(/Canvas says 88/)).toBeInTheDocument();
    expect(screen.getByText(/No published modules found/)).toBeInTheDocument();
  });
});
