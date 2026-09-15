"""Cached professional context for teachable claims.

Skills own live web search; this module validates shape, persists rows on
``LearnItem``, and tracks one-shot display via ``context_shown``.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .learn_loop import LearnItem, _write_items, load_items

REFUSAL_APPLICATION = "no strong professional application found for this claim"
MIN_SOURCED_APPLICATIONS = 2

CONTEXT_SKILL_RULES = """\
### Professional context (live search — supplement only)

Opt-in / on-request (or first exposure when the student asked why it matters).
Never inject into every due-review card. Never fold into the claim text or
what is tested — motivational framing only. If search is unavailable or slow,
skip context and still present/review the claim.

Model on `student-instructor-profile` external research:

1. Live web search for public professional / industry applications of the claim.
2. Prefer industry orgs, professional associations, faculty/org pages, and
   published case studies over thin marketing blog posts.
3. **Never** fetch or cite RateMyProfessors (ToS ban — canvas-focus-pivot).
4. Floor before showing: **≥2 independent sources** naming **≥2 distinct
   fields or roles**. Each application needs `application`, `field`,
   `source_title`, and `source_url` (title + link the student can verify).
5. Summarize; at most one short quote (<15 words) with attribution if any.
6. If the bar is not met → refuse plainly and cache the refusal (do not pad):
   `no strong professional application found for this claim`
7. Persist once via:

```bash
python -m canvas_mcp.core.claim_context set \\
  --id "<item_id>" \\
  --rows '[{"application":"…","field":"…","source_title":"…","source_url":"https://…"}, …]'
# or refusal:
python -m canvas_mcp.core.claim_context set --id "<item_id>" --refuse
```

After first student-facing show:

```bash
python -m canvas_mcp.core.claim_context mark-shown --id "<item_id>"
```

Check cache first (`needs_context` / empty `professional_context`) so a claim
is researched once, not on every review.
"""


def context_skill_rules() -> str:
    return CONTEXT_SKILL_RULES.strip() + "\n"


def is_refusal_rows(rows: list[dict[str, Any]] | None) -> bool:
    if not rows or len(rows) != 1:
        return False
    row = rows[0]
    return str(row.get("application") or "").strip() == REFUSAL_APPLICATION


def needs_context(item: LearnItem) -> bool:
    """True when no cached research (sourced or refusal) exists yet."""
    return not bool(item.professional_context)


def _normalize_row(raw: dict[str, Any]) -> dict[str, str]:
    return {
        "application": str(raw.get("application") or "").strip(),
        "field": str(raw.get("field") or "").strip(),
        "source_title": str(raw.get("source_title") or "").strip(),
        "source_url": str(raw.get("source_url") or "").strip(),
    }


def validate_professional_context(
    rows: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Accept ≥2 sourced rows across ≥2 fields, or a single refusal sentinel."""
    if not rows:
        raise ValueError("professional_context requires rows or an explicit refusal")
    if not all(isinstance(row, dict) for row in rows):
        raise ValueError("each row must be a JSON object, not a bare string/number")
    normalized = [_normalize_row(row) for row in rows]
    if is_refusal_rows(normalized):
        return [
            {
                "application": REFUSAL_APPLICATION,
                "field": "",
                "source_title": "",
                "source_url": "",
            }
        ]
    if len(normalized) < MIN_SOURCED_APPLICATIONS:
        raise ValueError(
            f"need at least {MIN_SOURCED_APPLICATIONS} sourced applications "
            f"or a single refusal"
        )
    fields: set[str] = set()
    for row in normalized:
        if not row["application"] or not row["field"]:
            raise ValueError("each application needs non-empty application and field")
        if not row["source_title"] or not row["source_url"]:
            raise ValueError("each application needs source_title and source_url")
        if not row["source_url"].startswith(("http://", "https://")):
            raise ValueError(f"source_url must be http(s): {row['source_url']!r}")
        fields.add(row["field"].lower())
    if len(fields) < MIN_SOURCED_APPLICATIONS:
        raise ValueError(
            f"need at least {MIN_SOURCED_APPLICATIONS} distinct fields/roles"
        )
    return normalized


