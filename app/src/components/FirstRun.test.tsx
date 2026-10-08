import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FirstRun } from "./FirstRun";

vi.mock("../ipc", () => ({
  checkCanvasSession: vi.fn().mockResolvedValue(false),
  openCanvasSso: vi.fn(),
  saveOnboarding: vi.fn().mockResolvedValue(undefined),
  searchSchools: vi.fn().mockResolvedValue([
    { name: "Ohio State – CarmenCanvas", host: "osu.instructure.com", account_id: 132008 },
  ]),
  chooseSchool: vi.fn().mockImplementation(async (m: { host: string; name: string }) => ({
    slug: m.host.replace(/\./g, "-"),
    display_name: m.name,
    canvas_host: m.host,
    canvas_base_url: `https://${m.host}`,
    instructure_account_id: null,
    source: "instructure-search",
  })),
  bootstrapCanvasSync: vi.fn(),
  syncCanvas: vi.fn().mockResolvedValue({ ok: true }),
  syncStudySourcesIpc: vi.fn().mockResolvedValue({ ok: true }),
  onStudySyncProgress: vi.fn().mockResolvedValue(() => undefined),
}));

import { chooseSchool, openCanvasSso, saveOnboarding, syncStudySourcesIpc } from "../ipc";

async function pickOhioState(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("School"), "ohio");
  await user.click(await screen.findByRole("button", { name: /Ohio State/ }));
}

describe("FirstRun", () => {
  it("finds the school by name, gates Continue on the terms, and saves the discovered school", async () => {
    const user = userEvent.setup();
    render(<FirstRun onDone={() => undefined} />);
    expect(screen.getByRole("heading", { name: "Where do you go to school?" })).toBeInTheDocument();
    expect(screen.queryByText(/CU Boulder/)).not.toBeInTheDocument();
    const cont = screen.getByRole("button", { name: "Continue" });
    expect(cont).toBeDisabled();
    await pickOhioState(user);
    expect(cont).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Read the terms" }));
    expect(screen.getByRole("dialog", { name: "Terms" })).toHaveTextContent(/at Ohio State/);
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByLabelText("I agree to the beta terms"));
    expect(cont).toBeEnabled();
    await user.click(cont);
    expect(vi.mocked(chooseSchool)).toHaveBeenCalledWith(
      { host: "osu.instructure.com", name: "Ohio State – CarmenCanvas", account_id: 132008 },
      false
    );
    expect(vi.mocked(saveOnboarding)).toHaveBeenCalledWith("osu-instructure-com", "", {});
    expect(await screen.findByRole("heading", { name: "Connect Canvas" })).toBeInTheDocument();
  });

  it("accepts a pasted Canvas address when the school isn't listed", async () => {
    const user = userEvent.setup();
    render(<FirstRun onDone={() => undefined} />);
    await user.click(screen.getByRole("button", { name: "My school isn't listed" }));
    await user.type(screen.getByLabelText("Your Canvas address"), "https://canvas.example.edu/courses");
    await user.click(screen.getByLabelText("I agree to the beta terms"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(vi.mocked(chooseSchool)).toHaveBeenLastCalledWith({ host: "canvas.example.edu", name: "canvas.example.edu" }, true);
  });

  it("keeps the student on Connect Canvas after a failed sign-in", async () => {
    vi.mocked(openCanvasSso).mockRejectedValueOnce(new Error("Login window closed or no session found."));
    const user = userEvent.setup();
    render(<FirstRun onDone={() => undefined} />);
    await pickOhioState(user);
    await user.click(screen.getByLabelText("I agree to the beta terms"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Connect Canvas" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sign in to Canvas" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Login window closed|no session/i);
    expect(screen.getByRole("heading", { name: "Connect Canvas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip for now" })).not.toBeInTheDocument();
  });

  it("lists classes as they sync", async () => {
    vi.mocked(syncStudySourcesIpc).mockImplementation(() => new Promise(() => undefined));
    render(
      <FirstRun
        startStep="sync"
        onDone={() => undefined}
        progressCourses={[{ id: "1300", label: "MATH 1300", color: "#2E86AB", assignments: 12, quizzes: 2, exam_count: 1 }]}
      />
    );
    expect(await screen.findByRole("heading", { name: "Getting your classes" })).toBeInTheDocument();
    expect(screen.getByText("MATH 1300")).toBeInTheDocument();
    expect(screen.getByText(/12 assignments/)).toBeInTheDocument();
  });
});
