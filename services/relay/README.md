# Study relay (funded AI access for the beta)

A small authenticated, capped request relay (revised spec §7, funded-access
comparison). Vendor secrets live only here; the desktop app never holds them.

- **Auth:** invite code → opaque session token (hashes stored; revocable).
- **Budget:** every dispatch reserves a conservative maximum cost (input and
  output bounds × pinned pricing) inside one SQLite `BEGIN IMMEDIATE`
  transaction; `settled + outstanding + new_max ≤ allowance` per tester and
  globally; one in-flight request per tester, three globally; six dispatches
  per session budget id. Missing usage keeps the full reservation.
- **Idempotency:** a repeated `request_id` never re-dispatches; it returns the
  recorded status (`completed` with the cached-in-memory result if still held,
  else `result_unavailable`, `in_flight`, or `unknown`).
- **Content:** request/response bodies are never written to the database or
  logs. Persisted rows hold ids, status, model, pricing version and token
  counts only. `relay/log.py` refuses free-text fields.
- **Providers:** Claude Messages via raw HTTPS (no SDK retries), extended
  thinking off, `max_tokens` bound. Gemini adapter exists but is **ineligible**
  for bounded dispatch until its total-output enforcement is verified
  (`RELAY_GEMINI_BOUNDED=1` acknowledges that verification).
- **Not done here:** hosting, TLS termination, provider accounts, secrets
  management, real spend. Live checks are pending owner access.

Run locally: `python -m relay.app` (env: `RELAY_DB`, `RELAY_ADMIN_TOKEN`,
`ANTHROPIC_API_KEY`). Tests: `python -m pytest services/relay/tests -q`.
