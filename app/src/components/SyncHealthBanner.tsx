import { openExternalUrl, type SyncHealth } from "../ipc";
import { friendlyWhen } from "../format";

export function SyncHealthBanner({ health, inspectUrl }: { health?: SyncHealth | null; inspectUrl?: string | null }) {
  if (!health?.state) return null;
  const state = health.state;
  if (state === "fresh_complete") {
    return (
      <p className="muted sync-health" data-state={state} title={health.sync_id ? `Sync ${health.sync_id}` : undefined}>
        {health.as_of ? `Up to date with Canvas as of ${friendlyWhen(health.as_of)}` : "Up to date with Canvas"}
      </p>
    );
  }
  const emptyUnverified = state === "empty_unverified";
  const label =
    state === "blocked"
      ? "Kairos can't read Canvas right now. Sign in again from Settings."
      : emptyUnverified
        ? "Kairos hasn't finished reading Canvas yet, so this is not an empty week."
        : state === "fresh_partial"
          ? "Some classes didn't load from Canvas."
          : state === "stale_complete"
            ? "This is an older copy of your Canvas data."
            : state === "stale_partial"
              ? "This is an older, partial copy of your Canvas data."
              : "Canvas data needs a look.";
  return (
    <aside className="sync-health warn" data-state={state} role="status">
      <strong>{label}</strong>
      {health.as_of && <span> Last read {friendlyWhen(health.as_of)}.</span>}
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
