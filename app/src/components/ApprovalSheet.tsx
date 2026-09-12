import { useEffect } from "react";
import { Skeleton } from "./Skeleton";

/** Supervisor-style approval gate — opaque sheet, accent Approve only. */
export function ApprovalSheet({
  title,
  why,
  onApprove,
  onSkip,
  loading = false,
}: {
  title: string;
  why: string;
  onApprove: () => void;
  onSkip: () => void;
  loading?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  return (
    <div className="sheet-backdrop">
      <div
        className="sheet approval"
        role="dialog"
        aria-modal="true"
        aria-labelledby={loading ? undefined : "approval-title"}
        aria-describedby={loading ? undefined : "approval-why"}
        aria-label={loading ? "Preparing approval" : undefined}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <>
            <Skeleton className="approval-skeleton-title" />
            <Skeleton className="approval-skeleton-why" />
          </>
        ) : (
          <>
            <h2 id="approval-title">{title}</h2>
            <p id="approval-why" className="sheet-why">
              {why}
            </p>
          </>
        )}
        <div className="sheet-actions">
          <button
            type="button"
            className="primary"
            onClick={onApprove}
            disabled={loading}
          >
            Approve
          </button>
          <button type="button" onClick={onSkip}>
            Skip
          </button>
          <button type="button" className="ghost" onClick={onSkip}>
            Change calibration
          </button>
        </div>
      </div>
    </div>
  );
}
