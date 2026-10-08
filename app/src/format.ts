/** Plain-English due dates for the UI (MASTER §02): "Thu, Sep 24 at 10:00 AM MDT" and "in 2 days".
 *  The short zone stays so a deadline is never ambiguous for a student who is travelling. */

export function friendlyWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${day} at ${time}`;
}

export function friendlyRelative(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(now)) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${-days} days ago`;
  return `in ${days} days`;
}

export function friendlyDue(iso: string, now = new Date()): string {
  return `${friendlyWhen(iso)}, ${friendlyRelative(iso, now)}`;
}
