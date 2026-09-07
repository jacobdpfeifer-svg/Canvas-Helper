# Architecture audit — 2026-09-06 (macro pass)

## System map as-built

```text
Student
  ↓
Tauri React dock ── app/src/ipc.ts (sole frontend IPC) ── Tauri commands
                        │                                    ├─ dock.rs (geometry)
                        │                                    ├─ inbox.rs (week.md Top-3)
                        │                                    └─ daemon.rs (cadence + python -m)
                        ▼
              canvas_mcp.core (Python truth path)
                   ├─ skill_router (+ CLI)
                   ├─ learning_profile (+ CLI)
                   ├─ tenants / user_root / permissions / ledger
                   └─ diagram_gen / topics (concept-visual)
              ↑                              ↑
   browser/ SSO→API→inbox          mcp-servers actuators
              ↑                         (common/actuator.py)
   Chrome sensors → native-messaging → sensors/*.jsonl
```

### Major subsystems (one sentence each)

| Subsystem | Owns | Why separate |
|-----------|------|--------------|
| `schools/` + `tenants.py` | School registry (Canvas URL, SSO, timezone) | Config that must not live inside a single user's root |
| `user_root.py` | Per-student filesystem layout | Isolation boundary for inbox/calibration/ledger/auth |
| `permissions.py` | Posture + k-counters + STOP | Mutable policy state; not skill text, not ledger history |
| `ledger.py` | Append-only automation log + undo_ptr | Audit/rewind; must not be conflated with permissions |
| `browser/` | SSO cookie jar + Canvas REST sync into inbox | Reach without PAT; not a second product surface |
| `src/canvas_mcp/` | Optional PAT MCP + shared core libraries | Same REST/tools the sync path uses when a token exists |
| `skills/` | Agent instruction bundles | Prompt/process ownership; router loads them, does not invent them |
| `skill_router.py` | Rank/select skills + daemon CLI | One routing implementation for palette and agents |
| `learning_profile.py` | Teaching priors + onboarding CLI | How to teach, not what is due |
| `app/src-tauri` | Tray, dock, cadence, process spawn | Desktop ambient shell; does not reimplement Canvas logic |
| `app/src` + `ipc.ts` | React dock UI | Presentation only; all native calls through one adapter |
| `native-messaging` + extension | Canvas-tab sensors | Sensors only — not a third Canvas write path |
| `mcp-servers/` | GCal/Gmail/Apple-cal actuators | Side-effectful external writes with shared gate/ledger |
| `plugins/` | School Bucket-A connectors | Static registry; never auto-fetched |

Layers that do **not** map onto the CLAUDE.md truth path today: `app/billing/`, `app/mobile/` (parked with STATUS.md), `articles/`, `internal/` research notes, educator examples (removed this pass).

---

## Structural findings

### 1. `skill_route.py` and `skill_router.py` were one concern split across two modules

**Finding:** Not competing algorithms — a library + a thin CLI — but two import paths for the same daemon entry. Leaving both invited drift (docs already disagreed).

**Applied:** Folded CLI `main()` into `skill_router.py`; deleted `skill_route.py`; daemon now runs `python -m canvas_mcp.core.skill_router`.

**Before:** routing owned by `skill_router`, process boundary owned by `skill_route`.  
**After:** `skill_router` owns both.  
**Tests:** before `612 passed, 19 skipped` → after `615 passed, 19 skipped` (added CLI coverage).

### 2. `learning_profile_cli.py` duplicated the same CLI-adapter pattern

**Finding:** Backend + React onboarding already formed one feature (Tauri → CLI → YAML/USER.md). The separate `*_cli.py` file was process-boundary theater next to an equally thin skill-route CLI.

**Applied:** Folded CLI into `learning_profile.py`; deleted `learning_profile_cli.py`; updated daemon, skills, design docs, tests.

**Before:** persistence in `learning_profile`, CLI in `learning_profile_cli`.  
**After:** one module. Frontend games remain UI-only collectors of the same typed fields.

### 3. Actuators reinvented user_root + permissions gate

**Finding:** gcal / gmail / apple-cal each copied `sys.path` inserts, `PRODUCT_USER_ID` resolution, and `allow_write` checks. Google OAuth is shared; the *actuator contract* was not.

**Applied:** Extracted `mcp-servers/common/actuator.py` (`user_root`, `check_write`); all three servers use it; apple-cal gained `describe_mode` for parity. Provider APIs stay in `google_oauth.py` / EventKit — not forced into one mega-interface.

**Before:** three local `_user_root()` + ad-hoc gates.  
**After:** one bootstrap/gate module.  
**Tests:** `tests/core/test_actuator_common.py` (2 new); full suite green.

### 4. Daemon duplicated Python spawn / PYTHONPATH wiring

**Finding:** `run_route_intent` and `run_save_learning_profile` each built the same `Command` scaffolding.

**Applied:** `daemon::python_module()` helper; both call sites share it.

### 5. Skill bodies copy-pasted session boot + triage tables

**Finding:** Week-plan restated Worth/External/Agent/Ask criteria already owned by `student-assignment-triage`; several skills restated the USER.md → inbox → sync boot.

**Applied:** Added `skills/_SESSION.md`; pointed week-plan / task-brief / assignment-triage / inbox-week at it; week-plan triage section now links triage skill instead of duplicating the table. Updated `AGENTS.md` skill index to include previously orphaned skills.

### 6. Educator examples silently rebuilt out-of-scope product surface

