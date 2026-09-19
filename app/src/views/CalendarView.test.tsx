import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockIpc } from "../test/mockIpc";

const h = await vi.hoisted(async () => {
  const { makeMockIpc } = await import("../test/mockIpc");
  return { makeMockIpc, current: makeMockIpc() };
});
vi.mock("../ipc", async () => {
  const actual = await vi.importActual<typeof import("../ipc")>("../ipc");
  const out: Record<string, unknown> = { ...actual };
  for (const key of Object.keys(h.current.mod)) {
    out[key] = (...args: unknown[]) => (h.current.mod as unknown as Record<string, (...a: unknown[]) => unknown>)[key](...args);
  }
  return out;
});

import { CalendarView } from "./CalendarView";

let mock: MockIpc;

describe("Calendar tab", () => {
  beforeEach(() => {
    h.current = h.makeMockIpc();
    mock = h.current;
  });

  it("loads the learning surface in ONE IPC and paints the commitment first", async () => {
    render(<CalendarView theme="night" />);
    expect(screen.getByRole("heading", { name: "Calendar", level: 1 })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("One thing you’ll do today")).toBeInTheDocument();
    await waitFor(() => expect(mock.state.planSurfaceReads).toBe(1));
    await screen.findByText("No checks scheduled");
    expect(mock.calls.filter((c) => c === "read_plan_surface")).toHaveLength(1);
    for (const legacy of ["read_due_reviews", "read_brief_streak", "read_learn_progress", "read_evaluation_compare", "read_commitment", "read_check_intention"]) {
      expect(mock.calls).not.toContain(legacy);
    }
  });

  it("Add to calendar is a real button; the sheet writes a local row that appears in the month grid", async () => {
    const user = userEvent.setup();
    render(<CalendarView theme="night" />);
    await screen.findByText("No checks scheduled");
    await user.click(screen.getByRole("button", { name: "Add to calendar" }));
    const dialog = screen.getByRole("dialog", { name: "Add to calendar" });
    await user.click(within(dialog).getByRole("radio", { name: "Study block" }));
    await user.type(within(dialog).getByLabelText("Title"), "Trees review");
    await user.selectOptions(within(dialog).getByLabelText("Course"), "3101");
    const dateInput = within(dialog).getByLabelText("Date") as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, "2026-09-25");
    await user.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(mock.calls).toContain("add_calendar_event"));
    expect(mock.calendar.events[0]).toMatchObject({ kind: "study", title: "Trees review", course_id: "3101", color_index: 6, source: "local" });
    expect(new Date(mock.calendar.events[0].end).getTime()).toBeGreaterThan(new Date(mock.calendar.events[0].start).getTime());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await screen.findByTitle(/Trees review/)).toBeInTheDocument();
    // Nothing was sent to Google.
    expect(mock.calls.some((c) => /gcal|google/i.test(c))).toBe(false);
  });

  it("email suggestions are read-only until Add / Dismiss", async () => {
    const user = userEvent.setup();
    render(<CalendarView theme="paper" />);
    const section = await screen.findByRole("region", { name: "Suggested from email" });
    expect(section).toHaveTextContent("PHYS 1110 review session");
    expect(mock.calendar.events).toHaveLength(0);
    await user.click(within(section).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(mock.calendar.events).toHaveLength(1));
    expect(mock.calendar.events[0].source).toBe("suggestion:m1");
    expect(screen.queryByRole("region", { name: "Suggested from email" })).toBeNull();
  });
});
