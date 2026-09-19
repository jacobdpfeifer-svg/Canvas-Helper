import { useCallback, useEffect, useState } from "react";
import { ItemPopup } from "../home/ItemPopup";
import { SemesterLine, type TickTarget } from "../home/SemesterLine";
import { onInboxUpdated, openExternal, readSemester, syncStudySources, type Semester, type SemesterRange } from "../ipc";
import type { ThemeId } from "../theme";

const RANGE_KEY = "pn_home_range";
const RANGES: { id: SemesterRange; label: string }[] = [
  { id: "1m", label: "1 month" },
  { id: "2m", label: "2 months" },
  { id: "3m", label: "3 months" },
  { id: "semester", label: "Semester" },
];

export function readStoredRange(): SemesterRange {
  try {
    const raw = localStorage.getItem(RANGE_KEY);
    return RANGES.some((r) => r.id === raw) ? (raw as SemesterRange) : "1m";
  } catch {
    return "1m";
  }
}

/**
 * Home: everything Canvas knows about the term, as a per-course number line.
 * One native read per range change; no Canvas payload parsing here.
 */
export function HomeView({ theme, onViewPlan }: { theme: ThemeId; onViewPlan: (target: { courseId: string; itemId: string }) => void }) {
  const [range, setRange] = useState<SemesterRange>(readStoredRange);
  const [data, setData] = useState<Semester | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TickTarget | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(
    (r: SemesterRange) => {
      readSemester(r)
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    },
    []
  );

  useEffect(() => {
    load(range);
    try {
      localStorage.setItem(RANGE_KEY, range);
    } catch {
      /* per-viewer convenience */
    }
  }, [range, load]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    onInboxUpdated(() => load(range)).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, [load, range]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await syncStudySources();
      if (!res.ok) setError(res.error || "Sync failed");
      load(range);
    } finally {
      setSyncing(false);
    }
  };

  const openCanvas = (url: string) => void openExternal(url).catch((e) => setError(String(e)));
  const closePopup = useCallback(() => setSelected(null), []);
  const totalTicks = data?.courses.reduce((n, c) => n + c.ticks.length, 0) ?? 0;

  return (
    <section className="home" aria-labelledby="home-heading">
      <header className="home-header">
        <h1 id="home-heading">Home</h1>
        <fieldset className="segmented range-pick" aria-label="Range">
          <legend className="visually-hidden">Range</legend>
          {RANGES.map((r) => (
            <label key={r.id} className={range === r.id ? "on" : undefined}>
              <input type="radio" name="range" value={r.id} checked={range === r.id} onChange={() => setRange(r.id)} />
              {r.label}
            </label>
          ))}
        </fieldset>
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && data.status.state === "never" && data.courses.length === 0 && (
        <div className="glass home-empty">
          <p>Nothing from Canvas yet.</p>
          <button type="button" className="primary" disabled={syncing} onClick={() => void runSync()}>
            {syncing ? "Syncing…" : "Sync Canvas"}
          </button>
        </div>
      )}
      {data && data.status.state === "session_expired" && (
        <p className="sync-line sync-session_expired" role="status">
          Canvas session expired — sign in again from Settings, then sync.
        </p>
      )}
      {data && data.courses.length > 0 && (
        <>
          <SemesterLine data={data} theme={theme} onOpenItem={setSelected} onOpenCanvas={openCanvas} />
          <p className="home-legend muted small" aria-hidden="true">
            Tick height = share of the course grade · tallest = exams · <span className="legend-past">dimmed</span> = past ·{" "}
            {totalTicks} item{totalTicks === 1 ? "" : "s"} in view
          </p>
        </>
      )}
      {selected && (
        <ItemPopup tick={selected.tick} course={selected.course} theme={theme} onClose={closePopup} onViewPlan={onViewPlan} onOpenCanvas={openCanvas} />
      )}
    </section>
  );
}