**Finding:** `examples/educator_quickstart.md`, `bulk_grading_example.md`, and large educator sections in `real_world_workflows.md` aimed at grading — permanently out of scope.

**Applied:** Deleted the two educator example files; rewrote `real_world_workflows.md` to student-only.

### 7. Multi-tenant foundation vs actual tenant count

**Finding:** `tenants` / `user_root` / `permissions` / `ledger` are four modules for one configured school (`cu-boulder`) and one real user. They are **not** duplicate implementations — they are distinct persistence/security seams (registry vs storage vs policy vs audit). Collapsing them would mix mutable policy with append-only history and school config with student data.

**Recommendation:** **Keep as-is.** Mark multi-tenant as **design-ready, deployment-unproven**. `_template.yaml` is generic (slug, URLs, timezone, terms, optional `course_file_map`, legal notice); CU-only fields live in `cu-boulder.yaml` (`engagement_platform`). No second-school integration test exists.

### 8. App shell ownership

**Finding:** `main` / `daemon` / `dock` / `commands` / `inbox` already split by concern; frontend IPC was already one adapter (`ipc.ts` — prior pass removed `dockWindow.ts`). Native Messaging is intentional sensors-only layering, not a third Canvas actuator. Mock NarrateAfter / STOP alert in React remain UI stubs (escalate if replacing ambient interaction model).

**Applied:** No further Rust module merge (would be rename theater). Documented as-built in `docs/architecture.md`.

### 9. Permissions model growth pressure

**Finding:** Global `permissions.yaml` + ledger + per-tool ConfirmationGuard is right for Phase 1. It will break first when **per-actuator policy diverges from Canvas categories** (e.g. Gmail labels vs email_triage) or when a second user root is live-tested without isolation tests staying green.

**Cheap structural change now:** shared `actuator.check_write` (done) so new actuators cannot skip the gate. Deeper per-actuator posture matrices → Escalate (product model change).

### 10. Skill `schema_version` / `category`

**Finding:** Load-bearing today — router refuses missing/unsupported `schema_version`; write categories feed self-improve hard bans. Not premature versioning theater for ten skills; keep.

### 11. Phase-2 stubs (`billing/`, `mobile/`)

**Finding:** Disproportionate to current product if mistaken for shipping surfaces.

**Applied:** Added `STATUS.md` in each declaring out of truth path. Left code in place (Escalate: monetization / mobile shell are product bets).

---

## Consolidations applied this pass

| Change | Diff shape |
|--------|------------|
| Fold skill CLI | `skill_route.py` deleted; `main` → `skill_router.py`; daemon module string updated |
| Fold learning-profile CLI | `learning_profile_cli.py` deleted; `main` → `learning_profile.py`; callers updated |
| Actuator shared gate | `mcp-servers/common/actuator.py` added; gcal/gmail/apple-cal rewritten to use it |
| Daemon spawn helper | `python_module()` in `daemon.rs` |
| Skill boot/triage | `skills/_SESSION.md`; slimmed week-plan / task-brief / triage / inbox-week |
| Educator residue | deleted educator examples; student-only workflows |
| Docs | `docs/architecture.md` rewritten as-built; design docs CLI paths updated; billing/mobile STATUS |
| Tests | `test_actuator_common.py`; skill_router CLI test; learning_profile imports fixed |

---

## Escalate (undone on purpose)

1. **Replace Tauri ambient dock / skill-permission-ledger model** — Core interaction bet. Rough diff-shape: new shell crate or Electron, migrate `ipc.ts` commands, rewrite permissions schema + ConfirmationGuard consumers together. Do not execute without product decision.

2. **Live Google OAuth / paid Apple notarization / second physical SSO device** — Requires credentials or hardware this environment does not have. See `docs/handoff/oauth-smoke.md`.

3. **Ship or delete `app/billing` / `app/mobile` product surfaces** — Monetization and iOS companion change who the product is for. Rough diff-shape: either wire Stripe into onboarding + daemon metering with enforcement flags, or delete the directories after explicit ack.

4. **Generic actuator protocol beyond `check_write`** (shared undo handler registry, dry-run store trait) — Would reshape provider servers; propose after a fourth actuator exists. Rough diff-shape: `Actuator` protocol in `common/`, migrate gcal/gmail/apple-cal handlers in one PR.

---

## Complexity budget verdict

Slightly over-engineered for one school and one real user — mainly the multi-tenant YAML/registry and three actuator servers that still mostly dry-run — but the overage sits in **real security seams** (permissions vs ledger vs user_root) rather than accidental duplication. This pass removed the clearest process-boundary theater (paired `*_cli` / `skill_route` modules), unified actuator gating, and cut educator residue that was silently rebuilding an out-of-scope product. Further collapsing tenants+permissions+ledger into one module would make the codebase *look* simpler while making isolation and STOP/rewind harder to reason about. Verdict: **proportionate enough to keep shipping the truth path; do not add abstraction layers until a second school or a fourth actuator forces it.**

---

## Verification

| Gate | Result |
|------|--------|
| Before | `.venv/bin/python -m pytest tests/ -q` → **612 passed, 19 skipped** |
| After | `.venv/bin/python -m pytest tests/ -q` → **615 passed, 19 skipped** |
| Security slice | `tests/security/test_student_write_invariants.py` + `test_two_user_isolation.py` included in full green run |
| Folded modules | `importlib` confirms `skill_route` / `learning_profile_cli` specs are gone |
