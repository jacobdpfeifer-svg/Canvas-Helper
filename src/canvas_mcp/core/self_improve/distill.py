"""Episodic → semantic distillation (manual, ADD-only).

Reads ``episodic.db`` via :func:`recent_requests`, runs one LLM extraction
pass per batch, and writes durable facts through :func:`add_memory`.
Not a daemon / request-path caller — invoke via CLI or Python.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from ..memory import add_memory
from ..watermark import EPISODIC_DISTILL, read_watermark, write_watermark
from .logger import recent_requests

WATERMARK_NAME = EPISODIC_DISTILL

SynthesisFn = Callable[[str, str], Any]

_SYSTEM = """You extract durable, generalizable student-workflow facts from routing
episodes. Output ONLY a JSON array of objects. Each object must have:
  "fact": string — a durable, generalizable fact (NOT a raw transcript copy)
  "episodic_ids": array of ints — source request ids that support the fact

Rules:
- ADD-only extraction: facts that remain true across sessions.
- Prefer patterns (e.g. repeated intent tags, weekly habits) over one-offs.
- If nothing durable is present, return [].
- No markdown fences, no commentary — JSON array only.
"""


@dataclass
class DistillSummary:
    facts_extracted: int
    facts_skipped: int
    rows_processed: int
    watermark: float | None
    facts: list[str] = field(default_factory=list)


def _parse_since(value: datetime | str | float | None) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, datetime):
        dt = value
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()
    raw = str(value).strip()
    try:
        return float(raw)
    except ValueError:
        pass
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).timestamp()


def _row_ts(row: dict[str, Any]) -> float:
    try:
        return float(row.get("timestamp") or 0.0)
    except (TypeError, ValueError):
        return 0.0


def _filter_rows(
    rows: list[dict[str, Any]],
    *,
    since: float | None,
) -> list[dict[str, Any]]:
    if since is None:
        return list(rows)
    # Watermark means "processed through this timestamp" → take strictly newer.
    return [r for r in rows if _row_ts(r) > since]


def _format_batch(rows: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for row in rows:
        lines.append(
            json.dumps(
                {
                    "id": row.get("id"),
                    "intent_tag": row.get("intent_tag"),
                    "success_signal": row.get("success_signal"),
                    "transcript_excerpt": (row.get("transcript_excerpt") or "")[:300],
                },
                ensure_ascii=False,
            )
        )
    return "\n".join(lines)


def _parse_facts(content: str) -> list[dict[str, Any]]:
    text = (content or "").strip()
    if not text:
        return []
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("[")
        end = text.rfind("]")
        if start < 0 or end <= start:
            return []
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return []
    if not isinstance(data, list):
        return []
    out: list[dict[str, Any]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        fact = item.get("fact")
        if not isinstance(fact, str) or not fact.strip():
            continue
        ids_raw = item.get("episodic_ids") or item.get("ids") or []
        ids: list[int] = []
        if isinstance(ids_raw, list):
            for x in ids_raw:
                try:
                    ids.append(int(x))
                except (TypeError, ValueError):
                    continue
        out.append({"fact": fact.strip(), "episodic_ids": ids})
    return out


def distill_episodic_to_semantic(
    user_root: Path,
    since: datetime | str | float | None = None,
    *,
    limit: int = 200,
    chat_fn: SynthesisFn | None = None,
) -> DistillSummary:
    """Distill new episodic rows into ADD-only semantic facts.

    Default ``since`` is the persisted watermark. Explicit ``since`` overrides
    the default without clearing the marker; after a successful run the
    watermark advances to the max processed row timestamp.
    """
    from ..prompt_assembly import chat_synthesis

    root = Path(user_root)
    explicit = since is not None and since != ""
    if explicit:
        cutoff = _parse_since(since)
    else:
        cutoff = read_watermark(root, WATERMARK_NAME)

    rows = recent_requests(root, limit=limit)
    # recent_requests is newest-first; process oldest-first for stable watermark.
    batch = sorted(_filter_rows(rows, since=cutoff), key=_row_ts)
    if not batch:
        return DistillSummary(
            facts_extracted=0,
            facts_skipped=0,
            rows_processed=0,
            watermark=read_watermark(root, WATERMARK_NAME),
            facts=[],
        )

    synthesize = chat_fn or (
        lambda system, user: chat_synthesis(system=system, user=user)
    )
    result = synthesize(
        _SYSTEM,
        "Extract durable facts from these episodic routing rows:\n"
        + _format_batch(batch),
    )
    content = getattr(result, "content", None)
    if content is None and isinstance(result, dict):
        content = result.get("content", "")
    extracted = _parse_facts(str(content or ""))

    written: list[str] = []
    skipped = 0
    for item in extracted:
        fact = item["fact"]
        ids = item["episodic_ids"] or [
            int(r["id"]) for r in batch if r.get("id") is not None
        ]
        add_memory(
            root,
            fact,
            metadata={"source": "episodic", "episodic_ids": ids},
        )
        written.append(fact)
    if not extracted:
        skipped = 1  # empty model output counts as a skipped extraction pass

    max_ts = max(_row_ts(r) for r in batch)
    write_watermark(root, WATERMARK_NAME, max_ts)

    return DistillSummary(
        facts_extracted=len(written),
        facts_skipped=skipped,
        rows_processed=len(batch),
        watermark=max_ts,
        facts=written,
    )


def main(argv: list[str] | None = None) -> int:
    """Manual CLI: distill episodic.db → semantic memory.

    Usage::

        python -m canvas_mcp.core.self_improve.distill --user-root ~/... --json
        python -m canvas_mcp.core.self_improve.distill --since 1710000000
    """
    import argparse

    from ..user_root import resolve_user_root

    parser = argparse.ArgumentParser(
        description="Distill episodic.db rows into ADD-only semantic facts"
    )
    parser.add_argument(
        "--user-root",
        type=Path,
        default=None,
        help="Per-student user root (default: resolve_user_root('dev'))",
    )
    parser.add_argument(
        "--since",
        default=None,
        help="Override watermark (unix timestamp or ISO-8601)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=200,
        help="Max episodic rows to consider (default 200)",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON summary")
    args = parser.parse_args(argv)

    root = args.user_root
    if root is None:
        root = resolve_user_root("dev", create=True)

    summary = distill_episodic_to_semantic(root, since=args.since, limit=args.limit)
    if args.json:
        print(json.dumps(asdict(summary), indent=2))
    else:
        print(
            f"facts_extracted={summary.facts_extracted} "
            f"facts_skipped={summary.facts_skipped} "
            f"rows_processed={summary.rows_processed} "
            f"watermark={summary.watermark}"
        )
        for fact in summary.facts:
            print(f"- {fact}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
