# Decisions

Format: ID — decision (date). Rationale · alternatives · consequences · reversal.

## D-01 — Document authority order (2026-09-18)
Current user instructions > `student-beta-2026-09-17.md` > AGENTS/CLAUDE.md > this record > revised spec (`study-session-5-10min-evidence-spec-revised.md`) > older research. "Implemented" headings prove nothing; tests and inspection do. The research reference fixture is input, not code to transplant.

## D-02 — Build the study cycle (Phase 2) before native packaging (Phase 1) (2026-09-18)
Rationale: the study journey is the product promise and is fully buildable/testable with Python + React on this machine; the native side is blocked until a Rust toolchain exists (install started). Phase 1 identity/storage contracts are still fixed *now* (CONTRACTS C-01) so Phase 2 code is written against them. Reversal: none needed; ordering only.

## D-03 — New `canvas_mcp.core.study` package is the single state-transition authority for study sessions (2026-09-18)
Legacy `learn_loop` claims (dock "due checks", student-self-scored) stay as a separate, read-mostly surface with their existing clock invariant and tests; they are **not** migrated into study evidence and never earn `delayed_independent_retrieval`. No second scheduler writes to `items.yaml`. Alternatives: extend `learn_loop` in place (rejected — its self-score model, UTC/date arithmetic and lack of event IDs conflict with the revised contract); replace learn_loop (rejected — breaks 60+ tests and skills for no beta value). Reversal: a later adapter can import legacy claims as `baseline_response`-only items.

## D-04 — Storage: append-only JSONL event log + rebuildable projection, per profile (2026-09-18)
`{user_root}/study/events.jsonl` (fsync'd append, one JSON object per line, `seq` + `event_id`), `{user_root}/study/projection.json` (cache: `projection_version`, `last_seq`). A partial tail line is rejected on read, not treated as committed. Duplicate `event_id` → same acknowledgment; same ID different bytes → conflict, no overwrite. Alternative: SQLite (better transactions; rejected for beta because the Python core must run from a bundled interpreter without native wheels and the log is small; revisit if concurrent writers appear). Reversal: the reducer is pure over an event list, so swapping the log store is local to `store.py`.

## D-05 — Grading authority (2026-09-18)
Only `deterministic` checkers (exact choice, true/false, numeric tolerance, expression template, structured fields) may advance stability. `student_self` and `model_proposed` are recorded and displayed as proposals. Unknown checker scope → `abstained`. This is the revised-spec contract; changing it needs an explicit decision + evidence.

## D-06 — Study packets are the source/item unit (2026-09-18)
A packet = one JSON file with sources (verbatim text, locators, provenance, hash computed on import) + items (stem, objective, checker spec, key kept in a separate `key` block never sent to the UI before submission/reveal). Six synthetic packets ship under `templates/study-packets/`. Student import = copy + validate + hash. Canvas-derived packets (Phase 3) use the same shape with `provenance: instructor` and Canvas IDs/timestamps.

## D-07 — Dev bridge for UI verification without Tauri (2026-09-18)
`python -m canvas_mcp.core.study serve --port 1421` exposes the same commands over loopback HTTP for the Vite dev server only; `ipc.ts` uses it when `__TAURI_INTERNALS__` is absent and `VITE_STUDY_BRIDGE` is set. Not shipped in the Tauri path; not a second product API.

## D-08 — Installed runtime contract (2026-09-18)
Rust resolves `<resources>/core/{src,browser,templates,schools,skills,plugins}` and `<resources>/runtime/{python,node,browser-node_modules}`; env overrides `PRODUCTNAME_CORE_DIR/PYTHON/NODE`; dev fallback = checkout + repo venv, labeled `dev`; missing bundled interpreter = `broken` (fail closed, never system Python). Profile id from `<app_support>/ProductName/current_profile`, passed as `PRODUCT_USER_ID` to every child; browser cookies live in `{user_root}/auth/browser`. The study core runs as the isolated top-level `study` package (stdlib only) so the primary journey needs no third-party Python; legacy Plan commands need the pip-installed deps staged by `scripts/stage-runtime.sh`.

## D-09 — Native builds run from a non-iCloud mirror (2026-09-18)
Rust `std::fs::copy` returns EPERM on files inside this iCloud Drive checkout, so `tauri-build` fails in place. `scripts/native-mirror.sh` rsyncs to `~/.cache/productname-build` and runs cargo/tauri there. Environment finding, not a code defect.

## D-10 — Audit-A repairs are contract, not patches (2026-09-18)
Permission scopes are an allowlist; support refs must resolve; `model_candidate` keys score as `model_proposed` unless `validated_by: independent_derivation`; attempts pin `packet_version` and grade against the snapshot; feedback exposure is logged on every path that returns a key; draft revisions strictly increase and conflicts are reported; interior log corruption blocks appends instead of truncating; import is staged→event→commit with repair on load. See `tests/core/test_study_audit_regressions.py`.

## D-11 — Study is the primary window; the dock is optional (2026-09-18)
`DockMode::Workspace` (decorated, resizable, not always-on-top) is the default; compact peek/expanded modes remain behind a Settings toggle. Tray and legacy Plan commands are retained.

## D-12 — Keep the JSONL log store for the beta; SQLite trigger (2026-09-18)
Revisit if a second writer process (e.g. background sync writing study events) is introduced or if replay cost exceeds ~50 ms at beta history sizes. Candidate B's SQLite engine is the reference design for that migration.

## D-13 — Funded AI: relay-owned model choice, provisional proposals only (2026-09-18)
Clients cannot name models/endpoints/tools; pricing version is pinned on both sides; unresolved requests replay by id and never re-dispatch; a deliberate regeneration is a new id. Inference allowance = envelope − fixed fees. Proposals are `ai_proposal` events, shown as provisional, never grading authority.

## D-14 — Connectors: honest states and persisted per-action confirmation (2026-09-18)
`connected` only after an authenticated read; Outlook uses the device-code flow with the `common` authority (CU-managed and personal); Google uses the existing installed-app flow. Calendar creation is preview → content-bound single-use token → confirm; the guard state persists per profile. No dry-run is ever presented as a created event.
