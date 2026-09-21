import { useEffect, useId, useState } from "react";

/** Stylized Canvas window → click Sign in → cards fly into ProductName. CSS/SVG only. */
export function ConnectCanvasMark({ reduced }: { reduced: boolean }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg className={`connect-mark${reduced ? " reduced" : ""}`} viewBox="0 0 320 180" role="img" aria-label="Canvas sign-in flowing into ProductName">
      <defs>
        <linearGradient id={`g${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--accent-deep)" />
        </linearGradient>
      </defs>
      <rect className="win canvas-win" x="18" y="28" width="130" height="96" rx="12" />
      <rect className="win-bar" x="18" y="28" width="130" height="18" rx="12" />
      <text className="win-label" x="36" y="41">
        Canvas
      </text>
      <rect className="signin" x="48" y="72" width="70" height="22" rx="8" />
      <text className="signin-label" x="83" y="87">
        Sign in
      </text>
      <circle className="cursor" cx="70" cy="84" r="5" />
      <rect className="win pn-win" x="172" y="28" width="130" height="96" rx="12" />
      <rect className="win-bar" x="172" y="28" width="130" height="18" rx="12" />
      <text className="win-label" x="198" y="41">
        ProductName
      </text>
      <rect className="card c1" x="186" y="56" width="46" height="28" rx="6" />
      <rect className="card c2" x="238" y="56" width="46" height="28" rx="6" />
      <rect className="card c3" x="212" y="88" width="46" height="28" rx="6" />
    </svg>
  );
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}
