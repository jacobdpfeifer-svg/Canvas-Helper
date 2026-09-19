import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FirstRun } from "./FirstRun";

describe("FirstRun", () => {
  it("is completable with the keyboard alone and skips Canvas outside the desktop app", async () => {
    const done = vi.fn();
    const user = userEvent.setup();
    render(<FirstRun onDone={done} />);
    const h1 = screen.getByRole("heading", { name: /ground rules/ });
    expect(h1).toHaveFocus();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await user.tab(); // school select
    await user.tab(); // policy text (scrollable, focusable)
    await user.tab(); // checkbox
    expect(screen.getByRole("checkbox")).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.tab();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: /Connect Canvas/ })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Sign in to Canvas" })).toBeDisabled(); // not in Tauri
    await user.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(await screen.findByRole("heading", { name: /Ready for a first check/ })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Open Study" }));
    expect(done).toHaveBeenCalled();
  });
});
