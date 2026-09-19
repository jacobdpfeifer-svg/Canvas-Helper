import { useCallback, useEffect, useState } from "react";
import { canvasStudy, study, type CanvasSources } from "../study/api";
import { syncStudySources } from "../ipc";
import { fmtWhen } from "../study/format";
import type { PacketSummary } from "../study/types";

/**
 * Settings → Canvas data. Read-only inspection of what the last sync
 * brought in and what Study built from it. There is no import flow here:
 * Canvas sync is the only ingestion path (the daemon turns each synced
 * course into its Study packet automatically after a sync).
 */
export function CanvasDataPanel() {
  const [canvas, setCanvas] = useState<CanvasSources | null>(null);
  const [packets, setPackets] = useState<PacketSummary[]>([]);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([canvasStudy.sources(), study.packets()]);
      setCanvas(c);
      setPackets(p.packets);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await syncStudySources();
      if (!res.ok) setError(res.error || "Sync failed");
    } finally {
      setSyncing(false);
      await refresh();
    }
  };

  const packetFor = (courseId: string) => packets.find((p) => p.packet_id === `canvas-${courseId}`);

  return (
    <div className="canvas-data">
      {canvas && (
        <p className={`sync-line sync-${canvas.status.state}`} role="status">
          {canvas.status.line}
          {canvas.status.last_sync ? ` Last sync ${fmtWhen(canvas.status.last_sync)}.` : ""}
        </p>
      )}
      <div className="row">
        <button type="button" disabled={syncing} onClick={() => void runSync()}>
          {syncing ? "Syncing…" : "Sync Canvas now"}
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {canvas && canvas.courses.length === 0 && canvas.status.state !== "never" && <p className="muted">No course material was found in the last sync.</p>}
      <ul className="packet-list">
        {canvas?.courses.map((course) => {
          const packet = packetFor(course.course_id);
          const isOpen = open[course.course_id] ?? false;
          return (
            <li key={course.course_id} className="packet">
              <div className="packet-head">
                <strong>{course.label}</strong>
                <span className="muted">
                  {course.sources.length} source{course.sources.length === 1 ? "" : "s"} · {course.exams.length} exam candidate{course.exams.length === 1 ? "" : "s"}
                  {course.fetched_at ? ` · fetched ${fmtWhen(course.fetched_at)}` : ""}
                  {packet ? ` · in Study v${packet.version}, ${packet.items.length} item${packet.items.length === 1 ? "" : "s"}` : " · not in Study yet"}
                </span>
                <button type="button" className="ghost" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [course.course_id]: !isOpen }))}>
                  {isOpen ? "Hide" : "Inspect"}
                </button>
              </div>
              {isOpen && (
                <>
                  <ul className="packet-sources">
                    {course.sources.map((s) => (
                      <li key={s.id}>
                        <span className="kind-badge">{s.kind}</span> {s.title} · {s.chars} chars{s.truncated ? " (truncated)" : ""}
                        {s.updated_at ? ` · ${fmtWhen(s.updated_at)}` : ""}
                      </li>
                    ))}
                    {course.sources.length === 0 && <li className="muted">No text synced.</li>}
                  </ul>
                  {course.exams.length > 0 && (
                    <ul className="packet-sources">
                      {course.exams.map((e) => (
                        <li key={e.id}>
                          <span className="kind-badge">{e.kind}</span> {e.label}
                          {e.due_at ? ` · ${fmtWhen(e.due_at)}` : " · no date"}
                          {e.inferred ? " · inferred from title" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {course.errors.length > 0 && <p className="muted small">Sync notes: {course.errors.join("; ")}</p>}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
