import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "./Skeleton";

const ACTIONS: Array<{ id: string; label: string; hint: string }> = [
  { id: "sync", label: "Sync Canvas now", hint: "S" },
  { id: "brief", label: "Brief me (route skill)", hint: "B" },
];

export function CommandPalette({
  onClose,
  onAction,
  loading = false,
}: {
  onClose: () => void;
  onAction: (action: string) => void;
  loading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ACTIONS;
    return ACTIONS.filter(
      (a) => a.label.toLowerCase().includes(q) || a.id.includes(q)
    );
  }, [query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (loading) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
        );
        return;
      }
      if (e.key === "Enter" && filtered[active]) {
        e.preventDefault();
        onAction(filtered[active].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onAction, filtered, active, loading]);

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        aria-busy={loading || undefined}
      >
        <p className="palette-label">Jump to</p>
        <input
          ref={ref}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter actions…"
          aria-label="Filter actions"
          aria-controls="palette-results"
          aria-activedescendant={
            !loading && filtered[active]
              ? `palette-opt-${filtered[active].id}`
              : undefined
          }
          role="combobox"
          aria-expanded="true"
          aria-autocomplete="list"
          disabled={loading}
        />
        <div
          id="palette-results"
          className="palette-actions"
          role="listbox"
          aria-label="Actions"
        >
          {loading ? (
            <div aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="palette-skeleton-row">
                  <Skeleton
                    className="skeleton-line"
                    width={i === 0 ? "68%" : i === 1 ? "54%" : "62%"}
                  />
                  <Skeleton className="skeleton-line-sm" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="palette-empty">No matching actions.</p>
          ) : (
            filtered.map((action, i) => (
              <button
                key={action.id}
                id={`palette-opt-${action.id}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className={i === active ? "palette-active" : undefined}
                onMouseEnter={() => setActive(i)}
                onClick={() => onAction(action.id)}
              >
                <span>{action.label}</span>
                <span className="palette-hint">{action.hint}</span>
              </button>
            ))
          )}
        </div>
        <p className="palette-footer">↑↓ select · ↵ run · esc close</p>
      </div>
    </div>
  );
}
