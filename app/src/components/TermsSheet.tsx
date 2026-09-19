import { useEffect, useRef } from "react";
import { PRIVACY_MD, TERMS_MD, legalPreamble } from "../legal";
import { Markdown } from "./Markdown";

/** Full terms + privacy in a scrollable, dismissable sheet. */
export function TermsSheet({ school, onClose }: { school: string; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => {
    heading.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="popup-scrim" role="presentation" onClick={onClose}>
      <div className="glass terms-sheet" role="dialog" aria-modal="true" aria-labelledby="terms-title" onClick={(e) => e.stopPropagation()}>
        <div className="terms-head">
          <h2 id="terms-title" ref={heading} tabIndex={-1}>
            Terms &amp; privacy
          </h2>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="terms-body">
          <p className="terms-preamble">{legalPreamble(school)}</p>
          <Markdown text={TERMS_MD} />
          <hr />
          <Markdown text={PRIVACY_MD} />
        </div>
      </div>
    </div>
  );
}
