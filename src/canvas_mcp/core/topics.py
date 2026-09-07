"""Post-hoc weak-topic detection from Canvas assignment scores.

v1 heuristic: match assignment **titles** (and descriptions when present)
against a curated keyword → concept-key map. This is **not** rubric-criterion
tagging and will miss opaque titles — same honest-about-limits tone as
``docs/design/learning-profile.md``. Prefer saying a topic is unclear over
inventing a concept key.

Detection is post-hoc from graded scores (SSO→REST), not live in-session
telemetry. Diagrams are offered from *topic content-type* + low score, never
from a VAK/learning-style label.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Longer / more specific keywords first so "chain rule" wins over bare "chain"
# and "secant" is checked before a generic catch-all if we add one later.
CONCEPT_KEYWORDS: list[tuple[str, str]] = [
    ("chain rule", "chain_rule_composition"),
    ("chain-rule", "chain_rule_composition"),
    ("secant", "secant_vs_tangent"),
    ("tangent", "tangent_line"),
    ("derivative", "derivative_slope"),
    ("differentiation", "derivative_slope"),
]

# Flat map for skill docs / callers that want dict lookup of single tokens.
KEYWORD_TO_CONCEPT: dict[str, str] = {
    keyword: concept for keyword, concept in CONCEPT_KEYWORDS
}


@dataclass(frozen=True)
class WeakTopic:
    """One low-scoring assignment matched to a diagram-able concept."""

    course_code: str
    assignment_title: str
    concept_key: str
    score_fraction: float
    scored_at: str | None = None


def match_concept_key(text: str) -> str | None:
    """Return the first concept key whose keyword appears in ``text`` (ci)."""
    blob = (text or "").lower()
    if not blob.strip():
        return None
    for keyword, concept_key in CONCEPT_KEYWORDS:
        if keyword in blob:
            return concept_key
    return None


def find_weak_topics(
    graded_assignments: list[dict[str, Any]],
    *,
    threshold: float = 0.7,
) -> list[WeakTopic]:
    """Filter graded rows below ``threshold`` and map titles to concepts.

    Expected row keys (flexible):
      - ``name`` or ``title`` — assignment name
      - ``score`` — numeric score (skip if None)
      - ``points_possible`` — must be > 0
      - ``course_code`` / ``_course_name`` — optional course label
      - ``description`` — optional, also scanned for keywords
      - ``scored_at`` / ``graded_at`` — optional date string

    Pure function: no I/O. Skips ungraded / zero-points rows. Skips rows
    whose title+description do not match any known keyword.
    """
    if threshold <= 0 or threshold > 1:
        raise ValueError("threshold must be in (0, 1]")

    weak: list[WeakTopic] = []
    for row in graded_assignments:
        score = row.get("score")
        points = row.get("points_possible")
        if score is None or points is None:
            continue
        try:
            score_f = float(score)
            points_f = float(points)
        except (TypeError, ValueError):
            continue
        if points_f <= 0:
            continue

        fraction = score_f / points_f
        if fraction >= threshold:
            continue

        title = str(row.get("name") or row.get("title") or "").strip()
        if not title:
            continue
        description = str(row.get("description") or "")
        concept = match_concept_key(f"{title}\n{description}")
        if concept is None:
            continue

        course = str(
            row.get("course_code")
            or row.get("_course_name")
            or row.get("course_name")
            or ""
        )
        scored_at = row.get("scored_at") or row.get("graded_at")
        weak.append(
            WeakTopic(
                course_code=course,
                assignment_title=title,
                concept_key=concept,
                score_fraction=round(fraction, 4),
                scored_at=str(scored_at) if scored_at else None,
            )
        )

    return weak


def format_weak_topics_section(topics: list[WeakTopic]) -> str:
    """Markdown body for the skill-owned ``## Weak topics`` section."""
    if not topics:
        return "-\n"
    lines: list[str] = []
    for t in topics:
        date_bit = f" ({t.scored_at})" if t.scored_at else ""
        course_bit = f"{t.course_code} — " if t.course_code else ""
        lines.append(
            f"- `{t.concept_key}` — {course_bit}{t.assignment_title} — "
            f"{t.score_fraction:.2f}{date_bit}"
        )
    return "\n".join(lines) + "\n"
