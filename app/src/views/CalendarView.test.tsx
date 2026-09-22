import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalendarView } from "./CalendarView";

const addCalendarEvent = vi.fn();
const readCalendarSurface = vi.fn();

vi.mock("../ipc", () => ({
  addCalendarEvent: (...args: unknown[]) => addCalendarEvent(...args),
  readCalendarSurface: (...args: unknown[]) => readCalendarSurface(...args),
  dismissCalendarSuggestion: vi.fn(),
  setCommitment: vi.fn(),
  resolveCommitment: vi.fn(),
}));

describe("CalendarView", () => {
  it("loads the surface with a single IPC and writes a local event", async () => {
    readCalendarSurface.mockResolvedValue({
      events: [],
      canvas_events: [
        {
          id: "t|1300|assignment|101",
          kind: "canvas-due",
          title: "Homework 1",
          start: "2026-09-22T16:00:00Z",
          end: "2026-09-22T16:00:00Z",
        },
      ],
      suggestions: [],
      commitment: { commitment: null, check_in: null, line: "" },
      sync_health: { state: "fresh_complete", sync_id: "sync-a", as_of: "2026-09-21T18:00:00Z" },
    });
    addCalendarEvent.mockImplementation(async (ev: { title: string }) => ({
      id: "cal-1",
      kind: "study",
      title: ev.title,
      start: "2026-09-21T18:00:00Z",
      end: "2026-09-21T19:00:00Z",
    }));
    const user = userEvent.setup();
    render(<CalendarView />);
    await screen.findByRole("heading", { name: "Homework 1" });
    expect(readCalendarSurface).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Add to calendar" }));
    await user.type(screen.getByLabelText("Title"), "Chain rule block");
    await user.click(screen.getByRole("button", { name: "Save locally" }));
    expect(addCalendarEvent).toHaveBeenCalledTimes(1);
    expect(addCalendarEvent.mock.calls[0][0].title).toBe("Chain rule block");
    expect(await screen.findByText("Chain rule block")).toBeInTheDocument();
    expect(screen.getByText(/Canvas · Homework 1/)).toBeInTheDocument();
  });
});
