"""Memory layer: mem0-style add-only extraction over sqlite + FTS5.

Uses a lightweight local store that mirrors mem0's add-only extraction API.
When the ``mem0`` package is installed it is preferred; otherwise we fall back
to a simple MEMORY.md append (with provenance metadata in an HTML comment).
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_PROVENANCE_RE = re.compile(r"\s*<!--\s*provenance:(.*?)\s*-->\s*$", re.DOTALL)


def add_memory(
    user_root: Path,
    text: str,
    *,
    user_id: str = "default",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Extract and store a long-term memory fact."""
    try:
        from mem0 import Memory

        mem = Memory()
        result = mem.add(text, user_id=user_id, metadata=metadata or {})
        return {"backend": "mem0", "result": result}
    except Exception:
        # Fallback: append to MEMORY.md (add-only), preserve provenance.
        path = Path(user_root) / "MEMORY.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        line = f"- {text.strip()}"
        if metadata:
            encoded = json.dumps(metadata, separators=(",", ":"), sort_keys=True)
            line = f"{line} <!-- provenance:{encoded} -->"
        with path.open("a", encoding="utf-8") as fh:
            fh.write(f"\n{line}\n")
        return {"backend": "memory_md", "path": str(path), "metadata": metadata or {}}


def search_memory(
    user_root: Path,
    query: str,
    *,
    user_id: str = "default",
    limit: int = 5,
) -> list[str]:
    try:
        from mem0 import Memory

        mem = Memory()
        hits = mem.search(query, user_id=user_id, limit=limit)
        return [str(h) for h in hits]
    except Exception:
        path = Path(user_root) / "MEMORY.md"
        if not path.is_file():
            return []
        lines: list[str] = []
        for ln in path.read_text(encoding="utf-8").splitlines():
            stripped = ln.strip()
            if not stripped.startswith("-"):
                continue
            body = stripped.lstrip("- ").strip()
            body = _PROVENANCE_RE.sub("", body).strip()
            if body:
                lines.append(body)
        q = query.lower()
        scored = [ln for ln in lines if any(tok in ln.lower() for tok in q.split())]
        return scored[:limit] or lines[:limit]
