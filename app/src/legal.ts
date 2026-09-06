/** Per-school policy copy shown before SSO. Keep in sync with schools/*.yaml legal_notice. */

export const LEGAL_BY_SCHOOL: Record<string, string> = {
  "cu-boulder": `ProductName is a local-first student tool. It stores your Canvas sync data, preferences, and automation ledger on this device under your user profile.

By continuing you confirm: (1) you are the account holder for the CU Boulder Canvas / IdP identity you will sign in with; (2) you will not use ProductName to circumvent academic integrity, proctoring, or accessibility controls; (3) school policies and FERPA obligations remain yours to follow — ProductName does not replace university counsel or the Office of Information Security; (4) optional cloud API keys and Google OAuth tokens are stored only on this device unless you explicitly opt into crash telemetry.`,
  waitlist: `ProductName is local-first. Data stays on this device. You are responsible for following your school's academic integrity and acceptable-use policies.`,
};

export const GENERIC_LEGAL = LEGAL_BY_SCHOOL.waitlist;
