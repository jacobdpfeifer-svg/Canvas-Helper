import { openExternalUrl, type FreshnessChange } from "../ipc";

function relative(iso: string | null | undefined, now: number): string {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const minutes = Math.round((now - t) / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/**
 * "What changed" in Canvas since the student last looked — the same rows the
 * Chrome extension's Canvas dashboard shows, from inbox/freshness/dashboard.json.
 */
export function ChangesLedger({ changes, now = Date.now() }: { changes: FreshnessChange[]; now?: number }) {
  if (!changes.length) return null;
  return (
    <section className="changes-ledger" aria-labelledby="changes-heading">
      <h2 id="changes-heading" className="index-label">
        Changed
      </h2>
      <ol>
        {changes.slice(0, 5).map((c, i) => (
          <li key={c.key}>
            <span className="mono idx">{String(i + 1).padStart(2, "0")}</span>
            <span className="changes-body">
              <span className="mono changes-kind">{c.label}</span>
              {c.url ? (
                <button type="button" className="changes-title" onClick={() => void openExternalUrl(c.url as string)}>
                  {c.title}
                </button>
              ) : (
                <strong className="changes-title">{c.title}</strong>
              )}
              {c.course && <span className="mono muted">{c.course}</span>}
            </span>
            <span className="mono muted changes-when">{relative(c.at || c.detected_at, now)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
