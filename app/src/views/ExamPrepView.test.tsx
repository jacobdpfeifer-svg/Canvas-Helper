import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExamPrepView } from "./ExamPrepView";
import type { SemesterTick } from "../ipc";

const tick: SemesterTick = {
  id: "ex",
  course_id: "1300",
  course_label: "MATH 1300",
  color: "#2E86AB",
  title: "Midterm 1",
  kind: "exam",
  due_at: "2026-09-28T00:00:00Z",
  points_possible: 100,
  weight_share: 0.5,
  html_url: "https://canvas.example/ex",
  completed: false,
  description: "chain rule",
};

describe("ExamPrepView", () => {
  it("routes to study when practice exists and shows an honest empty state otherwise", async () => {
    const onTest = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <ExamPrepView tick={tick} sources={[{ title: "Chain rule" }]} hasPractice onBack={() => undefined} onTest={onTest} />
    );
    expect(screen.getByRole("heading", { name: "Midterm 1" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Let’s test your knowledge" }));
    expect(onTest).toHaveBeenCalled();
    view.rerender(
      <ExamPrepView tick={tick} sources={[{ title: "Chain rule" }]} hasPractice={false} onBack={() => undefined} onTest={onTest} />
    );
    expect(screen.getByText("No practice items for this exam yet")).toBeInTheDocument();
  });
});
