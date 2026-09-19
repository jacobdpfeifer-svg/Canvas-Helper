import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { transport } from "../study/api";
import { PlanEvent } from "./PlanEvent";

describe("PlanEvent", () => {
  it("previews, refuses to confirm after edits, and only sends the confirmed content", async () => {
    const calls: { cmd: string; params: Record<string, unknown> }[] = [];
    vi.spyOn(transport, "send").mockImplementation(async (cmd, params) => {
      calls.push({ cmd, params });
      if (cmd === "gcal-preview-event") return { ok: true, preview: params, confirmation_token: "tok-1", executable: true, note: "confirm to create" };
      if (cmd === "gcal-confirm-event") return { ok: true, created: { id: "e1", summary: params.summary }, mode: "live" };
      return { ok: false, error: { code: "validation", message: "nope" } };
    });
    const user = userEvent.setup();
    render(<PlanEvent />);
    await user.click(screen.getByRole("button", { name: /Add a study block/ }));
    await user.type(screen.getByLabelText("Title"), "MATH 1300 review");
    await user.type(screen.getByLabelText("Start"), "2026-09-20T15:00");
    await user.type(screen.getByLabelText("End"), "2026-09-20T16:00");
    await user.click(screen.getByRole("button", { name: "Preview" }));
    const confirm = await screen.findByRole("button", { name: "Yes, create this event" });
    expect(confirm).toBeEnabled();
    expect(calls.filter((c) => c.cmd === "gcal-confirm-event")).toHaveLength(0);
    // Editing after the preview invalidates the pending confirmation.
    await user.type(screen.getByLabelText("Title"), "!");
    expect(screen.getByRole("button", { name: "Yes, create this event" })).toBeDisabled();
    expect(screen.getByText(/preview again/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview" }));
    await user.click(await screen.findByRole("button", { name: "Yes, create this event" }));
    expect(await screen.findByText(/Created “MATH 1300 review!”/)).toBeInTheDocument();
    const sent = calls.filter((c) => c.cmd === "gcal-confirm-event");
    expect(sent).toHaveLength(1);
    expect(sent[0].params.summary).toBe("MATH 1300 review!");
    expect(sent[0].params.confirmation_token).toBe("tok-1");
  });
});
