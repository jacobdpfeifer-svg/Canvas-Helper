import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { transport } from "../study/api";
import { makeFakeStudy } from "../test/fakeStudy";
import { StudyView } from "./StudyView";

describe("StudyView journey", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("offers, answers, and shows honest feedback without leaking the key beforehand", async () => {
    const fake = makeFakeStudy();
    vi.spyOn(transport, "send").mockImplementation(fake.send);
    const user = userEvent.setup();
    render(<StudyView onGoToSources={() => undefined} />);

    const heading = await screen.findByRole("heading", { name: "One check" });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/Why this:/)).toBeInTheDocument();
    // No answer-bearing text in the DOM before the attempt is submitted.
    expect(document.body.textContent).not.toMatch(/cos/);

    await user.click(screen.getByRole("button", { name: "Answer now" }));
    const stem = await screen.findByRole("heading", { name: /Differentiate y = \(sin x\)\^4/ });
    expect(stem).toHaveFocus();
    expect(document.body.textContent).not.toMatch(/cos/);

    await user.type(screen.getByLabelText("Inner function"), "sin x");
    await user.type(screen.getByLabelText("Derivative y′"), "4sin^3x");
    await waitFor(() => expect(fake.calls.some((c) => c.cmd === "draft")).toBe(true), { timeout: 2000 });
    expect(screen.getByText(/^Saved/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    const result = await screen.findByRole("heading", { name: /Partly right/ });
    expect(result).toHaveFocus();
    expect(screen.getByText("Baseline")).toBeInTheDocument();
    expect(screen.getByText(/Multiply by the derivative of the inside/)).toBeInTheDocument();
    expect(screen.getByText(/synthetic template derivation/i)).toBeInTheDocument();
    const results = screen.getByRole("list", { name: "" }) ?? null;
    expect(results).toBeTruthy();
    const submit = fake.calls.find((c) => c.cmd === "submit");
    expect(submit?.params.fields).toEqual({ inner: "sin x", derivative: "4sin^3x" });
    expect(screen.getByRole("status")).toHaveTextContent(/Partly right/);
  });

  it("learn mode shows the example first and labels the result as learning", async () => {
    const fake = makeFakeStudy();
    vi.spyOn(transport, "send").mockImplementation(fake.send);
    const user = userEvent.setup();
    render(<StudyView onGoToSources={() => undefined} />);
    await screen.findByRole("heading", { name: "One check" });
    await user.click(screen.getByRole("button", { name: "Show an example first" }));
    expect(await screen.findByText(/Worked example/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Inner function"), "sin x");
    await user.type(screen.getByLabelText("Derivative y′"), "4 sin^3 x cos x");
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    await screen.findByRole("heading", { name: /Correct/ });
    expect(screen.getByText("Learning from the example")).toBeInTheDocument();
    expect(fake.calls.find((c) => c.cmd === "start")?.params.mode).toBe("learn");
  });

  it("show source asks for confirmation, then marks the attempt exposed", async () => {
    const fake = makeFakeStudy();
    vi.spyOn(transport, "send").mockImplementation(fake.send);
    const user = userEvent.setup();
    render(<StudyView onGoToSources={() => undefined} />);
    await screen.findByRole("heading", { name: "One check" });
    await user.click(screen.getByRole("button", { name: "Answer now" }));
    await user.click(await screen.findByRole("button", { name: "Show source" }));
    expect(fake.calls.some((c) => c.cmd === "reveal")).toBe(false);
    expect(screen.getByText(/ends delayed credit/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show it" }));
    expect(await screen.findByText(/4 sin³\(x\) cos\(x\)/)).toBeInTheDocument();
    expect(fake.calls.some((c) => c.cmd === "reveal")).toBe(true);
    await user.type(screen.getByLabelText("Inner function"), "sin x");
    await user.type(screen.getByLabelText("Derivative y′"), "4 sin^3 x cos x");
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    await screen.findByRole("heading", { name: /Correct/ });
    expect(screen.getByText("After seeing the solution")).toBeInTheDocument();
  });

  it("resumes an open attempt with its draft", async () => {
    const fake = makeFakeStudy();
    vi.spyOn(transport, "send").mockImplementation(fake.send);
    const user = userEvent.setup();
    const first = render(<StudyView onGoToSources={() => undefined} />);
    await screen.findByRole("heading", { name: "One check" });
    await user.click(screen.getByRole("button", { name: "Answer now" }));
    await user.type(await screen.findByLabelText("Inner function"), "sin");
    await waitFor(() => expect(fake.calls.some((c) => c.cmd === "draft")).toBe(true), { timeout: 2000 });
    first.unmount();
    render(<StudyView onGoToSources={() => undefined} />);
    expect(await screen.findByText(/A saved draft from/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Answer now" }));
    expect(await screen.findByLabelText("Inner function")).toHaveValue("sin");
    expect(screen.getByText(/^Draft restored \(/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Draft restored with its study history.");
  });

  it("surfaces a persistence failure with a retry instead of pretending it saved", async () => {
    const fake = makeFakeStudy({ failWith: { cmd: "submit", code: "persistence_failed", message: "could not append event: disk full" } });
    vi.spyOn(transport, "send").mockImplementation(fake.send);
    const user = userEvent.setup();
    render(<StudyView onGoToSources={() => undefined} />);
    await screen.findByRole("heading", { name: "One check" });
    await user.click(screen.getByRole("button", { name: "Answer now" }));
    await user.type(await screen.findByLabelText("Inner function"), "sin x");
    await user.click(screen.getByRole("button", { name: "Check my answer" }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/disk full/)).toBeInTheDocument();
    expect(within(alert).getByText(/Your answer was not saved/)).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("empty profile explains the recovery path", async () => {
    const goto = vi.fn();
    vi.spyOn(transport, "send").mockImplementation(async (cmd) =>
      cmd === "offer"
        ? { ok: true, kind: "missing_source", item: null, mode: null, why: "", next_at: null, reason: "No permitted source is imported yet.", action: "import", state: null, eligibility_note: "", alternatives: [], minutes: 5, timeline: [], session: { id: "s", visited: [] } }
        : { ok: true, courses: [], packets: [], exams: [], items: {}, log: {}, clock: {}, open_attempts: [], pending_assessments: [] }
    );
    const user = userEvent.setup();
    render(<StudyView onGoToSources={goto} />);
    expect(await screen.findByRole("heading", { name: "No practice item is ready" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Canvas data" }));
    expect(goto).toHaveBeenCalled();
  });
});

describe("draft persistence edge cases", () => {
  it("flushes a pending draft when the attempt unmounts", async () => {
    const fake = makeFakeStudy();
    vi.spyOn(transport, "send").mockImplementation(fake.send);
    const user = userEvent.setup();
    const view = render(<StudyView onGoToSources={() => undefined} />);
    await screen.findByRole("heading", { name: "One check" });
    await user.click(screen.getByRole("button", { name: "Answer now" }));
    await user.type(await screen.findByLabelText("Inner function"), "sin x");
    // Unmount immediately — before the 800ms debounce fires.
    view.unmount();
    await waitFor(() => expect(fake.calls.some((c) => c.cmd === "draft" && String(c.params.text).includes("sin x"))).toBe(true), { timeout: 3000 });
  });

  it("locks session length while an attempt is open", async () => {
    const fake = makeFakeStudy();
    vi.spyOn(transport, "send").mockImplementation(fake.send);
    const user = userEvent.setup();
    render(<StudyView onGoToSources={() => undefined} />);
    await screen.findByRole("heading", { name: "One check" });
    expect(screen.getByLabelText("10 min")).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Answer now" }));
    await screen.findByLabelText("Inner function");
    expect(screen.getByLabelText("10 min")).toBeDisabled();
  });
});
