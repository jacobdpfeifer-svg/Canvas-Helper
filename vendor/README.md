# Vendor / upstream material

This ProductName repo **vendors** (forks) [vishalsachdev/canvas-mcp](https://github.com/vishalsachdev/canvas-mcp) for the optional PAT MCP server. It is **not** a ProductName-owned rewrite of that project’s history.

## What is upstream canvas-mcp

| Path | Role |
|------|------|
| [`src/canvas_mcp/`](../src/canvas_mcp/) | Python MCP package (student-trimmed fork of upstream) |
| [`CHANGELOG.md`](../CHANGELOG.md) | **Upstream** release notes (FERPA / canvas-mcp issue links). Do not rewrite as ProductName’s product changelog. |
| [`LICENSE`](../LICENSE) | MIT — upstream copyright retained |

ProductName-specific behavior (SSO → inbox, skills, Tauri dock, school plugins, hard-blocked send/submit) lives mainly in `app/`, `browser/`, `skills/`, `plugins/`, `mcp-servers/`, and `docs/` — not in inventing a second CHANGELOG for canvas-mcp issue numbers.

When bumping the vendored MCP, prefer merging/cherry-picking from upstream and keeping this tree’s student-only constraints (canvas-focus pivot).

## Archived non-product trees

| Path | Role |
|------|------|
| `vendor/articles/` | Research / essay assets — not the shipping product surface |
| `vendor/examples/` | Upstream-style examples (may include educator-oriented text) — not the student truth path |
| `vendor/internal/` | Historical upstream maintainer notes / issue triage — not ProductName docs |

Prefer [`docs/`](../docs/) for ProductName architecture and handoff.
