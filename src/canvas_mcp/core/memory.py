"""Memory layer: mem0-style add-only extraction over sqlite + FTS5.

Uses a lightweight local store that mirrors mem0's add-only extraction API.
When the ``mem0`` package is installed it is preferred; otherwise we fall back
to the sqlite episodic store + a simple MEMORY.md append.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any


def add_memory(
    user_root: Path,
    text: str,
    *,
    user_id: str = "default",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Extract and store a long-term memory fact."""
    try:
        from mem0 import Memory  # type: ignore

        mem = Memory()
        result = mem.add(text, user_id=user_id, metadata=metadata or {})
        return {"backend": "mem0", "result": result}
    except Exception:
        # Fallback: append to MEMORY.md (add-only)
        path = Path(user_root) / "MEMORY.md"
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as fh:
            fh.write(f"\n- {text.strip()}\n")
        return {"backend": "memory_md", "path": str(path)}


def search_memory(
    user_root: Path,
    query: str,
    *,
    user_id: str = "default",
    limit: int = 5,
) -> list[str]:
    try:
        from mem0 import Memory  # type: ignore

        mem = Memory()
        hits = mem.search(query, user_id=user_id, limit=limit)
        return [str(h) for h in hits]
    except Exception:
        path = Path(user_root) / "MEMORY.md"
        if not path.is_file():
            return []
        lines = [
            ln.strip("- ").strip()
            for ln in path.read_text(encoding="utf-8").splitlines()
            if ln.strip().startswith("-")
        ]
        q = query.lower()
        scored = [ln for ln in lines if any(tok in ln.lower() for tok in q.split())]
        return scored[:limit] or lines[:limit]
