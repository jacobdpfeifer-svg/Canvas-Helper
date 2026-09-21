# Contracts

## C-01 Profile / root resolution (all three runtimes)
- `DEV_USER_ROOT` (absolute) overrides everything.
- Else `{app_support}/ProductName/{PRODUCT_USER_ID}`; `PRODUCT_USER_ID` defaults to `dev` in Python/JS today. **Target:** Rust owns identity — it reads `{app_support}/ProductName/current_profile` (a single line, the profile id; validated `[A-Za-z0-9._-]{1,64}`, not `.`/`..`) and passes `PRODUCT_USER_ID` (and `DEV_USER_ROOT` if set) to every child process. Python/JS never invent an id.
- `user_root/` layout: `inbox/`, `calibration/`, `study/` (new), `auth/`, `ledger.jsonl`.

## C-02 Study command surface (Python CLI, JSON on stdout, one object per invocation)
`python -m canvas_mcp.core.study --json <cmd> [args]`. Exit 0 with `{"ok":true,...}` or exit 1 with `{"ok":false,"error":{"code":..,"message":..}}`. Error codes: `validation`, `not_found`, `conflict`, `persistence_failed`, `persistence_unknown`, `clock_uncertain`, `unsupported`.

Commands (v1): `status`, `packets`, `import --path`, `offer [--course] [--minutes 5|10] [--mode learn|review|practice] [--cram]`, `start --item --mode`, `draft --attempt --text`, `submit --attempt --text` (+ optional structured fields as JSON `--fields`), `reveal --attempt`, `hint --attempt`, `skip --attempt`, `report-help --attempt`, `plan --item --at`, `disagree --attempt`, `history --item`.

## C-03 Event schema (version 1)
Line: `{"seq":int,"event_id":str,"type":str,"at":ISO-UTC,"zone":IANA,"payload":{...},"schema":1}`.
Types: `packet_imported`, `attempt_started`, `draft_saved`, `attempt_submitted`, `assessment`, `exposure`, `correction`, `plan_review`, `clock_anomaly`. Assessment payload: `{attempt_id, outcome, grader, scope, support_refs, evidence}`. Evidence labels per revised spec §1.1.

## C-04 Projection (derived, never hand-edited)
Per item: `{due, anchor, gap_days, hits, stability, cooldown, validity, last_event_seq}`; per attempt: `{status: open|submitted|assessed|interrupted, started_at, mode, draft, response, exposures:[...], assistance}`; per objective: latest substantive encounter. Replay is deterministic and offline.

## C-05 Selection result
`Offer{item_id, mode, why, timeline}` | `NoReviewNeeded{next_at}` | `NoEligibleItem{reason, action: import|create|read|stop}` | `MissingSource` | `NeedsExamDate` | `NoPreExamSlot`.

## C-06 Relay request/response (Phase 5) — see revised spec §7.1; to be pinned when built.

## C-07 Study commands added in Phases 3–6
`canvas-sources`, `canvas-import {course_id, source_ids?}`, `create-item {packet_id, spec}`, `ai-status`, `ai-connect {url, invite_code}`, `ai-disconnect`, `ai-feedback {attempt_id, purpose?, regenerate?}`, `connectors-status`, `outlook-begin|poll|read|disconnect`, `gcal-connect|read|disconnect`, `gcal-preview-event`, `gcal-confirm-event {…, confirmation_token}`, `context {terms, days}`, `history {item_id, limit?, offset?}` (newest first, paginated), `templates`, `import-template {packet_id}`.
Native rejects request/params keys `now`, `root`, `user_root`, `path`, `zone`, unknown top-level fields, requests > 256 KB, replies > 4 MB.

## C-08 Events added
`ai_proposal {attempt_id, request_id, status, proposal, model_id, error, usage}` (attaches to the attempt; no state change). `attempt_started` now carries `packet_version`; `assessment` carries `cutoff_at/exam_future/exam_within_24h` snapshots and `source_valid`.

## C-09 Relay wire contract (services/relay)
`POST /v1/invite/redeem {code}` → `{session_token, tester_id, pricing_version}`. `POST /v1/study` (Bearer) body limited to `request_id, session_budget_id, purpose, source_passages[≤6×6000], stem≤4000, rubric≤4000, submitted_answer≤8000, schema_version=1, pricing_version`; reply `{request_id, status: complete|abstained|truncated|malformed|failed|billing_unknown|result_unavailable, model_id, endpoint, usage{input,output,reasoning}|null, finish_reason, assessment_proposal|null, support_rows, error}`. `GET /v1/usage`, `GET /v1/status/{id}`; admin: `POST /admin/invites`, `POST /admin/revoke`, `GET /admin/budget`.

## C-10 Connector records
`{user_root}/auth/connectors.json` (states), `{user_root}/auth/{google,microsoft}/token.json` (0600), `{user_root}/auth/confirm-gcal.json` (guard state), `{user_root}/inbox/connectors/{gcal,outlook}.json` (minimal read records), `{user_root}/inbox/study-sources/{course}.json` + `status.json` (Canvas material).
