import { useEffect } from "react";
import { Skeleton } from "./Skeleton";

export function LedgerViewer({
  onClose,
  loading = false,
}: {
  onClose: () => void;
  loading?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Live ledger IPC is not wired yet — show empty, never mock rows that
  // imply calendar moves or email sends (canvas-focus pivot).
  const rows: Array<{
    id: string;
    line: string;
    status: "success" | "veto";
    undo?: string;
  }> = [];

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet ledger"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-title"
        aria-busy={loading || undefined}
      >
        <h2 id="ledger-title">Ledger</h2>
        <p>
          Append-only audit trail for local drafts and self-only actions. This
          product does not send email, write calendar events, or submit for
          you.
        </p>
        {loading ? (
          <ul aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="ledger-skeleton-row">
                <Skeleton
                  className="skeleton-line"
                  width={i === 0 ? "88%" : i === 1 ? "76%" : "82%"}
                />
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <p className="ledger-empty">No automations recorded yet.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.id}>
                {row.line}
                {" · "}
                <span
                  className={
                    row.status === "success"
                      ? "ledger-status-success"
                      : "ledger-status-veto"
                  }
                >
                  {row.status}
                </span>
                {row.undo ? ` · undo:${row.undo}` : ""}
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
