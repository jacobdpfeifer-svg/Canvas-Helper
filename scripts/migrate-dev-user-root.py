#!/usr/bin/env python3
"""One-time migration: repo-root inbox/ + .jacob/ → {user_root}/.

Beta users start fresh. Dev machines with real corpus:

  DEV_USER_ROOT=~/Library/Application\\ Support/ProductName/dev \\
    python scripts/migrate-dev-user-root.py

Or:

  python scripts/migrate-dev-user-root.py --user-root /path/to/user-root
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "src"))

from canvas_mcp.core.user_root import ensure_user_root, resolve_user_root  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--user-root",
        default=os.environ.get("DEV_USER_ROOT", ""),
        help="Target user root (or set DEV_USER_ROOT)",
    )
    parser.add_argument("--user-id", default="dev", help="user_id when DEV_USER_ROOT unset")
    parser.add_argument("--force", action="store_true", help="Overwrite existing targets")
    args = parser.parse_args()

    if args.user_root:
        os.environ["DEV_USER_ROOT"] = args.user_root
        root = Path(args.user_root).expanduser().resolve()
    else:
        root = resolve_user_root(args.user_id, create=False)

    ensure_user_root(root)

    pairs = [
        (REPO / "inbox", root / "inbox"),
        (REPO / ".jacob", root / "calibration"),
        (REPO / "dev" / "JACOB.md", root / "USER.md"),
        (REPO / "JACOB.md", root / "USER.md"),  # legacy path if present
    ]

    for src, dest in pairs:
        if not src.exists():
            print(f"skip (missing): {src}")
            continue
        if dest.exists() and not args.force:
            print(f"skip (exists, use --force): {dest}")
            continue
        if src.is_dir():
            if dest.exists() and args.force:
                shutil.rmtree(dest)
            shutil.copytree(src, dest, dirs_exist_ok=args.force)
        else:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
        print(f"copied {src} → {dest}")

    # Seed default permissions.yaml if missing
    from canvas_mcp.core.permissions import load_permissions

    load_permissions(root)
    print(f"user_root ready: {root}")
    print("Set DEV_USER_ROOT to this path for browser sync + agent sessions.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
