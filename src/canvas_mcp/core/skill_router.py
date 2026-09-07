"""Skill router — load active + provisional SKILL.md bundles.

Anthropic / Hermes / agentskills.io compatible. Every skill MUST declare
``schema_version`` in frontmatter; unsupported versions are refused.

Intent match: embedding cosine over skill docs with keyword-overlap fallback.
Low confidence / ambiguous top-2 is logged for a later small-LLM escalate hedge
(not implemented here).
"""

from __future__ import annotations

import json
import math
import os
import re
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

SUPPORTED_SCHEMA_VERSIONS = frozenset({1})
SKILL_SCHEMA_VERSION = 1

# Cosine thresholds — tune from RequestLog meta once callers exist.
COSINE_MIN = 0.32
COSINE_MARGIN = 0.04

# Categories that self-improve may never shadow-test or auto-promote.
WRITE_SKILL_CATEGORIES = frozenset(
    {
        "canvas_submit",
        "canvas_quiz_submit",
        "email_send",
        "rsvp_paid",
        "lti_submit",
        "proctoring_launch",
        "canvas_group",
        "canvas_exam_proctored",
        "calendar_delete",
    }
)

READ_DRAFT_CATEGORIES = frozenset(
    {
        "canvas_read",
        "canvas_discussion_draft",
        "email_draft",
        "email_triage",
        "photo_intake",
        "audio_capture",
        "calendar",  # creates are reversible; deletes are write
        "rsvp_free",
        "skill_promotion",
    }
)

EmbedFn = Callable[[str], list[float] | None]


@dataclass
class SkillMeta:
    skill_id: str
    name: str
    description: str
    schema_version: int
    category: str
    requires_cloud: bool
    path: Path
    body: str
    frontmatter: dict[str, Any] = field(default_factory=dict)
    provisional: bool = False

    @property
    def is_write_skill(self) -> bool:
        return self.category in WRITE_SKILL_CATEGORIES


@dataclass
class RouteResult:
    skill: SkillMeta | None
    scores: list[tuple[str, float]]
    ambiguous: bool
    method: str  # embedding | keyword | none
    query_embedding: list[float] | None = None


_FM_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n(.*)$", re.DOTALL)
_TRIGGERS_RE = re.compile(
    r"^##\s+Triggers?\s*\n(.*?)(?=\n##\s|\Z)", re.DOTALL | re.IGNORECASE
)


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    match = _FM_RE.match(text)
    if not match:
        return {}, text
    fm: dict[str, Any] = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        fm[key.strip()] = val.strip().strip("\"'")
    return fm, match.group(2)


def load_skill(path: Path, *, provisional: bool = False) -> SkillMeta:
    text = path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)
    schema_version = int(fm.get("schema_version") or 0)
    if schema_version not in SUPPORTED_SCHEMA_VERSIONS:
        raise ValueError(
            f"Unsupported or missing schema_version in {path} "
            f"(got {schema_version!r}, supported={sorted(SUPPORTED_SCHEMA_VERSIONS)})"
        )
    skill_id = path.parent.name
    return SkillMeta(
        skill_id=skill_id,
        name=str(fm.get("name") or skill_id),
        description=str(fm.get("description") or ""),
        schema_version=schema_version,
        category=str(fm.get("category") or "canvas_read"),
        requires_cloud=str(fm.get("requires_cloud") or "false").lower()
        in ("1", "true", "yes"),
        path=path,
        body=body,
        frontmatter=fm,
        provisional=provisional,
    )


def load_skills(user_root: Path) -> list[SkillMeta]:
    """Load active then provisional skills from the user root."""
    skills: list[SkillMeta] = []
    for rel, provisional in (("skills/active", False), ("skills/provisional", True)):
        root = Path(user_root) / rel
        if not root.is_dir():
            continue
        for skill_md in sorted(root.glob("*/SKILL.md")):
            try:
                skills.append(load_skill(skill_md, provisional=provisional))
            except ValueError:
                continue
    return skills


