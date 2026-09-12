# Privacy Policy — ProductName (private beta)

**Status:** draft for private beta / public-test gate. Shipping name is still the placeholder **ProductName** (`com.productname.student`). This is not legal advice.

**Last updated:** 2026-09-12

## What this product is

ProductName is a **local-first** Canvas companion. It helps you plan and study. It does **not** submit assignments, post discussions, send email, or create calendar events on your behalf.

## What we store (on your device)

Unless you opt into crash telemetry (below), data stays under your local user profile (`{user_root}`), including:

- Canvas sync snapshots (`inbox/`), course notes, and learning checks
- Preferences and calibration (`calibration/`), including optional priorities and Sentry opt-in flag
- Automation ledger (`ledger.jsonl`) for local draft / self-only actions
- Optional cloud LLM API key and Google OAuth tokens (device-local files; never committed to git)
- SSO session cookies in `browser/.auth/` (gitignored) for Canvas API sync

## What leaves your device

- **Canvas / school IdP:** when you sign in via SSO, your school’s systems see the usual login traffic.
- **Optional cloud LLM:** if you paste an API key, prompts you approve are sent to that provider under their terms.
- **Optional Google OAuth:** if you connect Gmail/Calendar, Google receives OAuth consent traffic. Create-event and send-email remain hard-blocked in this product; draft/label/read paths may call Google APIs when live OAuth is configured.
- **Optional Sentry:** only if you opt in during onboarding **and** `SENTRY_DSN` is configured — crash telemetry only.

We do not operate a ProductName cloud backend that hosts your inbox in this phase.

## What we never do

- Submit Canvas assignments or post discussion entries for you
- Send email or write calendar events that others can see
- Scrape RateMyProfessors
- Sell your student data

## Retention and deletion

- Local data persists until you delete the user-root folder / uninstall and remove app data.
- To wipe: delete `{user_root}`, `browser/.auth/`, and any Google `token.json` under that root.
- Waitlist email (if you joined without a supported school) is stored only as `calibration/waitlist_email.txt` on device in this beta build — there is no hosted waitlist service yet.

## School policies

You remain responsible for FERPA, academic integrity, and your school’s acceptable-use policy. ProductName does not replace university counsel.

## Contact

For this private beta, contact the maintainer who invited you. A public support channel will be named when ProductName ships under a final brand.
