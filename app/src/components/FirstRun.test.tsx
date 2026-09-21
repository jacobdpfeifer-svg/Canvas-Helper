import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FirstRun } from "./FirstRun";

vi.mock("../ipc", () => ({
  checkCanvasSession: vi.fn().mockResolvedValue(false),
  openCanvasSso: vi.fn(),
  saveOnboarding: vi.fn().mockResolvedValue(undefined),
  bootstrapCanvasSync: vi.fn(),
  syncCanvas: vi.fn().mockResolvedValue({ ok: true }),
  syncStudySourcesIpc: vi.fn().mockResolvedValue({ ok: true }),
  onStudySyncProgress: vi.fn().mockResolvedValue(() => undefined),
}));

import { openCanvasSso, syncStudySourcesIpc } from "../ipc";

describe("FirstRun", () => {
  it("gates Continue on Accept and opens the terms sheet", async () => {
    const user = userEvent.setup();
    render(<FirstRun onDone={() => undefined} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "View terms" }));
    expect(screen.getByRole("dialog", { name: "Terms" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Accept terms" }));
    expect(screen.getByRole("button", { name: "Accept terms" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("keeps the student on Connect Canvas after a failed sign-in", async () => {
    vi.mocked(openCanvasSso).mockRejectedValueOnce(new Error("Login window closed or no session found."));
    const user = userEvent.setup();
    render(<FirstRun onDone={() => undefined} />);
    await user.click(screen.getByRole("button", { name: "Accept terms" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Connect Canvas" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign in to Canvas" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Login window closed|no session/i);
    expect(screen.getByRole("heading", { name: "Connect Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip for now" })).not.toBeInTheDocument();
  });

  it("renders syncing course cards from progress events", async () => {
    vi.mocked(syncStudySourcesIpc).mockImplementation(() => new Promise(() => undefined));
    render(
      <FirstRun
        startStep="sync"
        onDone={() => undefined}
        progressCourses={[{ id: "1300", label: "MATH 1300", color: "#2E86AB", assignments: 12, quizzes: 2, exam_count: 1 }]}
      />
    );
    expect(await screen.findByRole("heading", { name: "Syncing" })).toBeInTheDocument();
    expect(screen.getByText("MATH 1300")).toBeInTheDocument();
    expect(screen.getByText(/12 assignments/)).toBeInTheDocument();
  });
});
