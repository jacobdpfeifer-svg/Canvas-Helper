"""School / tenant registry loader.

Ships with the app as ``schools/{slug}.yaml``. User picks a school at
onboarding; runtime code resolves Canvas base URL, SSO IdP, timezone, and
optional course-file map from here — never from hard-coded CU constants.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

_REPO_ROOT = Path(__file__).resolve().parents[3]
_REPO_SCHOOLS_DIR = _REPO_ROOT / "schools"
# Wheel installs copy schools → canvas_mcp/schools via hatch force-include.
_PKG_SCHOOLS_DIR = Path(__file__).resolve().parents[1] / "schools"

PRODUCT_NAME = "ProductName"


@dataclass(frozen=True)
class EngagementPlatform:
    host: str
    path: str = ""


@dataclass(frozen=True)
class CourseFileEntry:
    code: str
    patterns: tuple[str, ...]


@dataclass(frozen=True)
class SchoolConfig:
    slug: str
    display_name: str
    canvas_base_url: str
    sso_idp: str
    timezone: str
    term_dates: dict[str, str] = field(default_factory=dict)
    lti_catalog: tuple[str, ...] = ()
    engagement_platform: EngagementPlatform | None = None
    course_file_map: tuple[CourseFileEntry, ...] = ()
    legal_notice: str = ""

    @property
    def api_base(self) -> str:
        return f"{self.canvas_base_url.rstrip('/')}/api/v1"


def _schools_dir() -> Path:
    override = __import__("os").environ.get("SCHOOLS_DIR")
    if override:
        return Path(override)
    if _PKG_SCHOOLS_DIR.is_dir() and any(_PKG_SCHOOLS_DIR.glob("*.yaml")):
        return _PKG_SCHOOLS_DIR
    return _REPO_SCHOOLS_DIR


def _parse_school(raw: dict[str, Any], slug: str) -> SchoolConfig:
    engagement = None
    eng_raw = raw.get("engagement_platform")
    if isinstance(eng_raw, dict) and eng_raw.get("host"):
        engagement = EngagementPlatform(
            host=str(eng_raw["host"]).rstrip("/"),
            path=str(eng_raw.get("path") or ""),
        )

    course_map: list[CourseFileEntry] = []
    for entry in raw.get("course_file_map") or []:
        if not isinstance(entry, dict) or not entry.get("code"):
            continue
        patterns = tuple(str(p) for p in (entry.get("patterns") or []))
        course_map.append(CourseFileEntry(code=str(entry["code"]), patterns=patterns))

    return SchoolConfig(
        slug=str(raw.get("slug") or slug),
        display_name=str(raw.get("display_name") or slug),
        canvas_base_url=str(raw["canvas_base_url"]).rstrip("/"),
        sso_idp=str(raw.get("sso_idp") or ""),
        timezone=str(raw.get("timezone") or "UTC"),
        term_dates={str(k): str(v) for k, v in (raw.get("term_dates") or {}).items()},
        lti_catalog=tuple(str(x) for x in (raw.get("lti_catalog") or [])),
        engagement_platform=engagement,
        course_file_map=tuple(course_map),
        legal_notice=str(raw.get("legal_notice") or "").strip(),
    )


@lru_cache(maxsize=32)
def load_school(slug: str) -> SchoolConfig:
    """Load ``schools/{slug}.yaml``. Raises FileNotFoundError if missing."""
    path = _schools_dir() / f"{slug}.yaml"
    if not path.is_file():
        raise FileNotFoundError(f"Unknown school slug: {slug} ({path})")
    with path.open(encoding="utf-8") as fh:
        raw = yaml.safe_load(fh) or {}
    if not isinstance(raw, dict):
        raise ValueError(f"School config must be a mapping: {path}")
    if slug.startswith("_"):
        raise ValueError(f"Template slug not loadable as a school: {slug}")
    return _parse_school(raw, slug)


def list_schools() -> list[str]:
    """Return available school slugs (excludes ``_template``)."""
    directory = _schools_dir()
    if not directory.is_dir():
        return []
    return sorted(
        p.stem
        for p in directory.glob("*.yaml")
        if not p.stem.startswith("_")
    )


def clear_school_cache() -> None:
    """Drop cached school configs (tests)."""
    load_school.cache_clear()