def load_skills_for_routing(user_root: Path | None = None) -> list[SkillMeta]:
    """User-root skills, falling back to repo-bundled ``skills/``."""
    if user_root is not None:
        skills = load_skills(user_root)
        if skills:
            return skills
    skills = []
    for skill_md in sorted(bundled_skills_dir().glob("*/SKILL.md")):
        try:
            skills.append(load_skill(skill_md))
        except ValueError:
            continue
    return skills


def skill_doc(skill: SkillMeta) -> str:
    """Text used for embedding / keyword haystack."""
    parts = [skill.name, skill.description, skill.skill_id]
    triggers = _TRIGGERS_RE.search(skill.body or "")
    if triggers:
        parts.append(triggers.group(1).strip())
    return " ".join(p for p in parts if p)


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b, strict=True):
        dot += x * y
        na += x * x
        nb += y * y
    if na <= 0.0 or nb <= 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def ollama_embed(
    text: str,
    *,
    model: str | None = None,
    host: str | None = None,
    timeout: float = 15.0,
) -> list[float] | None:
    """Fetch an embedding from local Ollama. Returns None if unreachable."""
    host = (host or os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434")).rstrip(
        "/"
    )
    model = model or os.environ.get("OLLAMA_EMBED_MODEL", "nomic-embed-text")
    payload = json.dumps({"model": model, "prompt": text}).encode("utf-8")
    req = urllib.request.Request(
        f"{host}/api/embeddings",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        return None
    emb = data.get("embedding")
    if not isinstance(emb, list) or not emb:
        return None
    try:
        return [float(x) for x in emb]
    except (TypeError, ValueError):
        return None


def _keyword_scores(skills: list[SkillMeta], trigger: str) -> list[tuple[float, SkillMeta]]:
    needle = trigger.lower()
    tokens = [tok for tok in needle.split() if tok]
    scored: list[tuple[float, SkillMeta]] = []
    for skill in skills:
        hay = skill_doc(skill).lower()
        score = float(sum(1 for tok in tokens if tok in hay))
        if score:
            scored.append((score, skill))
    scored.sort(key=lambda x: (-x[0], x[1].skill_id))
    return scored


def filter_candidates(
    skills: list[SkillMeta], *, allow_cloud: bool = False
) -> list[SkillMeta]:
    if allow_cloud:
        return list(skills)
    return [s for s in skills if not s.requires_cloud]


def route_skill(
    skills: list[SkillMeta],
    trigger: str,
    *,
    embedder: EmbedFn | None = None,
    allow_cloud: bool = False,
    cosine_min: float = COSINE_MIN,
    cosine_margin: float = COSINE_MARGIN,
) -> RouteResult:
    """Rank skills for ``trigger``; prefer embeddings, else keyword overlap."""
    candidates = filter_candidates(skills, allow_cloud=allow_cloud)
    if not candidates or not trigger.strip():
        return RouteResult(None, [], False, "none")

    embed_fn = embedder if embedder is not None else ollama_embed
    query_emb = embed_fn(trigger)
    if query_emb is not None:
        scored: list[tuple[float, SkillMeta]] = []
        for skill in candidates:
            doc_emb = embed_fn(skill_doc(skill))
            if doc_emb is None:
                continue
            scored.append((_cosine(query_emb, doc_emb), skill))
        if scored:
            scored.sort(key=lambda x: (-x[0], x[1].skill_id))
            best_score, best = scored[0]
            second = scored[1][0] if len(scored) > 1 else None
            ambiguous = best_score < cosine_min or (
                second is not None and (best_score - second) < cosine_margin
            )
            score_pairs = [(s.skill_id, float(sc)) for sc, s in scored]
            if ambiguous:
                return RouteResult(
                    None, score_pairs, True, "embedding", query_emb
                )
            return RouteResult(best, score_pairs, False, "embedding", query_emb)

    # Keyword fallback (also used when embeddings unavailable).
    kw = _keyword_scores(candidates, trigger)
    if not kw:
        return RouteResult(None, [], False, "none", query_emb)
    score_pairs = [(s.skill_id, float(sc)) for sc, s in kw]
    # Keyword: treat exact top-1 ties as ambiguous only when scores equal.
    best_score, best = kw[0]
    ambiguous = len(kw) > 1 and kw[1][0] == best_score
    if ambiguous:
        return RouteResult(None, score_pairs, True, "keyword", query_emb)
    return RouteResult(best, score_pairs, False, "keyword", query_emb)


def select_skill(
    skills: list[SkillMeta],
    trigger: str,
    *,
    embedder: EmbedFn | None = None,
    allow_cloud: bool = False,
    cosine_min: float = COSINE_MIN,
    cosine_margin: float = COSINE_MARGIN,
) -> SkillMeta | None:
    """Select best skill for ``trigger`` (embedding cosine + keyword fallback)."""
    return route_skill(
        skills,
        trigger,
        embedder=embedder,
        allow_cloud=allow_cloud,
        cosine_min=cosine_min,
        cosine_margin=cosine_margin,
    ).skill


def route_intent(
    trigger: str,
    *,
    user_root: Path | None = None,
    allow_cloud: bool = False,
    embedder: EmbedFn | None = None,
    log: bool = True,
) -> RouteResult:
    """First production entry: load skills, route, optionally write RequestLog."""
    from .self_improve.logger import RequestLog, log_request
    from .user_root import resolve_user_root

    root = user_root
    if root is None:
        try:
            root = resolve_user_root("dev", create=False)
        except ValueError:
            root = None

    skills = load_skills_for_routing(root)
    started = time.perf_counter()
    result = route_skill(
        skills, trigger, embedder=embedder, allow_cloud=allow_cloud
    )
    latency_ms = (time.perf_counter() - started) * 1000.0

    if log and root is not None:
        log_request(
            root,
            RequestLog(
                timestamp=time.time(),
                intent_tag=(result.skill.skill_id if result.skill else "unmatched"),
                tools_used=["select_skill"],
                artifacts_produced=[],
                success_signal="accept" if result.skill else "veto",
                latency_ms=latency_ms,
                embedding=result.query_embedding,
                transcript_excerpt=trigger[:500],
                meta={
                    "router_method": result.method,
                    "router_scores": result.scores[:10],
                    "router_ambiguous": result.ambiguous,
                    "allow_cloud": allow_cloud,
                },
            ),
        )
    return result


def bundled_skills_dir() -> Path:
    """Repo-shipped skills/ (copied into user root on onboarding)."""
    return Path(__file__).resolve().parents[3] / "skills"


def main(argv: list[str] | None = None) -> int:
    """CLI entry for the Tauri daemon / palette.

    Usage::

        python -m canvas_mcp.core.skill_router "what should I do first"
        DEV_USER_ROOT=/tmp/pn python -m canvas_mcp.core.skill_router --json "plan my week"
    """
    import argparse
    import json
    import sys

    from .user_root import resolve_user_root

    parser = argparse.ArgumentParser(description="Route a trigger to a skill id")
    parser.add_argument("trigger", nargs="+", help="User utterance / intent text")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print JSON (skill_id, method, ambiguous, scores)",
    )
    parser.add_argument(
        "--allow-cloud",
        action="store_true",
        help="Include requires_cloud skills",
    )
    parser.add_argument(
        "--no-log",
        action="store_true",
        help="Skip RequestLog write",
    )
    parser.add_argument(
        "--user-root",
        type=Path,
        default=None,
        help="Override user root (else DEV_USER_ROOT / default)",
    )
    args = parser.parse_args(argv)
    trigger = " ".join(args.trigger).strip()
    root = args.user_root
    if root is None:
        try:
            root = resolve_user_root("dev", create=True)
        except ValueError:
            root = None

    result = route_intent(
        trigger,
        user_root=root,
        allow_cloud=args.allow_cloud,
        log=not args.no_log and root is not None,
    )
    payload = {
        "skill_id": result.skill.skill_id if result.skill else None,
        "method": result.method,
        "ambiguous": result.ambiguous,
        "scores": result.scores[:8],
    }
    if args.json:
        print(json.dumps(payload))
    else:
        print(payload["skill_id"] or "")
    return 0 if result.skill is not None else 1


if __name__ == "__main__":
    import sys

    sys.exit(main())
