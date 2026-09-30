import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChangesLedger } from "./ChangesLedger";

const NOW = Date.parse("2026-09-29T18:00:00Z");

describe("ChangesLedger", () => {
  it("renders nothing when Canvas has not changed", () => {
    const { container } = render(<ChangesLedger changes={[]} now={NOW} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists at most five changes as an indexed ledger", () => {
    const changes = Array.from({ length: 7 }, (_, i) => ({
      key: `k${i}`,
      kind: i === 0 ? "due_changed" : "announcement",
      label: i === 0 ? "Due date moved" : "Announcement",
      title: `Item ${i}`,
      course: "APPM 1235",
      detected_at: new Date(NOW - (i + 1) * 3600_000).toISOString(),
      url: i === 0 ? "https://canvas.colorado.edu/courses/1/assignments/2" : null,
    }));
    render(<ChangesLedger changes={changes} now={NOW} />);
    expect(screen.getByRole("heading", { name: "Changed" })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("Due date moved")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Item 0" })).toBeTruthy();
    expect(screen.queryByText("Item 5")).toBeNull();
    expect(screen.getByText("01")).toBeTruthy();
  });
});
