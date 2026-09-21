import { openExternalUrl, type SyncHealth } from "../ipc";

export function SyncHealthBanner({ health, inspectUrl }: { health?: SyncHealth | null; inspectUrl?: string | null }) {
  if (!health?.state) return null;
  const state = health.state;
  if (state === "fresh_complete") {
    return (
      <p className="muted sync-health" data-state={state}>
        Last complete sync {health.as_of ? new Date(health.as_of).toLocaleString() : ""} · {health.sync_id}
      </p>
    );
  }
  const emptyUnverified = state === "empty_unverified";
  const label =
    state === "blocked"
      ? "Canvas data is blocked until sync can run."
      : emptyUnverified
        ? "No Canvas snapshot has been verified yet — this is not an empty week."
        : state === "fresh_partial"
          ? "Sync is partial; named sources failed."
          : state === "stale_complete"
            ? "Canvas data is stale."
            : state === "stale_partial"
              ? "Only an older partial snapshot is available."
              : "Canvas data needs attention.";
  return (
    <aside className="sync-health warn" data-state={state} role="status">
      <strong>{label}</strong>
      {health.as_of && <span> as of {new Date(health.as_of).toLocaleString()}</span>}
      {health.sync_id && <span className="muted"> · {health.sync_id}</span>}
      {Array.isArray(health.named_courses_failed) && health.named_courses_failed.length > 0 && (
        <span> Courses: {health.named_courses_failed.join(", ")}</span>
      )}
      {inspectUrl && (inspectUrl.startsWith("https://") || inspectUrl.startsWith("http://")) && (
        <button type="button" className="link" onClick={() => void openExternalUrl(inspectUrl)}>
          Inspect in Canvas
        </button>
      )}
    </aside>
  );
}
