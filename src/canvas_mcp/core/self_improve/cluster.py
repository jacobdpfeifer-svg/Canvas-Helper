"""Detect repeated intents (exact tag + optional HDBSCAN on embeddings)."""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .logger import recent_requests


@dataclass
class RepeatCluster:
    intent_tag: str
    size: int
    request_ids: list[int]
    sample_excerpts: list[str]


def detect_repeat_clusters(
    user_root: Path,
    *,
    min_size: int = 2,
    window: int = 200,
    use_hdbscan: bool = False,
) -> list[RepeatCluster]:
    """Emit candidate skill clusters from recent requests.

    Exact ``intent_tag`` repeats are the primary signal. When ``use_hdbscan`` is
    True and ``hdbscan`` is installed with embeddings present, embedding clusters
    are merged in. Missing hdbscan is non-fatal.
    """
    rows = recent_requests(user_root, limit=window)
    by_tag: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_tag[str(row["intent_tag"])].append(row)

    clusters: list[RepeatCluster] = []
    for tag, group in by_tag.items():
        if len(group) < min_size:
            continue
        clusters.append(
            RepeatCluster(
                intent_tag=tag,
                size=len(group),
                request_ids=[int(r["id"]) for r in group],
                sample_excerpts=[
                    str(r.get("transcript_excerpt") or "")[:200] for r in group[:5]
                ],
            )
        )

    if use_hdbscan:
        clusters.extend(_hdbscan_clusters(rows, min_size=min_size))

    clusters.sort(key=lambda c: (-c.size, c.intent_tag))
    return clusters


def _hdbscan_clusters(rows: list[dict[str, Any]], *, min_size: int) -> list[RepeatCluster]:
    try:
        import json

        import hdbscan  # type: ignore
        import numpy as np
    except ImportError:
        return []

    vectors = []
    kept = []
    for row in rows:
        emb = row.get("embedding")
        if not emb:
            continue
        try:
            vec = json.loads(emb) if isinstance(emb, str) else emb
        except json.JSONDecodeError:
            continue
        if not vec:
            continue
        vectors.append(vec)
        kept.append(row)
    if len(vectors) < min_size:
        return []

    labels = hdbscan.HDBSCAN(min_cluster_size=min_size).fit_predict(np.array(vectors))
    by_label: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for label, row in zip(labels, kept, strict=False):
        if int(label) < 0:
            continue
        by_label[int(label)].append(row)

    out: list[RepeatCluster] = []
    for label, group in by_label.items():
        tag_counts = Counter(str(r["intent_tag"]) for r in group)
        tag = tag_counts.most_common(1)[0][0]
        out.append(
            RepeatCluster(
                intent_tag=f"embed:{tag}:{label}",
                size=len(group),
                request_ids=[int(r["id"]) for r in group],
                sample_excerpts=[
                    str(r.get("transcript_excerpt") or "")[:200] for r in group[:5]
                ],
            )
        )
    return out
