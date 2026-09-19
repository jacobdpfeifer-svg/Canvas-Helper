/**
 * Legal text has ONE source: docs/legal/terms.md and docs/legal/privacy.md
 * (beta drafts, dated in the files). They are bundled here verbatim at build
 * time; only the short per-school preamble lives in code.
 */
import privacyMd from "../../docs/legal/privacy.md?raw";
import termsMd from "../../docs/legal/terms.md?raw";

export const TERMS_MD: string = termsMd;
export const PRIVACY_MD: string = privacyMd;

/** Per-school preamble shown above the shared full text. */
export const LEGAL_BY_SCHOOL: Record<string, string> = {
  "cu-boulder":
    "CU Boulder: you sign in with your own CU Canvas / IdP identity. ProductName is not affiliated with the University of Colorado Boulder or Instructure. School policies (academic integrity, acceptable use, FERPA) remain yours to follow.",
  waitlist:
    "Your school is not supported for Canvas sign-in yet. Joining the waitlist stores your email on this device only; nothing else is set up.",
};

export const GENERIC_LEGAL = LEGAL_BY_SCHOOL.waitlist;

export function legalPreamble(schoolSlug: string): string {
  return LEGAL_BY_SCHOOL[schoolSlug] || GENERIC_LEGAL;
}

/** Date stamped in the drafts ("Beta draft · YYYY-MM-DD"). */
export function legalVersion(): string {
  const m = /Beta draft · (\d{4}-\d{2}-\d{2})/.exec(termsMd);
  return m ? m[1] : "draft";
}
