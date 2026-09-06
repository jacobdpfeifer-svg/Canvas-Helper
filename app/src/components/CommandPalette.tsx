import { useEffect, useRef } from "react";

export function CommandPalette({
  onClose,
  onAction,
}: {
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input ref={ref} placeholder="Jump to action…" />
        <button type="button" onClick={() => onAction("approve-demo")}>
          Preview gated submit
        </button>
        <button type="button" onClick={() => onAction("sync")}>
          Sync Canvas now
        </button>
      </div>
    </div>
  );
}