def refusal_rows() -> list[dict[str, str]]:
    return [
        {
            "application": REFUSAL_APPLICATION,
            "field": "",
            "source_title": "",
            "source_url": "",
        }
    ]


def set_professional_context(
    user_root: Path,
    item_id: str,
    rows: list[dict[str, Any]],
) -> LearnItem:
    cleaned = validate_professional_context(rows)
    items = load_items(user_root)
    for item in items:
        if item.id != item_id:
            continue
        item.professional_context = cleaned
        # Fresh research; allow one student-facing show of the new cache.
        item.context_shown = False
        _write_items(user_root, items)
        return item
    raise ValueError(f"unknown item id: {item_id}")


def mark_context_shown(user_root: Path, item_id: str) -> LearnItem:
    items = load_items(user_root)
    for item in items:
        if item.id != item_id:
            continue
        item.context_shown = True
        _write_items(user_root, items)
        return item
    raise ValueError(f"unknown item id: {item_id}")


def context_for_display(item: LearnItem) -> list[dict[str, str]] | None:
    """Rows to show once; None when empty, already shown, or refusal-only."""
    if item.context_shown or needs_context(item):
        return None
    if is_refusal_rows(item.professional_context):
        return None
    if item.professional_context is None:
        return None
    return list(item.professional_context)


def main(argv: list[str] | None = None) -> int:
    import argparse
    import os
    import sys

    from .user_root import resolve_user_root

    parser = argparse.ArgumentParser(description="Claim professional-context cache")
    parser.add_argument("--user-root", type=Path, default=None)
    parser.add_argument("--json", action="store_true")
    sub = parser.add_subparsers(dest="cmd", required=True)

    rules = sub.add_parser("rules", help="Print skill instruction block")
    del rules  # noqa: F841 — registered for side effect

    needs = sub.add_parser("needs", help="Whether an item still needs research")
    needs.add_argument("--id", required=True)

    set_p = sub.add_parser("set", help="Cache sourced rows or a refusal")
    set_p.add_argument("--id", required=True)
    set_p.add_argument(
        "--rows",
        dest="rows_json",
        default=None,
        help="JSON list of {application, field, source_title, source_url}",
    )
    set_p.add_argument("--refuse", action="store_true")

    mark = sub.add_parser("mark-shown", help="Mark context as already shown")
    mark.add_argument("--id", required=True)

    args = parser.parse_args(argv)
    root = args.user_root or resolve_user_root(
        os.environ.get("PRODUCT_USER_ID", "dev"), create=True
    )

    if args.cmd == "rules":
        print(context_skill_rules(), end="")
        return 0
    if args.cmd == "needs":
        items = {item.id: item for item in load_items(root)}
        item = items.get(args.id)
        if item is None:
            print(f"unknown item id: {args.id}", file=sys.stderr)
            return 1
        flag = needs_context(item)
        if args.json:
            print(json.dumps({"id": item.id, "needs_context": flag}))
        else:
            print("yes" if flag else "no")
        return 0
    if args.cmd == "set":
        try:
            if args.refuse:
                rows: list[dict[str, Any]] = refusal_rows()
            elif args.rows_json:
                parsed = json.loads(args.rows_json)
                if not isinstance(parsed, list):
                    print("--rows must be a list of application objects", file=sys.stderr)
                    return 1
                rows = parsed
            else:
                print("pass --rows JSON or --refuse", file=sys.stderr)
                return 1
            item = set_professional_context(root, args.id, rows)
        except (ValueError, json.JSONDecodeError) as exc:
            print(str(exc), file=sys.stderr)
            return 1
        if args.json:
            print(json.dumps(item.to_dict()))
        else:
            print(item.id)
        return 0
    if args.cmd == "mark-shown":
        try:
            item = mark_context_shown(root, args.id)
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            return 1
        if args.json:
            print(json.dumps(item.to_dict()))
        else:
            print(item.id)
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
