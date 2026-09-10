"""Manual self-improve pipeline: cluster → draft → shadow (no promote).

Not a daemon / cron / request-path caller. Promotion stays on
:func:`promote_skill`'s k-success counter across real subsequent usage.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from ..memory import search_memory
from .cluster import detect_repeat_clusters
from .drafter import draft_provisional_skill
from .shadow import shadow_test

# CLI floor above library default (2) so day-one noise does not draft skills.
DEFAULT_CLI_MIN_SIZE = 5
DEFAULT_WINDOW = 200


@dataclass
class PipelineItem:
    intent_tag: str
    cluster_size: int
    skill_path: str | None
    allowed: bool | None
    provisional_better: bool | None
    reason: str
    critic_score: float | None = None
    category: str = "canvas_read"


@dataclass
class PipelineSummary:
    clusters_seen: int
    drafted: int
    shadow_passed: int
    items: list[PipelineItem] = field(default_factory=list)


def run_self_improve(
    user_root: Path,
    *,
    min_size: int = DEFAULT_CLI_MIN_SIZE,
    window: int = DEFAULT_WINDOW,
    category: str = "canvas_read",
    chat_fn: Any | None = None,
) -> PipelineSummary:
    """Detect clusters, draft read-only provisional skills, shadow-test.

    Never calls :func:`promote_skill`. Never drafts write categories
    (``draft_provisional_skill`` / ``shadow_test`` enforce that floor).
    """
    root = Path(user_root)
    clusters = detect_repeat_clusters(root, min_size=min_size, window=window)
    items: list[PipelineItem] = []
    drafted = 0
    shadow_passed = 0

    for cluster in clusters:
        try:
            skill_md = draft_provisional_skill(
                root, cluster, category=category
            )
        except PermissionError as exc:
            items.append(
                PipelineItem(
                    intent_tag=cluster.intent_tag,
                    cluster_size=cluster.size,
                    skill_path=None,
                    allowed=False,
                    provisional_better=None,
                    reason=str(exc),
                    category=category,
                )
            )
            continue

        drafted += 1
        semantic = search_memory(root, cluster.intent_tag, limit=3)
        # Hold out: use cluster samples as critic excerpts.
        result = shadow_test(
            skill_md,
            excerpts=list(cluster.sample_excerpts),
            semantic_context=semantic or None,
            chat_fn=chat_fn,
        )
        if result.allowed and result.provisional_better:
            shadow_passed += 1
        items.append(
            PipelineItem(
                intent_tag=cluster.intent_tag,
                cluster_size=cluster.size,
                skill_path=str(skill_md),
                allowed=result.allowed,
                provisional_better=result.provisional_better,
                reason=result.reason,
                critic_score=result.critic_score,
                category=category,
            )
        )

    return PipelineSummary(
        clusters_seen=len(clusters),
        drafted=drafted,
        shadow_passed=shadow_passed,
        items=items,
    )


def main(argv: list[str] | None = None) -> int:
    """Manual CLI entry for the self-improve pipeline.

    Usage::

        python -m canvas_mcp.core.self_improve.run --user-root ~/... --json
    """
    import argparse

    from ..user_root import resolve_user_root

    parser = argparse.ArgumentParser(
        description=(
            "Cluster → draft → shadow provisional skills (no auto-promote)"
        )
    )
    parser.add_argument(
        "--user-root",
        type=Path,
        default=None,
        help="Per-student user root (default: resolve_user_root('dev'))",
    )
    parser.add_argument(
        "--min-size",
        type=int,
        default=DEFAULT_CLI_MIN_SIZE,
        help=f"Minimum cluster size (default {DEFAULT_CLI_MIN_SIZE})",
    )
    parser.add_argument(
        "--window",
        type=int,
        default=DEFAULT_WINDOW,
        help=f"Episodic lookback window (default {DEFAULT_WINDOW})",
    )
    parser.add_argument(
        "--category",
        default="canvas_read",
        help="Draft category (must be in READ_DRAFT_CATEGORIES)",
    )
    parser.add_argument("--json", action="store_true", help="Print JSON summary")
    args = parser.parse_args(argv)

    root = args.user_root
    if root is None:
        root = resolve_user_root("dev", create=True)

    summary = run_self_improve(
        root,
        min_size=args.min_size,
        window=args.window,
        category=args.category,
    )
    if args.json:
        print(json.dumps(asdict(summary), indent=2))
    else:
        print(
            f"clusters_seen={summary.clusters_seen} "
            f"drafted={summary.drafted} "
            f"shadow_passed={summary.shadow_passed}"
        )
        for item in summary.items:
            print(
                f"- {item.intent_tag} n={item.cluster_size} "
                f"better={item.provisional_better} ({item.reason})"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
