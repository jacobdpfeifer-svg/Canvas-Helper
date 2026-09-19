import { render, screen, act, waitFor } from "@testing-library/react";
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

import { FirstRun } from "./FirstRun";

let mock: MockIpc;

describe("FirstRun (show, don't tell)", () => {
  beforeEach(() => {
    h.current = h.makeMockIpc();
    mock = h.current;
  });

  it("gates Continue on the Accept toggle and opens/closes the terms sheet", async () => {
    const user = userEvent.setup();
    render(<FirstRun onDone={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Your school" })).toHaveFocus();
    const cont = screen.getByRole("button", { name: "Continue" });
    expect(cont).toBeDisabled();
    // No explanatory paragraph on the screen.
    expect(document.querySelector(".ob-screen p:not(.ob-error)")).toBeNull();
    await user.click(screen.getByRole("button", { name: "View terms" }));
    const dialog = screen.getByRole("dialog", { name: /Terms/ });
    expect(dialog).toHaveTextContent(/never submits/);
    expect(dialog).toHaveTextContent(/Delete the folder/i);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    const accept = screen.getByRole("checkbox", { name: "Accept terms" });
    await user.click(accept);
    expect(screen.getByRole("checkbox", { name: "Terms accepted" })).toHaveAttribute("aria-checked", "true");
    expect(cont).toBeEnabled();
    await user.click(screen.getByRole("checkbox", { name: "Terms accepted" }));
    expect(cont).toBeDisabled();
    await user.click(accept);
    await user.click(cont);
    expect(await screen.findByRole("heading", { name: "Connect Canvas" })).toHaveFocus();
    // Mandatory: no skip.
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
  });

  it("keeps the student on Connect when sign-in fails, with Try again", async () => {
    mock.state.ssoResult = "no-session";
    const user = userEvent.setup();
    render(<FirstRun onDone={() => undefined} />);
    await user.click(screen.getByRole("checkbox", { name: "Accept terms" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const signIn = await screen.findByRole("button", { name: "Sign in to Canvas" });
    await waitFor(() => expect(signIn).toBeEnabled());
    await user.click(signIn);
    expect(await screen.findByRole("alert")).toHaveTextContent(/No Canvas session/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Connect Canvas" })).toBeInTheDocument();
    expect(document.querySelector(".canvas-anim")).not.toBeNull();
    mock.state.ssoResult = "throw";
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/login window closed/);
    expect(mock.state.onboardingSaved).toHaveLength(0);
  });

  it("auto-advances past Connect when a session already exists, then shows courses landing one by one", async () => {
    mock.state.session = true;
    const done = vi.fn();
    render(<FirstRun onDone={done} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: "Accept terms" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Already signed in");
    expect(mock.calls).not.toContain("open_canvas_sso");
    expect(await screen.findByRole("heading", { name: "Loading your courses" }, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(mock.calls).toContain("sync_study_sources"));
    const blue = { name: "blue", light: "#2a78d6", dark: "#3987e5" };
    await act(async () => {
      mock.emitSync({
        event: "courses",
        courses: [
          { id: "3101", label: "CSCI 2270 — Data Structures", color_index: 6, color: blue },
          { id: "3102", label: "MATH 2300 — Calculus 2", color_index: 3, color: blue },
        ],
      });
    });
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await act(async () => {
      mock.emitSync({ event: "course", ok: true, course: { id: "3101", label: "CSCI 2270 — Data Structures", color_index: 6, color: blue, counts: { assignments: 19, quizzes: 2, exams: 3, discussions: 0, other: 1 } }, errors: [] });
    });
    const cards = screen.getAllByRole("listitem");
    expect(cards[0]).toHaveClass("done");
    expect(cards[0]).toHaveTextContent("20 · 2 · 3");
    expect(cards[1]).toHaveClass("pending");
    await act(async () => {
      mock.emitSync({ event: "course", ok: true, course: { id: "3102", label: "MATH 2300 — Calculus 2", color_index: 3, color: blue, counts: { assignments: 12, quizzes: 3, exams: 2, discussions: 0, other: 0 } }, errors: [] });
      mock.emitSync({ event: "done", ok: true, session: "ok", courses: [] });
    });
    await waitFor(() => expect(done).toHaveBeenCalled(), { timeout: 3000 });
    expect(mock.state.onboardingSaved[0]).toMatchObject({ school: "cu-boulder" });
  });

  it("partial sync: shows what loaded, offers Retry, and lets the student continue with what loaded", async () => {
    mock.state.session = true;
    mock.state.syncOutcome = { ok: false, error: "2 course errors" };
    const done = vi.fn();
    render(<FirstRun onDone={done} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox", { name: "Accept terms" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Loading your courses" }, { timeout: 3000 });
    await waitFor(() => expect(mock.calls).toContain("sync_study_sources"));
    const c = { name: "blue", light: "#2a78d6", dark: "#3987e5" };
    await act(async () => {
      mock.emitSync({ event: "courses", courses: [{ id: "1", label: "A", color_index: 0, color: c }, { id: "2", label: "B", color_index: 1, color: c }] });
      mock.emitSync({ event: "course", ok: true, course: { id: "1", label: "A", color_index: 0, color: c, counts: { assignments: 1, quizzes: 0, exams: 0, discussions: 0, other: 0 } }, errors: [] });
      mock.emitSync({ event: "course", ok: false, course: { id: "2", label: "B", color_index: 1, color: c }, errors: ["pages: 500"] });
      mock.emitSync({ event: "done", ok: false, partial: true, session: "ok", courses: [] });
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("1 course didn’t load.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue with 1 course" }));
    await waitFor(() => expect(done).toHaveBeenCalled());
  });

  it("waitlist schools never enter the app", async () => {
    const done = vi.fn();
    render(<FirstRun onDone={done} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("School"), "waitlist");
    await user.click(screen.getByRole("checkbox", { name: "Accept terms" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Waitlist" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "someone@example.edu");
    await user.click(screen.getByRole("button", { name: "Join waitlist" }));
    expect(await screen.findByRole("heading", { name: "You’re on the list" })).toBeInTheDocument();
    expect(mock.state.onboardingSaved[0]).toMatchObject({ school: "waitlist", opts: { waitlistEmail: "someone@example.edu" } });
    expect(done).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Continue|Sign in/ })).toBeNull();
  });
});
