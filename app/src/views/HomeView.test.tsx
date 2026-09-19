import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
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
vi.mock("../study/api", async () => {
  const actual = await vi.importActual<typeof import("../study/api")>("../study/api");
  return {
    ...actual,
    study: { ...actual.study, status: async () => ({ courses: ["CSCI 2270 — Data Structures"], exams: [], log: { events: 0, partial_tail: false }, clock: { status: "ok", note: "" } }), offer: async () => ({ kind: "missing_source", reason: "none" }) },
  };
});

import { App } from "../App";
import { HomeView } from "./HomeView";

let mock: MockIpc;

describe("Home semester line", () => {
  beforeEach(() => {
    h.current = h.makeMockIpc();
    mock = h.current;
    localStorage.setItem("pn_onboarded", "1");
  });

  it("renders one row per course with tick heights from the daemon's weights, and persists the range", async () => {
    const user = userEvent.setup();
    render(<HomeView theme="night" onViewPlan={() => undefined} />);
    const rows = await screen.findAllByRole("group", { name: /items in view/ });
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.getAttribute("aria-label"))).toEqual([
      "CSCI 2270 — Data Structures: 15 items in view",
      "MATH 2300 — Calculus 2: 10 items in view",
      "PHYS 1110 — General Physics 1: 4 items in view",
      "WRTG 3030 — Writing on Science and Society: 8 items in view",
    ]);
    const csci = rows[0];
    const midterm = within(csci).getByRole("button", { name: /Exam: Midterm 1/ });
    const hw = within(csci).getByRole("button", { name: /Homework: Homework 3/ });
    const examH = parseInt((midterm as HTMLElement).style.getPropertyValue("--tick-h"), 10);
    const hwH = parseInt((hw as HTMLElement).style.getPropertyValue("--tick-h"), 10);
    expect(examH).toBeGreaterThan(hwH);
    expect(midterm.getAttribute("aria-label")).toMatch(/15% of grade/);
    // Hit target is at least 12px wide however thin the bar is.
    expect(parseInt((hw as HTMLElement).style.width, 10)).toBeGreaterThanOrEqual(12);
    // No-term course is labeled honestly.
    expect(screen.getByText("term inferred from due dates")).toBeInTheDocument();
    // Range selector → one read per change, persisted.
    expect(mock.calls.filter((c) => c.startsWith("read_semester"))).toEqual(["read_semester:1m"]);
    await user.click(screen.getByRole("radio", { name: "3 months" }));
    await waitFor(() => expect(mock.calls).toContain("read_semester:3m"));
    expect(localStorage.getItem("pn_home_range")).toBe("3m");
    expect(await screen.findByRole("button", { name: /Exam: Final Exam/ })).toBeInTheDocument();
  });

  it("hover pops the bubble immediately with facts and Open in Canvas; keyboard moves between ticks", async () => {
    const user = userEvent.setup();
    render(<HomeView theme="paper" onViewPlan={() => undefined} />);
    const rows = await screen.findAllByRole("group", { name: /items in view/ });
    const hw = within(rows[0]).getByRole("button", { name: /Homework: Homework 3/ });
    fireEvent.mouseEnter(hw);
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("Homework");
    expect(tip).toHaveTextContent("Homework 3");
    expect(tip).toHaveTextContent("CSCI 2270");
    expect(tip).toHaveTextContent(/3% of grade/);
    expect(tip).toHaveTextContent(/20/);
    await user.click(within(tip).getByRole("button", { name: /Open in Canvas/ }));
    expect(mock.calls).toContain("open_external:https://canvas.example.edu/courses/3101/assignments/1002");
    // Keyboard: focus shows the bubble; arrows move along the row.
    hw.focus();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Homework 3");
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).not.toBe(hw);
    expect(document.activeElement?.closest("[role=group]")).toBe(rows[0]);
    expect(screen.getByRole("tooltip")).not.toHaveTextContent("Homework 3");
  });

  it("past ticks are dimmed and a graded submission shows its state", async () => {
    localStorage.setItem("pn_home_range", "semester");
    render(<HomeView theme="night" onViewPlan={() => undefined} />);
    const rows = await screen.findAllByRole("group", { name: /items in view/ });
    const phys = rows[2];
    const ps1 = within(phys).getByRole("button", { name: /Problem set 1/ });
    expect(ps1).toHaveClass("past");
    expect(ps1).toHaveClass("done");
    fireEvent.mouseEnter(ps1);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Graded · 23/25");
  });

  it("clicking an exam opens the glass popup with what it covers, and View plan routes to Exam Prep", async () => {
    const user = userEvent.setup();
    render(<App />);
    const rows = await screen.findAllByRole("group", { name: /items in view/ });
    await user.click(within(rows[0]).getByRole("button", { name: /Exam: Midterm 1/ }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Midterm 1");
    expect(await within(dialog).findByText(/Covers arrays, linked lists/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "View plan" }));
    expect(await screen.findByRole("heading", { name: "Midterm 1" })).toHaveFocus();
    expect(screen.getByText("Draft plan")).toBeInTheDocument();
    const days = screen.getAllByRole("listitem", { name: "" }).filter((li) => li.classList.contains("plan-day"));
    expect(days.length).toBe(14);
    expect(days[0]).toHaveAttribute("aria-current", "date");
    expect(days[days.length - 1]).toHaveTextContent("Review");
    // Redo reshuffles with a new seed (honest label stays).
    await user.click(screen.getByRole("button", { name: "Redo this plan" }));
    await waitFor(() => expect(mock.calls).toContain("read_exam_prep:3101:a1018:1"));
    expect(screen.getByText(/does not yet consult a model/)).toBeInTheDocument();
    // Practice items exist for this course → routes into Study with the course preselected.
    await user.click(await screen.findByRole("button", { name: "Let’s test your knowledge" }));
    expect(screen.getByRole("tab", { name: "Study" })).toHaveAttribute("aria-selected", "true");
  });

  it("non-exam ticks open the popup without a plan button", async () => {
    const user = userEvent.setup();
    render(<HomeView theme="night" onViewPlan={() => undefined} />);
    const rows = await screen.findAllByRole("group", { name: /items in view/ });
    await user.click(within(rows[0]).getByRole("button", { name: /Homework: Homework 3/ }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Homework 3");
    expect(within(dialog).queryByRole("button", { name: "View plan" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
