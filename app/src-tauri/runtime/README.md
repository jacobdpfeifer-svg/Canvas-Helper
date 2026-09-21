# Bundled runtime (staged by `scripts/stage-runtime.sh`)

Not committed. At build time this directory holds:

- `python/` — python-build-standalone (CPython 3.12, install_only) with the
  project's runtime dependencies installed into `python/lib/python3.12/site-packages`
- `node/` — a Node LTS distribution (`bin/node`) used to run `browser/scripts/*.mjs`
- `browser-node_modules/` is NOT staged here; `core/browser/node_modules` is
  copied by the stage script next to the scripts so `import "playwright"` resolves

Tauri copies `runtime/` into `Contents/Resources/runtime/` (see `tauri.conf.json`
`bundle.resources`). `runtime.rs` resolves `runtime/python/bin/python3` and
`runtime/node/bin/node` from there; when absent it falls back to the developer
checkout and labels the run `dev`.
