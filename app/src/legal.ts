/** Per-school preamble plus shared beta drafts (canonical prose also in docs/legal/). */

import termsMd from "./legalDocs/terms.md?raw";
import privacyMd from "./legalDocs/privacy.md?raw";

export const TERMS_MD = termsMd;
export const PRIVACY_MD = privacyMd;
export const FULL_LEGAL = `${termsMd.trim()}\n\n---\n\n${privacyMd.trim()}\n`;

const PREAMBLE: Record<string, string> = {
  "cu-boulder":
    "CU Boulder private beta. You must be the account holder for the CU Canvas / IdP identity you sign in with. School policies still apply.\n\n",
  waitlist:
    "Your school is not supported for Canvas sync yet. Joining the waitlist does not sign you into Canvas.\n\n",
};

export const LEGAL_BY_SCHOOL: Record<string, string> = {
  "cu-boulder": `${PREAMBLE["cu-boulder"]}${FULL_LEGAL}`,
  waitlist: `${PREAMBLE.waitlist}${FULL_LEGAL}`,
};

export const GENERIC_LEGAL = LEGAL_BY_SCHOOL.waitlist;

export function schoolLegalText(school: string): string {
  return LEGAL_BY_SCHOOL[school] || GENERIC_LEGAL;
}
