# Canvas reliability deep audit

**Date:** 2026-09-21  
**Scope:** canonical Canvas snapshot, reconciliation, course map, grade scenarios,
health projection, adapters, Tauri readers, and UI wiring.

## Result

The local implementation is internally consistent and fixture-verified. The audit
found and fixed five reliability defects:

1. Missing submissions were not fetched as a separate Canvas signal. The canonical
   sync now fetches `/users/self/missing_submissions`, stores it in the raw
   generation, and reconciles it into the `missing` state.
2. A partial endpoint failure could make a new projection look like data had been
   deleted. Failed/truncated endpoint slices now carry forward from the previous
   raw generation while health remains partial.
3. Work-surface IPC accepted bucket filters but ignored them. Rust now filters both
   flat items and bucket projections, including course and submission-state filters.
4. Late submissions were treated as completed in the Markdown adapter and could be
   hidden from the due view. Late work remains attention-required.
5. Raw/projection pointers were not path-confined. Node and Rust readers now reject
   pointers that escape the active profile's Canvas directory.

Projection failures now stop adapter generation and preserve the previous
projection pointer. Module-item fallback failures are recorded in sync health.

One intentional transitional path remains: the semester number-line reader still
reads schema-2 `study-sources` JSON, but that JSON is now generated from the
canonical generation and no longer triggers an independent Canvas fetch. A future
cleanup can read a dedicated semester projection directly once the study-source
adapter is retired.

## Verification

| Surface | Command | Result |
|---|---|---|
| Browser/canonical model | `cd browser && npm test` | 124 passed |
| React/Tauri frontend | `cd app && npm test` | 29 passed |
| Frontend build | `cd app && npm run build` | passed |
| Native readers/commands | `cd app/src-tauri && cargo test --locked` | 14 passed |

Coverage includes fixture round-trips, source-order invariance, duplicate source
merging, effective date overrides, missing submissions, drop rules, malformed
weights, stale/partial health, failed-vs-empty endpoints, failed pointer escape,
partial carry-forward, adapter compatibility, and profile isolation.

## Remaining verification boundary

Live credentialed verification is still pending. It must be run with an authorized
synthetic/test Canvas account and confirm:

- tenant-specific response shapes for missing submissions, modules, overrides,
  assignment groups, and posted/hidden grades;
- one complete sync followed by an induced endpoint failure, verifying that the
  student still sees prior work with a visible partial/stale warning;
- real DST and section/student override cases;
- LTI/external-tool launch links remain launch-out only;
- fresh-profile onboarding, sync progress, and recovery from expired SSO.

The current implementation must not be described as live-Canvas validated until
those checks are performed.
